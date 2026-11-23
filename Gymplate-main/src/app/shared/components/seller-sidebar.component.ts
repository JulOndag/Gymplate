import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';
import { NotificationService } from '../../services/notification.service';
import { OrderService } from '../../services/order.service';
import { IconComponent } from './icon.component';
import { PortalHeaderComponent, PortalNotice } from './portal-header.component';
import { PORTAL_SIDEBAR_STYLES } from './portal-sidebar.styles';

@Component({
  selector: 'app-seller-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, PortalHeaderComponent],
  template: `
    <!-- Top bar (same as the customer portal) -->
    <app-portal-header
      portalLabel="Seller"
      homeLink="/seller"
      accountLink="/seller/settings"
      accountLabel="Kitchen Settings"
      [userName]="businessName()"
      [userEmail]="userEmail()"
      [photoUrl]="userPhoto()"
      [notices]="notices()"
      [unread]="unreadCount()"
      viewAllLink="/seller/notifications"
      viewAllLabel="View all notifications"
      (menuToggle)="onMenuToggle()"
      (markAllRead)="markAllRead()"
      (noticeOpened)="noticeOpened($event)"
      (logout)="logout()"
    ></app-portal-header>

    <!-- Backdrop for mobile drawer -->
    <div class="drawer-backdrop" *ngIf="isMobileDrawerOpen()" (click)="closeMobileDrawer()"></div>

    <!-- Main Sidebar Container -->
    <aside
      class="sidebar"
      [class.collapsed]="isCollapsed()"
      [class.mobile-open]="isMobileDrawerOpen()"
    >
      <a routerLink="/seller" class="sidebar-brand" (click)="closeMobileDrawer()">
        <app-icon name="leaf" [size]="34" color="#ffffff"></app-icon>
        <span *ngIf="!isCollapsed()">Gym<span class="brand-accent">Plate</span></span>
      </a>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <div class="nav-section-title" *ngIf="!isCollapsed()">Store Management</div>

        <a
          routerLink="/seller"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Dashboard'"
        >
          <app-icon name="layout-dashboard" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Dashboard</span>
        </a>

        <a
          routerLink="/seller/products"
          [class.active]="isProductsActive()"
          (click)="closeMobileDrawer()"
          [title]="'My Products'"
        >
          <app-icon name="package" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">My Products</span>
        </a>

        <a
          routerLink="/seller/products/add"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Add Product'"
          [class.disabled-link]="sellerStatus() !== 'approved'"
        >
          <app-icon name="plus-circle" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Add Product</span>
        </a>

        <a
          routerLink="/seller/orders"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Orders'"
        >
          <app-icon name="clipboard-list" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Orders</span>
        </a>

        <a
          routerLink="/seller/inventory"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Inventory'"
        >
          <app-icon name="box" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Inventory</span>
        </a>

        <div class="nav-section-title" *ngIf="!isCollapsed()">Analytics & Performance</div>

        <a
          routerLink="/seller/reports"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Sales & Reports'"
        >
          <app-icon name="bar-chart-2" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Sales & Reports</span>
        </a>

        <a
          routerLink="/seller/reviews"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Customer Reviews'"
        >
          <app-icon name="star" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Customer Reviews</span>
        </a>

        <a
          routerLink="/seller/customer-reports"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Customer Reports'"
        >
          <app-icon name="alert-triangle" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Customer Reports</span>
        </a>

        <div class="nav-section-title" *ngIf="!isCollapsed()">Account & Store</div>

        <a
          routerLink="/seller/business"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Business Profile'"
        >
          <app-icon name="store" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Business Profile</span>
        </a>

        <a
          routerLink="/seller/notifications"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Notifications'"
        >
          <div class="icon-with-badge">
            <app-icon name="bell" [size]="18"></app-icon>
            <span class="sub-badge" *ngIf="unreadCount() > 0 && isCollapsed()">{{
              unreadCount()
            }}</span>
          </div>
          <span class="link-label" *ngIf="!isCollapsed()">Notifications</span>
          <span class="count-pill" *ngIf="!isCollapsed() && unreadCount() > 0">{{
            unreadCount()
          }}</span>
        </a>

        <a
          routerLink="/seller/settings"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Settings'"
        >
          <app-icon name="settings" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Settings</span>
        </a>

        <a
          *ngIf="sellerStatus() !== 'approved'"
          routerLink="/seller/pending"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Application Status'"
          class="highlight-link"
        >
          <app-icon name="alert-circle" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Application Status</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <button type="button" class="logout-btn" (click)="logout()" title="Log out">
          <app-icon name="log-out" [size]="18"></app-icon>
          <span *ngIf="!isCollapsed()">Log out</span>
        </button>
      </div>
    </aside>
  `,
  styles: [PORTAL_SIDEBAR_STYLES],
})
export class SellerSidebarComponent implements OnInit, OnDestroy {
  isCollapsed = signal(false);
  isMobileDrawerOpen = signal(false);

