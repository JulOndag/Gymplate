import { Component, OnInit, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { MockDataService } from '../../services/mock-data.service';
import { ActivityLog, SellerApplication } from '../../models';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar.component';
import { IconComponent } from '../../shared/components/icon.component';
import { AuthService } from '../../services/auth.service';
import { dailyCounts, greeting, sparkPath, topMeals } from '../../shared/utils/dashboard.util';

import { CloudStoreService } from '../../services/cloud-store.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminSidebarComponent, IconComponent],
  template: `
    <div class="admin-layout">
      <app-admin-sidebar></app-admin-sidebar>

      <main class="admin-main-content">
        <div class="admin-container">
          <!-- Welcome banner -->
          <section class="dash-hero">
            <div class="dash-hero-text">
              <h1>{{ greet }}, {{ adminName() }}</h1>
              <p>Here is how the GymPlate marketplace is doing today.</p>
              <div class="dash-hero-actions">
                <a routerLink="/admin/applications" class="btn-hero">
                  <app-icon name="file-text" [size]="14"></app-icon>
                  Review applications ({{ stats.pendingApplications }})
                </a>
                <a routerLink="/admin/reports" class="btn-hero ghost">
                  <app-icon name="bar-chart-2" [size]="14"></app-icon>
                  Platform reports
                </a>
              </div>
            </div>
            <img class="dash-hero-img" *ngIf="heroImage" [src]="heroImage" alt="" />
          </section>

          <!-- Pending applications alert -->
          <div class="pending-alert card mb-6" *ngIf="stats.pendingApplications > 0">
            <app-icon name="alert-triangle" [size]="20" color="#92400E"></app-icon>
            <div class="flex-1">
              <strong class="text-xs block font-semibold">
                {{ stats.pendingApplications }} kitchen application(s) waiting for review
              </strong>
              <p class="text-xs text-secondary mt-1">
                Applicants have submitted government ID and health permits.
              </p>
            </div>
            <a routerLink="/admin/applications" class="btn btn-secondary btn-sm">Open queue</a>
          </div>

          <!-- Stat cards -->
          <div class="dash-stats">
            <div class="card dash-stat">
              <div class="dash-stat-icon"><app-icon name="users" [size]="20" color="var(--color-primary)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Total customers</span>
                <strong class="dash-stat-value">{{ stats.totalCustomers }}</strong>
                <span class="dash-stat-sub">Active ordering accounts</span>
              </div>
            </div>
            <div class="card dash-stat">
              <div class="dash-stat-icon"><app-icon name="store" [size]="20" color="var(--color-primary)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Approved sellers</span>
                <strong class="dash-stat-value">{{ stats.approvedSellers }}</strong>
                <span class="dash-stat-sub">{{ stats.totalSellers }} registered</span>
              </div>
            </div>
            <div class="card dash-stat">
              <div class="dash-stat-icon info"><app-icon name="package" [size]="20" color="var(--color-info)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Active menu items</span>
                <strong class="dash-stat-value">{{ stats.totalProducts }}</strong>
                <span class="dash-stat-sub">Across all kitchens</span>
              </div>
            </div>
            <div class="card dash-stat">
              <div class="dash-stat-icon"><app-icon name="dollar-sign" [size]="20" color="var(--color-primary)"></app-icon></div>
              <div class="dash-stat-body">
                <span class="dash-stat-label">Gross order value</span>
                <strong class="dash-stat-value">{{ stats.totalOrderValue | currency: 'PHP' : 'symbol' : '1.0-0' }}</strong>
                <span class="dash-stat-sub">{{ stats.completedOrders }} of {{ stats.totalOrders }} completed</span>
              </div>
              <svg class="dash-spark" viewBox="0 0 96 32" preserveAspectRatio="none" aria-label="Orders in the last 7 days">
                <path [attr.d]="sparkD"></path>
              </svg>
            </div>
          </div>

          <div class="dash-grid">
            <!-- Pending verification -->
            <div class="card dash-panel">
              <div class="dash-panel-head">
                <div>
                  <h3>Pending seller verification</h3>
                  <p>Kitchens waiting for approval</p>
                </div>
                <a routerLink="/admin/applications" class="btn btn-ghost btn-sm">View all</a>
              </div>

              <div class="table-container" *ngIf="pendingApps.length > 0">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Kitchen</th>
                      <th>Submitted</th>
                      <th class="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of pendingApps">
                      <td>
                        <strong class="text-xs">{{ a.businessInfo.businessName }}</strong>
                        <small class="text-secondary block">{{ a.personalInfo.firstName }} {{ a.personalInfo.lastName }} &bull; {{ a.businessInfo.businessType }}</small>
                      </td>
                      <td class="text-xs text-secondary">{{ a.submittedAt | date: 'shortDate' }}</td>
                      <td class="text-right">
                        <a [routerLink]="['/admin/applications', a.id]" class="btn btn-primary btn-sm">Inspect &amp; verify</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="empty-state py-8 text-center" *ngIf="pendingApps.length === 0">
                <app-icon name="check-circle" [size]="32" color="var(--color-success)"></app-icon>
                <p class="text-xs text-secondary mt-2">All applications have been reviewed.</p>
              </div>
            </div>

            <!-- Right column -->
            <div class="side-stack">
              <div class="card dash-panel">
                <div class="dash-panel-head">
                  <div>
                    <h3>Top selling meals</h3>
                    <p>By quantity ordered</p>
                  </div>
                </div>
                <div class="dash-panel-body">
                  <div class="dash-rank-row" *ngFor="let m of topSelling">
                    <img [src]="m.image" [alt]="m.name" />
                    <div class="flex-1">
                      <div class="flex justify-between gap-2">
                        <span class="dash-rank-name">{{ m.name }}</span>
                        <span class="dash-rank-meta">{{ m.qty }} orders</span>
                      </div>
                      <div class="dash-bar"><span [style.width.%]="(m.qty / maxQty) * 100"></span></div>
                    </div>
                  </div>
                  <p class="text-xs text-secondary" *ngIf="topSelling.length === 0">No orders yet.</p>
                </div>
              </div>

              <div class="card dash-panel">
                <div class="dash-panel-head">
                  <div>
                    <h3>Recent activity</h3>
                    <p>Logged administrator actions</p>
                  </div>
                  <a routerLink="/admin/activity-logs" class="btn btn-ghost btn-sm">Full log</a>
                </div>
                <div class="dash-panel-body">
                  <div class="activity-row" *ngFor="let log of recentLogs">
                    <div class="act-dot"></div>
                    <div class="act-content">
                      <div class="flex justify-between items-center gap-2">
                        <strong class="text-xs">{{ log.action }}</strong>
                        <small class="text-tertiary">{{ log.timestamp | date: 'short' }}</small>
                      </div>
                      <p class="text-xs text-secondary mt-1">{{ log.details }}</p>
                      <small class="text-tertiary block mt-1" *ngIf="log.reason">Reason: {{ log.reason }}</small>
                    </div>
                  </div>
                  <p class="text-xs text-secondary" *ngIf="recentLogs.length === 0">No activity yet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .admin-layout { background: var(--color-bg-secondary); }
      .pending-alert {
        padding: var(--space-3) var(--space-5);
        background: #fff8e7;
        border: 1px solid #f0ad4e;
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-6);
      }
      .side-stack { display: flex; flex-direction: column; gap: var(--space-6); }
      .activity-row {
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
        padding: var(--space-3) 0;
        border-bottom: 1px solid var(--color-border);
      }
      .activity-row:last-child { border-bottom: none; }
      .act-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); margin-top: 5px; flex-shrink: 0; }
      .act-content { flex: 1; min-width: 0; }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private cloud = inject(CloudStoreService);

  // Reload this screen whenever Firestore data changes (new application, approval, etc.).
  private liveRefresh = effect(() => {
    this.cloud.version();
    untracked(() => this.ngOnInit());
  });

  stats = {
    totalCustomers: 0,
    totalSellers: 0,
    pendingApplications: 0,
    approvedSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalOrderValue: 0,
  };
  pendingApps: SellerApplication[] = [];
  recentLogs: ActivityLog[] = [];
  greet = greeting();
  sparkD = '';
  topSelling: { name: string; image: string; qty: number }[] = [];
  maxQty = 1;
  heroImage = '';

  constructor(
    private adminService: AdminService,
    private mockData: MockDataService,
    private authService: AuthService,
  ) {}

  adminName(): string {
    return this.authService.user()?.firstName || 'Admin';
  }

  ngOnInit() {
    this.stats = this.adminService.getDashboardStats();
    this.pendingApps = this.mockData.getSellerApplications().filter((a) => a.status === 'pending');
    this.recentLogs = this.adminService.getActivityLogs().slice(0, 6);

    const orders = this.mockData.getOrders();
    this.sparkD = sparkPath(dailyCounts(orders, 7), 96, 32);
    this.topSelling = topMeals(orders, 3);
    this.maxQty = Math.max(1, ...this.topSelling.map((m) => m.qty));
    this.heroImage = this.mockData.getProducts().find((p) => !p.isArchived)?.imageUrl || '';
  }
}
