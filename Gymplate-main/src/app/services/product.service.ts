import { Injectable, signal, computed } from '@angular/core';
import { Product, Category } from '../models';
import { MockDataService } from './mock-data.service';
import { CloudStoreService } from './cloud-store.service';
import { DEMO_MEALS, EXTRA_MEALS } from '../data/sample-meals';
import { makePlaceholderImage } from '../shared/utils/image.util';

export interface ProductFilters {
  search: string;
  category: string;
  sortBy: 'name' | 'price_asc' | 'price_desc' | 'calories_asc' | 'calories_desc' | 'protein_desc';
  quickFilter: 'all' | 'high_protein' | 'low_calorie' | 'under_500';
  minCalories?: number;
  maxCalories?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private mockData: MockDataService, private cloud: CloudStoreService) {}

  getProducts(): Product[] {
    return this.mockData.getProducts().filter(p => !p.isDisabled && !p.isArchived);
  }

  getAllProducts(): Product[] {
    return this.mockData.getProducts();
  }

  getProduct(id: string): Product | undefined {
    return this.mockData.getProduct(id);
  }

  /** A seller's meals. Archived meals are left out unless `includeArchived` is true. */
  getProductsBySeller(sellerId: string, includeArchived = false): Product[] {
    const list = this.mockData.getProductsBySellerId(sellerId);
    return includeArchived ? list : list.filter(p => !p.isArchived);
  }

  getAvailableProducts(): Product[] {
    return this.mockData.getProducts().filter(p => p.isAvailable && !p.isDisabled && !p.isArchived && p.stock > 0);
  }

  getCategories(): Category[] {
    return this.mockData.getCategories();
  }

  /**
   * [CATEGORIES #2] For the customer menu filter: only categories that have at least one meal.
   * Same order as the seller's list; a meal with a category outside the list still gets its own chip.
   */
  getCategoriesInUse(): Category[] {
    const used = new Set(this.getProducts().map((p) => p.category));
    const list = this.getCategories().filter((c) => used.has(c.name));
    const known = new Set(list.map((c) => c.name));
    used.forEach((name) => {
      if (name && !known.has(name)) list.push({ id: 'cat-' + name, name, description: '', isActive: true });
    });
    return list;
  }

  // [PRODUCTS-FS #7] Save to Firestore FIRST. The local copy is updated only if Firestore accepted it.
  async addProduct(product: Product, notifyAdmins = true): Promise<boolean> {
    const ok = await this.cloud.saveProduct(product);
    if (ok) {
      this.mockData.upsertProduct(product);
      if (notifyAdmins) {
        this.notifyAdmins(
          'New Meal to Review',
          `${this.kitchenOf(product.sellerId)} added "${product.name}". Please check its nutrition facts.`,
        );
      }
    }
    return ok;
  }

  private kitchenOf(sellerId: string): string {
    return this.mockData.getBusinessBySellerId(sellerId)?.businessName || 'A kitchen';
  }

  /** Writes to the shared 'admins' inbox. Every admin sees it in the bell. */
  private notifyAdmins(title: string, message: string): void {
    this.mockData.addNotification({
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      userId: 'admins',
      type: 'system',
      title,
      message,
      isRead: false,
      link: '/admin/products',
      createdAt: new Date(),
    });
  }

  async updateProduct(product: Product): Promise<boolean> {
    const ok = await this.cloud.saveProduct(product);
    if (ok) this.mockData.upsertProduct(product);
    return ok;
  }

  /** Archive instead of delete: the meal is hidden and paused, but can be restored later. */
  async archiveProduct(id: string): Promise<boolean> {
    const p = this.mockData.getProduct(id);
    if (!p) return false;
    return this.updateProduct({ ...p, isArchived: true, archivedAt: new Date(), isAvailable: false, updatedAt: new Date() });
  }

  /** Bring an archived meal back. It returns paused, so the seller decides when to sell it again. */
  async restoreProduct(id: string): Promise<boolean> {
    const p = this.mockData.getProduct(id);
    if (!p) return false;
    const { archivedAt, ...rest } = p;
    return this.updateProduct({ ...rest, isArchived: false, updatedAt: new Date() });
  }

  async deleteProduct(id: string): Promise<boolean> {
    const ok = await this.cloud.deleteProduct(id);
    if (ok) this.mockData.deleteProduct(id);
    return ok;
  }

  // [SAMPLE-FS #3] Adds the sample meals to THIS seller's kitchen through the normal save
  // (so the Firestore rules still apply). Meals already imported are skipped.
  async importSampleMeals(set: 'demo' | 'extra', sellerId: string, businessId: string):
      Promise<{ added: number; skipped: number; failed: number }> {
    const list = set === 'demo' ? DEMO_MEALS : EXTRA_MEALS;
    const existing = new Set(this.mockData.getProductsBySellerId(sellerId).map(p => p.id));
    let added = 0, skipped = 0, failed = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const id = `smp-${set}-${i + 1}-${sellerId.slice(0, 6)}`;
      if (existing.has(id)) { skipped++; continue; }
      const now = new Date();
      const product: Product = {
        id, sellerId, businessId,
        name: m.name,
        description: m.description,
        category: m.category,
        price: m.price,
        imageUrl: m.imageUrl || makePlaceholderImage(m.name, m.category),
        nutrition: { ...m.nutrition },
        stock: m.stock,
        isAvailable: true,
        isDisabled: false,
        nutritionSourceUrl: 'https://fdc.nal.usda.gov/', // [NUTRITION-REVIEW] sample meals point to USDA FoodData Central
        nutritionStatus: 'pending',
        createdAt: now,
        updatedAt: now
      };
      (await this.addProduct(product, false)) ? added++ : failed++;
    }
    if (added > 0) {
      this.notifyAdmins(
        'New Meals to Review',
        `${this.kitchenOf(sellerId)} added ${added} sample meal(s). Please check their nutrition facts.`,
      );
    }
    return { added, skipped, failed };
  }

  filterProducts(products: Product[], filters: ProductFilters): Product[] {
    let result = [...products];

    // Search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
      );
    }

    // Category
    if (filters.category && filters.category !== 'all') {
      result = result.filter(p => p.category === filters.category);
    }

    // Quick filters
    switch (filters.quickFilter) {
      case 'high_protein':
        result = result.filter(p => p.nutrition.protein >= 25);
        break;
      case 'low_calorie':
        result = result.filter(p => p.nutrition.calories <= 350);
        break;
      case 'under_500':
        result = result.filter(p => p.nutrition.calories < 500);
        break;
    }

    // Custom calorie range
    if (filters.minCalories !== undefined) {
      result = result.filter(p => p.nutrition.calories >= filters.minCalories!);
    }
    if (filters.maxCalories !== undefined) {
      result = result.filter(p => p.nutrition.calories <= filters.maxCalories!);
    }

    // Sort
    switch (filters.sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'calories_asc':
        result.sort((a, b) => a.nutrition.calories - b.nutrition.calories);
        break;
      case 'calories_desc':
        result.sort((a, b) => b.nutrition.calories - a.nutrition.calories);
        break;
      case 'protein_desc':
        result.sort((a, b) => b.nutrition.protein - a.nutrition.protein);
        break;
    }

    return result;
  }
}
