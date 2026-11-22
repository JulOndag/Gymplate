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
import { MEAL_CARD_STYLES } from '../../shared/components/meal-card.styles';
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

          <!-- Meal cards (same look as the admin and customer meal cards) -->
          <p class="results-count mb-4">
            Showing <strong>{{ filteredProducts.length }}</strong> {{ showArchived ? 'archived' : '' }} meals
          </p>

          <div class="meal-grid" *ngIf="filteredProducts.length > 0">
            <div class="card meal-card" *ngFor="let p of filteredProducts" [class.is-archived]="p.isArchived">
              <div class="meal-img-box">
                <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" />
                <span class="category-tag">{{ p.category }}</span>
                <span class="badge state-pill" [ngClass]="moderationClass(p)">{{ moderationLabel(p) }}</span>
                <span
                  class="stock-pill-img"
                  [class.low]="p.stock > 0 && p.stock <= 5"
                  [class.out]="p.stock === 0"
                >
                  {{ p.stock === 0 ? 'Sold out' : p.stock + ' in stock' }}
                </span>
              </div>

              <div class="meal-body">
                <div class="title-row">
                  <h3 class="meal-title">{{ p.name }}</h3>
                  <span class="meal-price">{{ p.price | currency: 'PHP' : 'symbol' }}</span>
                </div>
                <div class="meal-sub">
                  <span class="text-xs text-secondary">Serving: {{ p.nutrition.servingSize }}</span>
                </div>
                <p class="meal-desc">{{ p.description }}</p>
                <p class="admin-note" *ngIf="p.isDisabled">
                  Disabled by admin: {{ p.disableReason || 'Compliance review' }}
                </p>

                <div class="macros-box">
                  <div class="macro-cell highlight">
                    <span class="macro-val">{{ p.nutrition.protein }}g</span>
                    <span class="macro-tag">Protein</span>
                  </div>
                  <div class="macro-cell">
                    <span class="macro-val">{{ p.nutrition.calories }}</span>
                    <span class="macro-tag">Calories</span>
                  </div>
                  <div class="macro-cell">
                    <span class="macro-val">{{ p.nutrition.carbs }}g</span>
                    <span class="macro-tag">Carbs</span>
                  </div>
                  <div class="macro-cell">
                    <span class="macro-val">{{ p.nutrition.fat }}g</span>
                    <span class="macro-tag">Fat</span>
                  </div>
                </div>

                <div class="card-actions-row">
                  <button
                    *ngIf="!p.isArchived"
                    class="toggle-avail-btn"
                    [class.active]="p.isAvailable && !p.isDisabled"
                    [disabled]="p.isDisabled"
                    (click)="toggleAvailability(p)"
                  >
                    {{ p.isAvailable && !p.isDisabled ? 'Available' : 'Paused' }}
                  </button>
                  <span class="text-xs text-secondary" *ngIf="p.isArchived">Archived</span>

                  <div class="action-buttons-group">
                    <a
                      *ngIf="!p.isArchived"
                      [routerLink]="['/seller/products/edit', p.id]"
                      class="btn btn-secondary btn-sm"
                    >
                      <app-icon name="edit" [size]="14"></app-icon>
                      Edit
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
                    <button *ngIf="p.isArchived" class="btn btn-secondary btn-sm" (click)="restoreProduct(p)">
                      <app-icon name="rotate-ccw" [size]="14"></app-icon>
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div class="card empty-state py-12 text-center" *ngIf="filteredProducts.length === 0">
            <app-icon name="package" [size]="48" color="var(--color-text-tertiary)"></app-icon>
            <h3>{{ showArchived ? 'No archived meals' : 'No Meals In Catalog' }}</h3>
            <p class="text-xs text-secondary mt-1">
              No meals match your search, or your kitchen has not published any recipes yet.
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
    MEAL_CARD_STYLES,
  ],
})
export class SellerProductsComponent implements OnInit {
  // [PRODUCTS-FS #11] Refresh this screen whenever Firestore data changes
  private cloud = inject(CloudStoreService);
  private liveRefresh = effect(() => {
    this.cloud.version();
    untracked(() => this.ngOnInit());
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

  /** Same wording the admin sees on the meal. */
  moderationLabel(p: Product): string {
    if (p.isArchived) return 'Archived';
    if (p.isDisabled) return 'Disabled';
    if (p.nutritionStatus === 'verified') return 'Approved';
    if (p.nutritionStatus === 'rejected') return 'Nutrition Rejected';
    return 'Pending Review';
  }

  moderationClass(p: Product): string {
    if (p.isArchived) return 'badge-neutral';
    if (p.isDisabled || p.nutritionStatus === 'rejected') return 'badge-danger';
    if (p.nutritionStatus === 'verified') return 'badge-success';
    return 'badge-warning';
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
