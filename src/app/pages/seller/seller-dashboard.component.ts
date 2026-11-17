import { Component, OnInit, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SellerService } from '../../services/seller.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { Order, Product, SellerApplication } from '../../models';
import { SellerSidebarComponent } from '../../shared/components/seller-sidebar.component';
import { ReceiptModalComponent } from '../../shared/components/receipt-modal.component';
import { IconComponent } from '../../shared/components/icon.component';
import { dailyCounts, greeting, sparkPath } from '../../shared/utils/dashboard.util';

import { CloudStoreService } from '../../services/cloud-store.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SellerSidebarComponent, ReceiptModalComponent, IconComponent],
  template: `
    <div class="seller-layout">
      <app-seller-sidebar></app-seller-sidebar>

      <main class="seller-main-content">
        <div class="seller-container">
          <!-- Welcome banner -->
          <section class="dash-hero">
            <div class="dash-hero-text">
              <h1>{{ greet }}, {{ businessName() }}</h1>
              <p>Here is what is happening with your kitchen today.</p>
              <div class="dash-hero-actions">
                <a routerLink="/seller/products/add" class="btn-hero" [class.disabled]="!isApproved()">
                  <app-icon name="plus" [size]="14"></app-icon>
                  Add meal
                </a>
                <a routerLink="/seller/orders" class="btn-hero ghost">
                  <app-icon name="clipboard-list" [size]="14"></app-icon>
                  View orders
                </a>
              </div>
            </div>
            <img class="dash-hero-img" *ngIf="heroImage" [src]="heroImage" alt="" />
          </section>

          <!-- Application status banner if not approved -->
          <div class="status-alert-card card mb-6" *ngIf="!isApproved()">
            <div class="flex items-start gap-3">
              <app-icon name="alert-triangle" [size]="24" color="var(--color-warning)"></app-icon>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <strong class="text-sm">Verification status: {{ formatStatus(application?.status || '') }}</strong>
                  <span class="badge" [ngClass]="'badge-' + (application?.status === 'rejected' ? 'danger' : 'warning')">
                    {{ application?.status }}
                  </span>
                </div>
                <p class="text-xs text-secondary mt-1" *ngIf="application?.status === 'pending'">
                  Your application is waiting for document verification. Publishing meals is locked until it is approved.
                </p>
                <p class="text-xs text-danger mt-1" *ngIf="application?.status === 'rejected'">
                  Rejection reason: {{ application?.rejectionReason || 'Please resubmit valid commercial credentials.' }}
                </p>
                <p class="text-xs text-info mt-1" *ngIf="application?.status === 'info_required'">
                  Message from compliance: {{ application?.infoRequestReason || 'Additional identity verification needed.' }}
                </p>
              </div>
              <a routerLink="/seller/pending" class="btn btn-secondary btn-sm">Review status</a>
            </div>
          </div>

          <!-- Stat cards -->
          <div class="dash-stats">
            <div class="card dash-stat">
              <div class="dash-stat-icon"><app-icon name="dollar-sign" [size]="20" color="var(--color-primary)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Gross sales</span>
                <strong class="dash-stat-value">{{ totalSales | currency:'PHP':'symbol':'1.0-0' }}</strong>
                <span class="dash-stat-sub">Excludes cancelled orders</span>
              </div>
              <svg class="dash-spark" viewBox="0 0 96 32" preserveAspectRatio="none" aria-label="Orders in the last 7 days">
                <path [attr.d]="sparkD"></path>
              </svg>
            </div>
            <div class="card dash-stat">
              <div class="dash-stat-icon warn"><app-icon name="clock" [size]="20" color="var(--color-warning)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Pending orders</span>
                <strong class="dash-stat-value">{{ pendingOrdersCount }}</strong>
                <span class="dash-stat-sub">Awaiting confirmation</span>
              </div>
            </div>
            <div class="card dash-stat">
              <div class="dash-stat-icon info"><app-icon name="package" [size]="20" color="var(--color-info)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Active menu items</span>
                <strong class="dash-stat-value">{{ myProducts.length }}</strong>
                <span class="dash-stat-sub">{{ lowStockCount }} low in stock (10 or fewer)</span>
              </div>
            </div>
            <div class="card dash-stat">
              <div class="dash-stat-icon"><app-icon name="check-circle" [size]="20" color="var(--color-primary)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Total orders</span>
                <strong class="dash-stat-value">{{ myOrders.length }}</strong>
                <span class="dash-stat-sub">{{ completedOrdersCount }} completed</span>
              </div>
            </div>
          </div>

          <!-- Low stock banner -->
          <div class="low-stock-alert card mb-6" *ngIf="lowStockCount > 0">
            <app-icon name="alert-triangle" [size]="20" color="var(--color-warning)"></app-icon>
            <div class="flex-1">
              <span class="text-xs font-semibold">{{ lowStockCount }} meal(s) are almost sold out</span>
              <p class="text-xs text-secondary">Update stock in Inventory so customers can still check out.</p>
            </div>
            <a routerLink="/seller/inventory" class="btn btn-secondary btn-sm">Manage inventory</a>
          </div>

          <div class="dash-grid">
            <!-- Recent orders -->
            <div class="card dash-panel">
              <div class="dash-panel-head">
                <div>
                  <h3>Recent orders</h3>
                  <p>Newest orders. Archive finished ones to tidy this list.</p>
                </div>
                <a routerLink="/seller/orders" class="btn btn-ghost btn-sm">View all</a>
              </div>

              <div class="table-container" *ngIf="recentOrders.length > 0">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th class="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let o of recentOrders">
                      <td class="font-mono text-xs font-semibold">{{ o.orderNumber }}</td>
                      <td>
                        <span class="text-xs font-medium">{{ o.customerName }}</span>
                        <small class="text-tertiary block capitalize">{{ o.items.length }} dishes &bull; {{ o.fulfillmentType }}</small>
                      </td>
                      <td class="text-xs font-semibold">{{ o.total | currency:'PHP':'symbol' }}</td>
                      <td>
                        <span class="badge" [ngClass]="'badge-' + getStatusBadgeClass(o.status)">
                          {{ formatStatus(o.status) }}
                        </span>
                      </td>
                      <td class="text-right">
                        <button class="btn btn-ghost btn-sm" (click)="openReceipt(o)" title="Receipt">
                          <app-icon name="receipt" [size]="14"></app-icon>
                        </button>
                        <button
                          *ngIf="canArchive(o)"
                          class="btn btn-ghost btn-sm"
                          (click)="archiveOrder(o)"
                          title="Archive order"
                          aria-label="Archive order"
                        >
                          <app-icon name="archive" [size]="14"></app-icon>
                        </button>
                        <a [routerLink]="['/seller/orders', o.id]" class="btn btn-primary btn-sm">Manage</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="empty-state py-8 text-center" *ngIf="recentOrders.length === 0">
                <p class="text-xs text-secondary">No orders yet. New orders will show up here.</p>
              </div>
            </div>

            <!-- Menu quick view -->
            <div class="card dash-panel">
              <div class="dash-panel-head">
                <div>
                  <h3>Your menu</h3>
                  <p>Price, protein and stock</p>
                </div>
                <a routerLink="/seller/products" class="btn btn-ghost btn-sm">All meals</a>
              </div>
              <div class="dash-panel-body">
                <div class="dash-rank-row" *ngFor="let p of myProducts.slice(0, 5)">
                  <img [src]="p.imageUrl" [alt]="p.name" />
                  <div class="flex-1">
                    <span class="dash-rank-name block">{{ p.name }}</span>
                    <span class="dash-rank-meta">{{ p.nutrition.calories }} kcal &bull; {{ p.nutrition.protein }}g protein</span>
                  </div>
                  <div class="mini-right">
                    <span class="text-xs font-bold">{{ p.price | currency:'PHP':'symbol' }}</span>
                    <span class="stock-pill" [class.low]="p.stock <= 5" [class.out]="p.stock === 0">{{ p.stock }} in stock</span>
                  </div>
                </div>
                <p class="text-xs text-secondary" *ngIf="myProducts.length === 0">You have not added any meals yet.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Receipt Modal -->
    <app-receipt-modal
      [isOpen]="isReceiptOpen"
      [order]="selectedOrder"
      (closeEvent)="isReceiptOpen = false"
    ></app-receipt-modal>
  `,
  styles: [`
    .seller-layout { background: var(--color-bg-secondary); }
    .status-alert-card {
      padding: var(--space-4) var(--space-5);
      background: #FFFBEB;
      border: 1px solid #FCD34D;
    }
    .low-stock-alert {
      padding: var(--space-3) var(--space-4);
      background: #FFF8E7;
      border: 1px solid #F0AD4E;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }
    .mini-right { text-align: right; }
    .stock-pill { display: block; font-size: 10px; color: var(--color-text-secondary); }
    .stock-pill.low { color: #b7791f; font-weight: 600; }
    .stock-pill.out { color: var(--color-danger); font-weight: 700; }
  `]
})
export class SellerDashboardComponent implements OnInit {
  private cloud = inject(CloudStoreService);

