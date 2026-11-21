import { Component, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { MockDataService } from '../../services/mock-data.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from './icon.component';
import { PortalHeaderComponent, PortalNotice } from './portal-header.component';
import { PORTAL_SIDEBAR_STYLES } from './portal-sidebar.styles';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, PortalHeaderComponent],
  template: `
    <app-portal-header
      portalLabel="Admin"
      homeLink="/admin"
      accountLink="/admin/settings"
      accountLabel="System Settings"
      [userName]="userName()"
      [userEmail]="userEmail()"
      [photoUrl]="userPhoto()"
      [notices]="notices()"
      [unread]="unreadCount()"
      viewAllLink="/admin/activity-logs"
      viewAllLabel="View activity logs"
      (menuToggle)="onMenuToggle()"
      (markAllRead)="markAllRead()"
      (noticeOpened)="noticeOpened($event)"
      (logout)="logout()"
    ></app-portal-header>

    <div class="drawer-backdrop" *ngIf="isMobileDrawerOpen()" (click)="closeMobileDrawer()"></div>

    <aside
      class="sidebar"
      [class.collapsed]="isCollapsed()"
      [class.mobile-open]="isMobileDrawerOpen()"
    >
      <a routerLink="/admin" class="sidebar-brand" (click)="closeMobileDrawer()">
        <app-icon name="utensils" [size]="24" color="#9bd3ae"></app-icon>
        <span *ngIf="!isCollapsed()">Gym<span class="brand-accent">Plate</span></span>
      </a>

      <div class="profile-card" *ngIf="!isCollapsed() || isMobileDrawerOpen()">
        <div class="profile-avatar">
          <img *ngIf="userPhoto()" [src]="userPhoto()" alt="" />
          <span *ngIf="!userPhoto()">{{ initials() }}</span>
        </div>
        <span class="profile-name">{{ userName() }}</span>
        <span class="role-badge">Administrator</span>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <div class="nav-section-title" *ngIf="!isCollapsed()">Overview</div>

        <a
          routerLink="/admin"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="closeMobileDrawer()"
          [title]="'Dashboard'"
        >
          <app-icon name="layout-dashboard" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Dashboard</span>
        </a>

        <div class="nav-section-title" *ngIf="!isCollapsed()">Verification & Approvals</div>

        <a
          routerLink="/admin/applications"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Seller Applications'"
        >
          <div class="icon-with-badge">
            <app-icon name="file-text" [size]="18"></app-icon>
            <span class="sub-badge" *ngIf="pendingApplicationsCount() > 0 && isCollapsed()">{{
              pendingApplicationsCount()
            }}</span>
          </div>
          <span class="link-label" *ngIf="!isCollapsed()">Seller Applications</span>
          <span
            class="count-pill warning-pill"
            *ngIf="!isCollapsed() && pendingApplicationsCount() > 0"
            >{{ pendingApplicationsCount() }}</span
          >
        </a>

        <div class="nav-section-title" *ngIf="!isCollapsed()">Platform Management</div>

        <a
          routerLink="/admin/sellers"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Sellers'"
        >
          <app-icon name="store" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Sellers</span>
        </a>

        <a
          routerLink="/admin/customers"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Customers'"
        >
          <app-icon name="users" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Customers</span>
        </a>

        <a
          routerLink="/admin/products"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Products Moderation'"
        >
          <app-icon name="package" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Products</span>
        </a>

        <a
          routerLink="/admin/food-reports"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Food & Order Reports'"
        >
          <app-icon name="alert-triangle" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Food Reports</span>
        </a>

        <div class="nav-section-title" *ngIf="!isCollapsed()">Insights & Security</div>

        <a
          routerLink="/admin/reports"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Reports & Analytics'"
        >
          <app-icon name="bar-chart-2" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Reports & Analytics</span>
        </a>

        <a
          routerLink="/admin/activity-logs"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'Activity Logs'"
        >
          <app-icon name="activity" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Activity Logs</span>
        </a>

        <a
          routerLink="/admin/settings"
          routerLinkActive="active"
          (click)="closeMobileDrawer()"
          [title]="'System Settings'"
        >
          <app-icon name="settings" [size]="18"></app-icon>
          <span class="link-label" *ngIf="!isCollapsed()">Settings</span>
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
export class AdminSidebarComponent implements OnDestroy {
  isCollapsed = signal(false);
  isMobileDrawerOpen = signal(false);

  constructor(
    private authService: AuthService,
    private mockData: MockDataService,
    private adminService: AdminService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnDestroy() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('admin-sidebar-collapsed');
    }
  }

  onMenuToggle() {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) this.toggleMobileDrawer();
    else this.toggleCollapse();
  }

  userEmail(): string {
    return this.authService.user()?.email || '';
  }

  userPhoto(): string {
    return this.authService.user()?.avatarUrl || '';
  }

  initials(): string {
    const u = this.authService.user();
    return u ? `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase() : 'A';
  }

  private noticeCache: PortalNotice[] = [];
  private noticeKey = '';

  /** Same array is returned until the notifications change. */
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

  unreadCount(): number {
    return this.notificationService.getUnreadCount();
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  noticeOpened(n: PortalNotice) {
    this.notificationService.markAsRead(n.id);
  }

  toggleCollapse() {
    this.isCollapsed.update((v) => !v);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('admin-sidebar-collapsed', this.isCollapsed());
    }
  }

  toggleMobileDrawer() {
    this.isMobileDrawerOpen.update((v) => !v);
  }

  closeMobileDrawer() {
    this.isMobileDrawerOpen.set(false);
  }

  userName(): string {
    const u = this.authService.user();
    return u ? `${u.firstName} ${u.lastName}` : 'Administrator';
  }

  pendingApplicationsCount(): number {
    return this.mockData.getSellerApplications().filter((a) => a.status === 'pending').length;
  }

  logout() {
    this.authService.logout();
  }
}
