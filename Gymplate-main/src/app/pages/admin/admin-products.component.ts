import { ChangeDetectorRef, Component, OnInit, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { AdminService } from '../../services/admin.service';
import { MockDataService } from '../../services/mock-data.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar.component';
import { IconComponent } from '../../shared/components/icon.component';
import { CloudStoreService } from '../../services/cloud-store.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, IconComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>

      <main class="admin-main-content">
        <div class="admin-container">
          <div class="page-header mb-6">
            <span class="text-xs font-bold uppercase text-warning">Compliance & Moderation</span>
            <h1>Platform Food Catalog Moderation</h1>
            <p class="text-xs text-secondary">
              Inspect seller nutritional claims and disable non-compliant dishes with transparent
              reasons.
            </p>
          </div>

          <!-- Search & Filter Controls -->
          <div class="card filter-bar mb-6">
            <div class="search-input-wrap">
              <app-icon name="search" [size]="16" class="search-icon"></app-icon>
              <input
                type="text"
                class="form-control"
                placeholder="Search meal name, kitchen, or category..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="filterProducts()"
              />
            </div>
            <select
              class="form-control status-select"
              [(ngModel)]="statusFilter"
              (ngModelChange)="filterProducts()"
            >
              <option value="all">All Dishes ({{ liveCount }})</option>
              <option value="active">Active Marketplace Dishes</option>
              <option value="disabled">Disabled by Moderation</option>
              <option value="nutrition_pending">Nutrition waiting for review</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <!-- [ADMIN-CARDS] Meal cards, same look as the customer Explore page -->
          <p class="results-count mb-4">
            Showing <strong>{{ filteredProducts.length }}</strong> meals
          </p>

          <div class="grid-3 product-grid" *ngIf="filteredProducts.length > 0">
            <div class="card product-card" *ngFor="let p of filteredProducts">
              <div class="product-img-box" (click)="openDetails(p)">
                <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" />
                <span class="category-tag">{{ p.category }}</span>
                <span class="badge state-pill" [ngClass]="moderationClass(p)">{{
                  moderationLabel(p)
                }}</span>
              </div>

              <div class="card-body product-card-body">
                <div class="title-row">
                  <h3 class="product-title">{{ p.name }}</h3>
                  <span class="product-price">{{ p.price | currency: 'PHP' : 'symbol' }}</span>
                </div>
                <span class="seller-attribution">Kitchen: {{ getBusinessName(p.sellerId) }}</span>
                <p class="product-desc">{{ p.description }}</p>

                <div class="macros-box">
                  <div class="macro-cell highlight-protein">
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
                  <div class="serving-size-info">
                    <span class="serving-size-text">Serving: {{ p.nutrition.servingSize }}</span>
                  </div>
                  <button class="btn btn-primary btn-sm" (click)="openDetails(p)">Details</button>
                </div>
              </div>
            </div>
          </div>

          <div class="card empty-state" *ngIf="filteredProducts.length === 0">
            <h3>No meals found</h3>
            <p class="text-secondary">No meals match this search or filter.</p>
          </div>
        </div>
      </main>
    </div>

    <!-- [ADMIN-CARDS] Details: everything about the meal, the reference link, and the nutrition review -->
    <div class="modal-overlay" *ngIf="detailProduct" (click)="closeDetails()">
      <div class="modal-content details-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Meal Details &amp; Nutrition Review</h3>
          <button class="btn btn-ghost btn-sm" (click)="closeDetails()">
            <app-icon name="x" [size]="20"></app-icon>
          </button>
        </div>
        <div class="modal-body" *ngIf="detailProduct as d">
          <div class="details-top">
            <img class="details-img" [src]="d.imageUrl" [alt]="d.name" />
            <div class="details-info">
              <h2 class="details-name">{{ d.name }}</h2>
              <div class="details-badges">
                <span class="badge badge-neutral">{{ d.category }}</span>
                <span class="badge" [ngClass]="moderationClass(d)">{{ moderationLabel(d) }}</span>
              </div>
              <p class="text-xs text-secondary mt-2">
                Kitchen: <strong>{{ getBusinessName(d.sellerId) }}</strong> &bull; Price:
                <strong>{{ d.price | currency: 'PHP' : 'symbol' }}</strong> &bull; Stock:
                <strong>{{ d.stock }}</strong> &bull;
                {{ d.isAvailable ? 'Available' : 'Not available' }}
              </p>
              <p class="details-desc">{{ d.description }}</p>
            </div>
          </div>

          <div class="details-section">
            <h4>
              Nutrition facts (written by the seller) &mdash; Serving: {{ d.nutrition.servingSize }}
            </h4>
            <div class="macros-box">
              <div class="macro-cell highlight-protein">
                <span class="macro-val">{{ d.nutrition.protein }}g</span
                ><span class="macro-tag">Protein</span>
              </div>
              <div class="macro-cell">
                <span class="macro-val">{{ d.nutrition.calories }}</span
                ><span class="macro-tag">Calories</span>
              </div>
              <div class="macro-cell">
                <span class="macro-val">{{ d.nutrition.carbs }}g</span
                ><span class="macro-tag">Carbs</span>
              </div>
              <div class="macro-cell">
                <span class="macro-val">{{ d.nutrition.fat }}g</span
                ><span class="macro-tag">Fat</span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4>Reference link</h4>
            <div *ngIf="d.nutritionSourceUrl; else noLink">
              <a
                [href]="d.nutritionSourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="link-text"
                >{{ d.nutritionSourceUrl }}</a
              >
              <div class="mt-2">
                <a
                  [href]="d.nutritionSourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-outline btn-sm"
                  >Open link in a new tab &#8599;</a
                >
              </div>
            </div>
            <ng-template #noLink
              ><span class="text-danger text-xs"
                >The seller did not add a reference link (older meal). Ask the seller to edit the
                meal and add one.</span
              ></ng-template
            >

            <p class="text-xs mt-3">
              Nutrition review:
              <span
                class="badge"
                [class.badge-success]="d.nutritionStatus === 'verified'"
                [class.badge-danger]="d.nutritionStatus === 'rejected'"
                [class.badge-warning]="!d.nutritionStatus || d.nutritionStatus === 'pending'"
              >
                {{
                  d.nutritionStatus === 'verified'
                    ? 'Verified'
                    : d.nutritionStatus === 'rejected'
                      ? 'Rejected'
                      : 'Pending'
                }}
              </span>
            </p>
            <p class="text-xs text-secondary mt-1" *ngIf="d.nutritionReviewNote">
              Admin note: "{{ d.nutritionReviewNote }}"
              <span *ngIf="d.nutritionReviewedAt"
                >&bull; {{ d.nutritionReviewedAt | date: 'medium' }}</span
              >
            </p>

            <!-- A rejected meal stays rejected until the seller fixes it -->
            <p
              class="text-xs text-secondary mt-3"
              *ngIf="!d.isArchived && d.nutritionStatus === 'rejected'"
            >
              This meal stays rejected until the seller fixes the nutrition facts or the reference
              link. It goes back to "Pending" when the seller saves the change, and then you can
              review it again.
            </p>

            <div class="mt-3" *ngIf="!d.isArchived && d.nutritionStatus !== 'rejected'">
              <label class="form-label" for="reviewNote"
                >Review note (required when rejecting)</label
              >
              <textarea
                id="reviewNote"
                class="form-control"
                rows="2"
                [(ngModel)]="reviewNote"
                placeholder="e.g. Protein on the source is 31 g, not 60 g."
              ></textarea>
              <div class="mt-2 review-actions">
                <button
                  class="btn btn-success btn-sm"
                  *ngIf="(d.nutritionStatus ?? 'pending') === 'pending'"
                  (click)="verifyNutrition(d)"
                >
                  Verify nutrition
                </button>
                <button
                  class="btn btn-outline btn-sm text-danger"
                  [disabled]="!reviewNote.trim()"
                  (click)="rejectNutrition(d)"
                >
                  Reject nutrition
                </button>
              </div>
            </div>
          </div>

          <div class="details-section" *ngIf="d.isDisabled && d.disableReason">
            <h4>Disabled</h4>
            <p class="text-xs text-danger">"{{ d.disableReason }}"</p>
          </div>

          <p class="text-xs text-tertiary">
            Added {{ d.createdAt | date: 'medium' }} &bull; Last updated
            {{ d.updatedAt | date: 'medium' }}
          </p>
        </div>
        <div class="modal-footer" *ngIf="detailProduct as d">
          <button class="btn btn-secondary" *ngIf="!d.isArchived" (click)="archiveProduct(d)">
            Archive
          </button>
          <button class="btn btn-secondary" *ngIf="d.isArchived" (click)="restoreProduct(d)">
            Restore
          </button>
          <button
            class="btn btn-outline text-danger"
            *ngIf="!d.isDisabled && !d.isArchived"
            (click)="closeDetails(); openDisableModal(d)"
          >
            Disable Dish
          </button>
          <button
            class="btn btn-success"
            *ngIf="d.isDisabled && !d.isArchived"
            (click)="enableProduct(d)"
          >
            Re-Enable
          </button>
          <button class="btn btn-primary" (click)="closeDetails()">Close</button>
        </div>
      </div>
    </div>

    <!-- Modal for Disabling Product with Mandatory Reason -->
    <div class="modal-overlay" *ngIf="showModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Disable Marketplace Meal</h3>
          <button class="modal-close" (click)="showModal = false">
            <app-icon name="x" [size]="20"></app-icon>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-xs text-secondary mb-3">
            Target Meal: <strong>{{ selectedProduct?.name }}</strong> (Kitchen:
            {{ getBusinessName(selectedProduct?.sellerId || '') }})
          </p>
          <div class="form-group">
            <label class="form-label" for="disableReason"
              >Mandatory Compliance / Infraction Reason *</label
            >
            <textarea
              id="disableReason"
              class="form-control"
              rows="3"
              placeholder="e.g. Unrealistic protein density claims; missing allergens warning..."
              [(ngModel)]="disableReason"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="showModal = false">Cancel</button>
          <button
            class="btn btn-danger"
            [disabled]="!disableReason.trim()"
            (click)="confirmDisable()"
          >
            Disable from Marketplace
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-layout {
        display: flex;
        min-height: 100vh;
        background: var(--color-bg-secondary);
      }
      .admin-main-content {
        flex: 1;
        margin-left: var(--sidebar-width);
        padding: var(--space-8) var(--space-6);
      }
      .admin-container {
        max-width: var(--container-max);
        margin: 0 auto;
      }
      .filter-bar {
        display: flex;
        gap: var(--space-4);
        padding: var(--space-3) var(--space-4);
        background: white;
        border: 1px solid var(--color-border);
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
      .status-select {
        width: 200px;
      }

      .table-panel {
        border: 1px solid var(--color-border);
        background: white;
      }
      .meal-thumb {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        object-fit: cover;
      }
      .macro-block {
        display: flex;
        flex-direction: column;
      }

      .product-grid {
        gap: var(--space-6);
      }
      .product-card {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--color-border);
        transition:
          transform var(--transition),
          box-shadow var(--transition);
      }
      .product-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .product-img-box {
        position: relative;
        height: 200px;
        background: var(--color-bg-secondary);
        overflow: hidden;
        cursor: pointer;
      }
      .product-img-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .category-tag {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(26, 26, 26, 0.75);
        backdrop-filter: blur(4px);
        color: white;
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: var(--radius-full);
      }
      .out-of-stock-pill {
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--color-danger);
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: var(--radius-full);
      }
      .low-stock-pill {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(240, 173, 78, 0.95);
        color: #78350f;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: var(--radius-full);
      }
      .product-card-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: var(--space-4);
      }
      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2px;
        gap: var(--space-2);
      }
      .product-title-link {
        color: inherit;
        text-decoration: none;
      }
      .product-title-link:hover .product-title {
        color: var(--color-primary);
      }
      .product-title {
        font-size: var(--font-size-base);
        font-weight: 600;
        line-height: 1.3;
        /* [CARD-ALIGN] always reserve 2 lines, so long and short names give the same card layout */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: calc(var(--font-size-base) * 1.3 * 2);
      }
      .product-price {
        font-size: var(--font-size-base);
        font-weight: 700;
        color: var(--color-primary);
        white-space: nowrap;
      }
      .seller-attribution {
        font-size: 11px;
        color: var(--color-text-secondary);
        margin-bottom: var(--space-2);
        display: block;
      }
      .product-desc {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        line-height: 1.5;
        min-height: calc(var(--font-size-xs) * 1.5 * 2); /* [CARD-ALIGN] always 2 lines tall */
        margin-bottom: var(--space-4);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .macros-box {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        background: var(--color-bg-secondary);
        padding: 8px 4px;
        border-radius: var(--radius-sm);
        margin-bottom: var(--space-4);
      }
      .macro-cell {
        text-align: center;
      }
      .macro-cell.highlight-protein .macro-val {
        color: var(--color-primary);
        font-weight: 700;
      }
      .macro-val {
        display: block;
        font-size: var(--font-size-xs);
        font-weight: 600;
      }
      .macro-tag {
        font-size: 9px;
        color: var(--color-text-secondary);
        text-transform: uppercase;
      }
      .card-actions-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: var(--space-3);
        border-top: 1px solid var(--color-border);
        gap: var(--space-2);
      }
      .serving-size-info {
        display: flex;
        flex-direction: column;
      }
      .serving-size-text {
        font-size: 11px;
        color: var(--color-text-secondary);
        font-weight: 500;
      }
      .verified-label {
        font-size: 9px;
        color: var(--color-text-tertiary);
      }
      .action-buttons-group {
        display: flex;
        gap: var(--space-2);
      }

      .state-pill {
        position: absolute;
        top: 10px;
        right: 10px;
      }
      .results-count {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
      }
      .details-modal {
        max-width: 780px;
        width: 94vw;
        max-height: 90vh;
        overflow-y: auto;
      }
      .details-top {
        display: flex;
        gap: var(--space-4);
        flex-wrap: wrap;
        margin-bottom: var(--space-4);
      }
      .details-img {
        width: 220px;
        height: 170px;
        object-fit: cover;
        border-radius: var(--radius-md);
        background: var(--color-bg-secondary);
      }
      .details-info {
        flex: 1;
        min-width: 220px;
      }
      .details-name {
        margin: 0 0 6px;
        font-size: var(--font-size-lg);
      }
      .details-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .details-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        line-height: 1.5;
        margin-top: var(--space-2);
      }
      .details-section {
        border-top: 1px solid var(--color-border);
        padding-top: var(--space-3);
        margin-top: var(--space-3);
      }
      .details-section h4 {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-sm);
      }
      .link-text {
        word-break: break-all;
        font-size: var(--font-size-xs);
        font-weight: 600;
      }
      .review-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      @media (max-width: 900px) {
        .admin-main-content {
          margin-left: 0;
          padding: var(--space-4);
        }
        .filter-bar {
          flex-direction: column;
        }
        .status-select {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdminProductsComponent implements OnInit {
  // [PRODUCTS-FS #11] Refresh this screen whenever Firestore data changes
  private cloud = inject(CloudStoreService);
  private liveRefresh = effect(() => {
    this.cloud.version();
    untracked(() => this.ngOnInit());
  });

  allProducts: Product[] = [];
  liveCount = 0;
  filteredProducts: Product[] = [];
  searchQuery = '';
  statusFilter = 'all';

  showModal = false;
  selectedProduct: Product | null = null;

  // [ADMIN-CARDS] details window
  detailProduct: Product | null = null;
  reviewNote = '';
  disableReason = '';

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private productService: ProductService,
    private adminService: AdminService,
    private mockData: MockDataService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }

  loadProducts() {
    this.allProducts = this.productService.getAllProducts();
    this.liveCount = this.allProducts.filter((p) => !p.isArchived).length;
    // keep the open details window up to date
    if (this.detailProduct) {
      const id = this.detailProduct.id;
      this.detailProduct = this.allProducts.find((x) => x.id === id) || null;
    }
    this.filterProducts();
  }

  filterProducts() {
    this.filteredProducts = this.allProducts.filter((p) => {
      const matchSearch =
        !this.searchQuery ||
        p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getBusinessName(p.sellerId).toLowerCase().includes(this.searchQuery.toLowerCase());

      const archived = !!p.isArchived;
      const matchStatus =
        this.statusFilter === 'archived'
          ? archived
          : archived
            ? false
            : this.statusFilter === 'nutrition_pending'
              ? (p.nutritionStatus ?? 'pending') === 'pending'
              : this.statusFilter === 'all' ||
                (this.statusFilter === 'disabled' ? p.isDisabled : !p.isDisabled);

      return matchSearch && matchStatus;
    });
  }

  getBusinessName(sellerId: string): string {
    const biz = this.mockData.getBusinessBySellerId(sellerId);
    return biz ? biz.businessName : 'Kitchen Partner';
  }

  openDisableModal(product: Product) {
    this.selectedProduct = product;
    this.disableReason = '';
    this.showModal = true;
  }

  // [PRODUCTS-FS #14] Disable / re-enable now wait for Firestore and report failures
  async confirmDisable() {
    if (!this.selectedProduct || !this.disableReason.trim()) return;
    const admin = this.authService.user();
    const ok = await this.adminService.disableProduct(
      this.selectedProduct.id,
      admin?.id || 'admin-1',
      this.disableReason,
    );
    if (!ok) alert('Could not disable this meal. Check the browser console.');
    this.showModal = false;
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }

  openDetails(p: Product) {
    this.detailProduct = p;
    this.reviewNote = '';
  }

  closeDetails() {
    this.detailProduct = null;
  }

  /** What the card shows. "Approved" only appears after the admin verified the nutrition numbers. */
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

  // [NUTRITION-REVIEW] Admin checks the seller's numbers against the reference link
  async verifyNutrition(product: Product) {
    // A rejected meal cannot be verified until the seller fixes it (it returns to "pending")
    if (product.nutritionStatus === 'rejected') return;
    if (
      !product.nutritionSourceUrl &&
      !confirm(
        'This meal has no reference link, so its numbers cannot be checked. Verify it anyway?',
      )
    )
      return;
    const admin = this.authService.user();
    const ok = await this.adminService.reviewNutrition(
      product.id,
      admin?.id || 'admin-1',
      'verified',
      this.reviewNote.trim() || 'Matches the reference link',
    );
    if (!ok) alert('Could not save the review. Check the browser console.');
    else this.closeDetails(); // [CD-FIX] the review is saved: close the window
    this.reviewNote = '';
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }

  async rejectNutrition(product: Product) {
    const note = this.reviewNote.trim();
    if (!note) return;
    const admin = this.authService.user();
    const ok = await this.adminService.reviewNutrition(
      product.id,
      admin?.id || 'admin-1',
      'rejected',
      note,
    );
    if (!ok) alert('Could not save the review. Check the browser console.');
    else this.closeDetails(); // [CD-FIX] the review is saved: close the window
    this.reviewNote = '';
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }

  async archiveProduct(product: Product) {
    if (
      !confirm(
        `Archive "${product.name}"? It will be hidden from customers and can be restored anytime.`,
      )
    )
      return;
    const admin = this.authService.user();
    const ok = await this.adminService.archiveProduct(product.id, admin?.id || 'admin-1');
    if (!ok) alert('Could not archive this meal. Check the browser console.');
    this.closeDetails();
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }

  async restoreProduct(product: Product) {
    const admin = this.authService.user();
    const ok = await this.adminService.restoreProduct(product.id, admin?.id || 'admin-1');
    if (!ok) alert('Could not restore this meal. Check the browser console.');
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }

  async enableProduct(product: Product) {
    const admin = this.authService.user();
    const ok = await this.adminService.enableProduct(product.id, admin?.id || 'admin-1');
    if (!ok) alert('Could not re-enable this meal. Check the browser console.');
    this.loadProducts();
    this.cdr.detectChanges(); // [CD-FIX] redraw right after the change
  }
}