  constructor(
    private authService: AuthService,
    private sellerService: SellerService,
    private notificationService: NotificationService,
    private orderService: OrderService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.orderService.startAutoReady(); // moves orders to Ready when their prep time is up
    this.syncLayoutState();
  }

  ngOnDestroy() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('seller-sidebar-collapsed');
      document.body.classList.remove('drawer-open');
    }
  }

  isProductsActive(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/seller/products' || url.startsWith('/seller/products/edit');
  }

  toggleCollapse() {
    this.isCollapsed.update((v) => !v);
    this.syncLayoutState();
  }

  private syncLayoutState() {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('seller-sidebar-collapsed', this.isCollapsed());
    }
  }

  toggleMobileDrawer() {
    this.isMobileDrawerOpen.update((v) => !v);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('drawer-open', this.isMobileDrawerOpen());
    }
  }

  closeMobileDrawer() {
    this.isMobileDrawerOpen.set(false);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('drawer-open');
    }
  }

  onMenuToggle() {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) this.toggleMobileDrawer();
    else this.toggleCollapse();
  }

  userEmail(): string {
    return this.authService.user()?.email || '';
  }

  initials(): string {
    const parts = this.businessName().trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || 'S') + (parts[1]?.[0] || '')).toUpperCase();
  }

  userPhoto(): string {
    const user = this.authService.user();
    if (!user) return '';
    // [PROFILE-PHOTO] their own picture first; otherwise the kitchen logo from the application
    return user.avatarUrl || this.sellerService.getKitchenLogo(user.id);
  }

  private noticeCache: PortalNotice[] = [];
  private noticeKey = '';

  /** Same array is returned until the notifications change (avoids Angular's "changed after checked" error). */
  notices(): PortalNotice[] {
    const next: PortalNotice[] = this.notificationService
      .getNotifications()
      .slice(0, 5)
      .map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        time: n.createdAt,
        unread: !n.isRead,
        link: n.link,
      }));
    const key = next.map((n) => n.id + (n.unread ? '1' : '0')).join('|');
    if (key !== this.noticeKey) {
      this.noticeKey = key;
      this.noticeCache = next;
    }
    return this.noticeCache;
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  noticeOpened(n: PortalNotice) {
    this.notificationService.markAsRead(n.id);
  }

  userName(): string {
    const u = this.authService.user();
    return u ? `${u.firstName} ${u.lastName}` : 'Seller';
  }

  businessName(): string {
    const user = this.authService.user();
    if (!user) return 'Seller Kitchen';
    // [PROFILE-PHOTO] works before approval too (the name written in the application)
    return this.sellerService.getKitchenName(user.id) || 'Kitchen Portal';
  }

  sellerStatus(): string {
    const user = this.authService.user();
    if (!user) return 'pending';
    const app = this.sellerService.getApplication(user.id);
    return app?.status || 'approved';
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      approved: 'Approved',
      pending: 'Pending Review',
      rejected: 'Rejected',
      info_required: 'Info Needed',
    };
    return map[status] || status;
  }

  unreadCount(): number {
    return this.notificationService.getUnreadCount();
  }

  logout() {
    this.authService.logout();
  }
}