  // Reload this screen whenever Firestore data changes (new application, approval, etc.).
  private liveRefresh = effect(() => {
    this.cloud.version();
    untracked(() => this.ngOnInit());
  });

  application: SellerApplication | undefined;
  myProducts: Product[] = [];
  myOrders: Order[] = [];
  recentOrders: Order[] = [];
  totalSales = 0;
  pendingOrdersCount = 0;
  completedOrdersCount = 0;
  lowStockCount = 0;
  greet = greeting();
  sparkD = '';
  heroImage = '';

  isReceiptOpen = false;
  selectedOrder: Order | null = null;

  constructor(
    private authService: AuthService,
    private sellerService: SellerService,
    private orderService: OrderService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      this.application = this.sellerService.getApplication(user.id);
      this.myProducts = this.productService.getProductsBySeller(user.id);
      this.myOrders = this.orderService.getSellerOrders(user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      this.recentOrders = this.myOrders.filter((o) => !o.archivedBySeller).slice(0, 5);
      this.sparkD = sparkPath(dailyCounts(this.myOrders, 7), 96, 32);
      this.heroImage = this.myProducts[0]?.imageUrl || '';

      this.totalSales = this.myOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.subtotal, 0);

      this.pendingOrdersCount = this.myOrders.filter(o => o.status === 'pending').length;
      this.completedOrdersCount = this.myOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
      this.lowStockCount = this.myProducts.filter(p => p.stock > 0 && p.stock <= 10).length;
    }
  }

  isApproved(): boolean {
    const user = this.authService.user();
    return user ? this.sellerService.isApproved(user.id) : false;
  }

  businessName(): string {
    const user = this.authService.user();
    if (!user) return 'Seller';
    const biz = this.sellerService.getBusiness(user.id);
    return biz ? biz.businessName : 'FitFuel Kitchen';
  }

  formatStatus(status: string): string {
    return this.orderService.formatStatus(status as any);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
      case 'delivered': return 'success';
      case 'pending': return 'warning';
      case 'confirmed':
      case 'preparing':
      case 'ready':
      case 'out_for_delivery': return 'info';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  }

  canArchive(o: Order): boolean {
    return this.orderService.canArchive(o);
  }

  async archiveOrder(o: Order) {
    const ok = await this.orderService.setArchived(o, 'seller', true);
    if (!ok) alert('Could not archive this order. If it keeps happening, publish the updated firestore.rules in the Firebase Console.');
  }

  openReceipt(order: Order) {
    this.selectedOrder = order;
    this.isReceiptOpen = true;
  }
}
