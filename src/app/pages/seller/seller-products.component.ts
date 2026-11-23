import { Component, OnInit, ChangeDetectorRef, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models';
import { SellerSidebarComponent } from '../../shared/components/seller-sidebar.component';
import { IconComponent } from '../../shared/components/icon.component';
import { CloudStoreService } from '../../services/cloud-store.service';

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SellerSidebarComponent, IconComponent],
  template: `
    <div class="seller-layout">
      <app-seller-sidebar></app-seller-sidebar>

      <main class="seller-main-content">
        <div class="seller-container">
          <!-- Page Header -->
          <div class="page-header flex justify-between items-center flex-wrap gap-4 mb-6">
            <div>
              <span class="text-xs font-bold uppercase text-primary">Catalog Management</span>
              <h1>My Fitness Meals & Dishes</h1>
              <p class="text-xs text-secondary">
                Manage recipes, verify macro figures, and adjust live marketplace availability.
              </p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <!-- [SAMPLE-FS #4] Import sample meals (approved sellers only) -->
              <a
                routerLink="/seller/products/add"
                class="btn btn-primary btn-sm"
                [class.disabled-btn]="!isApproved()"
              >
                <app-icon name="plus" [size]="14"></app-icon>
                Add New Meal
              </a>
            </div>
          </div>

          <!-- Pending Alert if Seller Not Approved -->
          <div class="alert alert-warning mb-6" *ngIf="!isApproved()">
            <app-icon name="alert-circle" [size]="18"></app-icon>
            <div>
              <strong>Kitchen Verification Required</strong>
              <p class="text-xs mt-1">
                Product catalog publishing is locked until an Administrator reviews your permit.
              </p>
            </div>
          </div>

          <!-- Search & Filter Controls -->
          <div class="filter-bar card mb-6">
            <div class="search-input-wrap">
              <app-icon name="search" [size]="16" class="search-icon"></app-icon>
              <input
                type="text"
                class="form-control"
                placeholder="Filter by meal name, category, or macro..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="filterProducts()"
              />
            </div>
            <select
              class="form-control category-select"
              [(ngModel)]="selectedCategory"
              (ngModelChange)="filterProducts()"
            >
              <option value="all">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat.name">{{ cat.name }}</option>
            </select>
          </div>

          <!-- Active / Archived switch -->
          <div class="view-tabs mb-4" role="tablist">
            <button
              type="button"
              role="tab"
              [class.active]="!showArchived"
              (click)="setView(false)"
            >
              Active ({{ activeCount }})
            </button>
            <button type="button" role="tab" [class.active]="showArchived" (click)="setView(true)">
              Archived ({{ archivedCount }})
            </button>
          </div>

          <!-- Product Table -->
          <div class="card table-panel">
            <div class="table-container" *ngIf="filteredProducts.length > 0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Meal Details</th>
                    <th>Category</th>
                    <th>Serving Size</th>
                    <th class="text-center">Macros (P / C / F / kcal)</th>
                    <th class="text-center">Stock</th>
                    <th class="text-center">Live Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of filteredProducts">
                    <td>
                      <div class="meal-row-info">
                        <img [src]="p.imageUrl" [alt]="p.name" class="meal-thumb" />
                        <div class="meal-details-wrap">
                          <strong class="meal-name">{{ p.name }}</strong>
                          <div class="meal-meta-row">
                            <span class="meal-price">{{
                              p.price | currency: 'PHP' : 'symbol'
                            }}</span>
                            <span
                              class="badge"
                              [class.badge-success]="p.nutritionStatus === 'verified'"
                              [class.badge-danger]="p.nutritionStatus === 'rejected'"
                              [class.badge-warning]="
                                p.nutritionStatus !== 'verified' && p.nutritionStatus !== 'rejected'
                              "
                              [title]="
                                p.nutritionStatus === 'verified'
                                  ? 'Customers can see and order this meal'
                                  : 'Hidden from customers until the admin verifies the nutrition'
                              "
                            >
                              {{
                                p.nutritionStatus === 'verified'
                                  ? 'Approved'
                                  : p.nutritionStatus === 'rejected'
                                    ? 'Nutrition rejected'
                                    : 'Pending admin review'
                              }}
                            </span>
                            <span class="moderation-alert text-xs text-danger" *ngIf="p.isDisabled">
                              &bull; Disabled by Admin ({{ p.disableReason || 'Compliance' }})
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="text-xs">{{ p.category }}</td>
                    <td class="text-xs text-secondary">{{ p.nutrition.servingSize }}</td>
                    <td class="text-center">
                      <div class="macro-cell-group">
                        <span class="p-val font-bold text-primary"
                          >{{ p.nutrition.protein }}g P</span
                        >
                        <span class="sub-val text-xs text-secondary"
                          >{{ p.nutrition.carbs }}C / {{ p.nutrition.fat }}F &bull;
                          {{ p.nutrition.calories }} kcal</span
                        >
                      </div>
                    </td>
                    <td class="text-center">
                      <span
                        class="stock-badge"
                        [class.badge-warning]="p.stock > 0 && p.stock <= 5"
                        [class.badge-danger]="p.stock === 0"
                        [class.badge-neutral]="p.stock > 5"
                      >
                        {{ p.stock }} units
                      </span>
                    </td>
                    <td class="text-center">
                      <button
                        class="toggle-avail-btn"
                        [class.active]="p.isAvailable && !p.isDisabled"
                        [disabled]="p.isDisabled"
                        (click)="toggleAvailability(p)"
                      >
                        {{ p.isAvailable && !p.isDisabled ? 'Available' : 'Paused' }}
                      </button>
                    </td>
                    <td class="text-right">
                      <div class="actions-group">
                        <a
                          *ngIf="!p.isArchived"
                          [routerLink]="['/seller/products/edit', p.id]"
                          class="btn btn-ghost btn-sm"
                          title="Edit Meal"
                        >
                          <app-icon name="edit" [size]="14"></app-icon>
                        </a>
                        <button
                          *ngIf="!p.isArchived"
                          class="btn btn-ghost btn-sm"
                          (click)="archiveProduct(p)"
                          title="Archive meal"
                          aria-label="Archive meal"
                        >
                          <app-icon name="archive" [size]="14"></app-icon>
                        </button>
                        <button
                          *ngIf="p.isArchived"
                          class="btn btn-secondary btn-sm"
                          (click)="restoreProduct(p)"
                        >
                          <app-icon name="rotate-ccw" [size]="14"></app-icon>
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty state -->
            <div class="empty-state py-12 text-center" *ngIf="filteredProducts.length === 0">
              <app-icon name="package" [size]="48" color="var(--color-text-tertiary)"></app-icon>
              <h3>{{ showArchived ? 'No archived meals' : 'No Meals In Catalog' }}</h3>
              <p class="text-xs text-secondary mt-1">
                No products match your search query or your kitchen has not published any recipes
                yet.
              </p>
              <a
                routerLink="/seller/products/add"
                class="btn btn-primary btn-sm mt-4"
                [class.disabled-btn]="!isApproved()"
              >
                Add Your First Meal
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .view-tabs {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-md);
      }
      .view-tabs button {
        border: none;
        background: none;
        padding: 6px 14px;
        font-size: var(--font-size-xs);
        font-weight: 600;
        color: var(--color-text-secondary);
        border-radius: var(--radius);
        cursor: pointer;
      }
      .view-tabs button.active {
        background: var(--color-surface);
        color: var(--color-primary);
        box-shadow: var(--shadow-sm);
      }
      .view-tabs button:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
      .seller-layout {
        display: flex;
        min-height: 100vh;
        background: var(--color-bg-secondary);
      }
      .seller-main-content {
        flex: 1;
        margin-left: var(--sidebar-width);
        padding: var(--space-8) var(--space-6);
      }
      .seller-container {
        max-width: var(--container-max);
        margin: 0 auto;
      }

      .filter-bar {
        display: flex;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--color-border);
        background: white;
      }
      .search-input-wrap {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-icon {
        position: absolute;
        left: 12px;
        color: var(--color-text-secondary);
      }
      .search-input-wrap .form-control {
        padding-left: 36px;
      }
      .category-select {
        width: 200px;
      }

      .table-panel {
        border: 1px solid var(--color-border);
        background: white;
      }
      .meal-row-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .meal-thumb {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        object-fit: cover;
        border: 1px solid var(--color-border);
        flex-shrink: 0;
      }
      .meal-details-wrap {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .meal-meta-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .meal-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
        display: block;
      }
      .meal-price {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-primary);
      }
      .macro-cell-group {
        display: flex;
        flex-direction: column;
      }
      .p-val {
        font-size: var(--font-size-xs);
      }
      .stock-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: var(--radius-full);
      }
      .toggle-avail-btn {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        border: 1px solid var(--color-border);
        background: var(--color-bg-secondary);
        cursor: pointer;
        color: var(--color-text-secondary);
      }
      .toggle-avail-btn.active {
        background: var(--color-success-bg);
        color: #166534;
        border-color: rgba(40, 167, 69, 0.3);
      }
      .actions-group {
        display: flex;
        justify-content: flex-end;
        gap: 4px;
      }

      .alert-warning {
        background: #fffbeb;
        color: #92400e;
        border: 1px solid #fcd34d;
        padding: 12px 14px;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .disabled-btn {
        opacity: 0.5;
        pointer-events: none;
      }

      @media (max-width: 900px) {
        .seller-main-content {
          margin-left: 0;
          padding: var(--space-4);
        }
        .filter-bar {
          flex-direction: column;
        }
        .category-select {
          width: 100%;
        }
      }
    `,
  ],
})
export class SellerProductsComponent implements OnInit {
  // [PRODUCTS-FS #11] Refresh this screen whenever Firestore data changes
  private cloud = inject(CloudStoreService);
  private liveCdr = inject(ChangeDetectorRef);
  private liveRefresh = effect(() => {
    this.cloud.version();
    untracked(() => {
      this.ngOnInit();
      this.liveCdr.markForCheck(); // [LIVE] redraw now, so no click is needed to see new data
    });
  });

  allMine: Product[] = [];
  showArchived = false;
  activeCount = 0;
  archivedCount = 0;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: any[] = [];
  searchQuery = '';
  selectedCategory = 'all';

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private sellerService: SellerService,
  ) {}

  ngOnInit() {
    this.categories = this.productService.getCategories();
    this.loadProducts();
  }

  isApproved(): boolean {
    const user = this.authService.user();
    return user ? this.sellerService.isApproved(user.id) : false;
  }

  loadProducts() {
    const user = this.authService.user();
    if (user) {
      this.allMine = this.productService.getProductsBySeller(user.id, true);
      this.activeCount = this.allMine.filter((p) => !p.isArchived).length;
      this.archivedCount = this.allMine.length - this.activeCount;
      this.products = this.allMine.filter((p) => !!p.isArchived === this.showArchived);
      this.filterProducts();
    }
  }

  filterProducts() {
    this.filteredProducts = this.products.filter((p) => {
      const matchSearch =
        !this.searchQuery ||
        p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCategory = this.selectedCategory === 'all' || p.category === this.selectedCategory;
      return matchSearch && matchCategory;
    });
  }

  // [SAMPLE-FS #4] Import sample meals into this seller's kitchen (saved in Firestore)
  isImporting = false;
  private cdr = inject(ChangeDetectorRef);

  async importSamples(set: 'demo' | 'extra') {
    const user = this.authService.user();
    const biz = user ? this.sellerService.getBusiness(user.id) : undefined;
    if (!user || !biz) {
      alert('Your business profile is not ready yet. Please refresh the page and try again.');
      return;
    }
    const label =
      set === 'demo'
        ? '10 demo meals (with photos)'
        : '14 extra meals (placeholder photos you can replace)';
    if (
      !confirm(
        `Add ${label} to your kitchen? They are saved in Firebase and customers can see them.`,
      )
    )
      return;
    this.isImporting = true;
    this.cdr.markForCheck();
    const r = await this.productService.importSampleMeals(set, user.id, biz.id);
    this.isImporting = false;
    this.loadProducts();
    this.cdr.markForCheck();
    alert(
      `Added: ${r.added}. Already there: ${r.skipped}. Failed: ${r.failed}.` +
        (r.failed ? ' Check the browser console (F12) for "saveProduct failed".' : ''),
    );
  }

  // [PRODUCTS-FS #15] Wait for Firestore and report failures
  async toggleAvailability(product: Product) {
    const updated = { ...product, isAvailable: !product.isAvailable, updatedAt: new Date() };
    const ok = await this.productService.updateProduct(updated);
    if (!ok) alert('Could not update this meal. Please try again.');
    this.loadProducts();
  }

  setView(archived: boolean) {
    this.showArchived = archived;
    this.loadProducts();
  }

  async archiveProduct(product: Product) {
    if (
      !confirm(
        `Archive "${product.name}"? Customers will no longer see it. You can restore it anytime from the Archived tab.`,
      )
    )
      return;
    const ok = await this.productService.archiveProduct(product.id);
    if (!ok)
      alert(
        this.cloud.lastErrorCode === 'permission-denied'
          ? 'Firestore blocked this change. Publish the updated firestore.rules in the Firebase Console, then try again.'
          : 'Could not archive this meal. Please try again.',
      );
    this.loadProducts();
  }

  async restoreProduct(product: Product) {
    const ok = await this.productService.restoreProduct(product.id);
    if (!ok)
      alert(
        this.cloud.lastErrorCode === 'permission-denied'
          ? 'Firestore blocked this change. Publish the updated firestore.rules in the Firebase Console, then try again.'
          : 'Could not restore this meal. Please try again.',
      );
    this.loadProducts();
  }
}
