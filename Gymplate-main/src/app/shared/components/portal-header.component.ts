import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

/** One bell message. The seller sidebar builds these from the notification service. */
export interface PortalNotice {
  id: string;
  title: string;
  message: string;
  time: Date | string;
  unread: boolean;
  link?: string;
}

/**
 * Top bar used by the seller (and admin) portal.
 * It only DISPLAYS what the parent gives it (@Input) and tells the parent
 * what the person clicked (@Output). It does not load any data itself.
 */
@Component({
  selector: 'app-portal-header',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <header class="portal-header">
      <!-- Left: menu button + brand -->
      <div class="ph-left">
        <button type="button" class="icon-btn" (click)="menuToggle.emit()" aria-label="Toggle menu">
          <app-icon name="menu" [size]="18"></app-icon>
        </button>
        <a class="brand mobile-only" [routerLink]="homeLink">
          <span class="logo-text">Gym</span><span class="logo-accent">Plate</span>
        </a>
        <span class="portal-pill mobile-only" *ngIf="portalLabel">{{ portalLabel }}</span>
        <div class="page-greeting" *ngIf="portalLabel">
          <strong>{{ portalLabel }} portal</strong>
        </div>
      </div>

      <!-- Right: bell + account -->
      <div class="ph-right">
        <!-- Notifications -->
        <div class="menu-wrap">
          <button
            type="button"
            class="icon-btn"
            (click)="toggleNotices()"
            aria-label="Notifications"
          >
            <app-icon name="bell" [size]="18"></app-icon>
            <span class="bell-badge" *ngIf="unread > 0">{{ unread > 9 ? '9+' : unread }}</span>
          </button>

          <div class="dropdown notices-dropdown" *ngIf="noticesOpen()">
            <div class="dd-head">
              <strong>Notifications</strong>
              <button
                type="button"
                class="link-btn"
                *ngIf="unread > 0"
                (click)="markAllRead.emit()"
              >
                Mark all read
              </button>
            </div>

            <div class="notice-list" *ngIf="notices.length > 0">
              <button
                type="button"
                class="notice-item"
                *ngFor="let n of notices"
                [class.unread]="n.unread"
                (click)="openNotice(n)"
              >
                <span class="dot" *ngIf="n.unread"></span>
                <span class="notice-body">
                  <span class="notice-title">{{ n.title }}</span>
                  <span class="notice-msg">{{ n.message }}</span>
                  <span class="notice-time">{{ n.time | date: 'MMM d, h:mm a' }}</span>
                </span>
              </button>
            </div>

            <div class="empty" *ngIf="notices.length === 0">No notifications yet.</div>

            <a class="dd-foot" [routerLink]="viewAllLink" (click)="closeAll()">{{
              viewAllLabel || 'View all'
            }}</a>
          </div>
        </div>

        <!-- Account -->
        <div class="menu-wrap">
          <button
            type="button"
            class="account-btn"
            (click)="toggleAccount()"
            aria-label="Account menu"
          >
            <span class="avatar">
              <img *ngIf="photoUrl" [src]="photoUrl" alt="" />
              <span *ngIf="!photoUrl">{{ initials() }}</span>
            </span>
            <span class="account-name">{{ userName }}</span>
            <app-icon name="chevron-down" [size]="14"></app-icon>
          </button>

          <div class="dropdown account-dropdown" *ngIf="accountOpen()">
            <div class="dd-head column">
              <strong>{{ userName }}</strong>
              <small>{{ userEmail }}</small>
            </div>
            <a class="dd-link" [routerLink]="accountLink" (click)="closeAll()">
              <app-icon name="settings" [size]="15"></app-icon>
              {{ accountLabel || 'Account settings' }}
            </a>
            <button type="button" class="dd-link danger" (click)="onLogout()">
              <app-icon name="log-out" [size]="15"></app-icon>
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      /* Fixed to the top so it never changes the layout of the sidebar or the page. */
      .portal-header {
        position: fixed;
        top: 0;
        left: calc(var(--sidebar-width) + 32px);
        right: 0;
        height: var(--nav-height);
        z-index: 400;
        transition: left var(--transition);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: 8px var(--space-4) 0 0;
        background: linear-gradient(to bottom, rgba(236, 242, 232, 0.96) 70%, rgba(236, 242, 232, 0));
      }
      .ph-left,
      .ph-right {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
      }

      :host-context(body.seller-sidebar-collapsed) .portal-header,
      :host-context(body.admin-sidebar-collapsed) .portal-header {
        left: calc(var(--sidebar-collapsed) + 32px);
      }
      .mobile-only {
        display: none;
      }
      .page-greeting {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }
      .page-greeting strong {
        color: var(--color-text);
        font-weight: 600;
      }
      .brand {
        font-weight: 700;
        font-size: var(--font-size-lg);
        text-decoration: none;
      }
      .logo-text {
        color: var(--color-text);
      }
      .logo-accent {
        color: var(--color-primary);
      }
      .portal-pill {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: var(--color-primary-light);
        color: var(--color-primary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .icon-btn {
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: 14px;
        box-shadow: 0 2px 10px rgba(45, 90, 61, 0.1);
        color: var(--color-text);
        cursor: pointer;
      }
      .icon-btn:hover {
        background: var(--color-primary-lighter);
      }
      .icon-btn:focus-visible,
      .account-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
      .bell-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: var(--radius-full);
        background: var(--color-danger);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .menu-wrap {
        position: relative;
      }
      .account-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        background: #fff;
        border: 1px solid rgba(255, 255, 255, 0.95);
        border-radius: var(--radius-full);
        box-shadow: 0 2px 10px rgba(45, 90, 61, 0.1);
        padding: 4px 12px 4px 4px;
        cursor: pointer;
        color: var(--color-text);
      }
      .account-btn:hover {
        background: var(--color-primary-lighter);
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--color-primary-light);
        color: var(--color-primary);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .account-name {
        font-size: var(--font-size-xs);
        font-weight: 600;
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 320px;
        max-width: calc(100vw - 24px);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md, 10px);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
      }
      .account-dropdown {
        width: 240px;
      }
      .dd-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid var(--color-border);
        font-size: var(--font-size-xs);
      }
      .dd-head.column {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .dd-head small {
        color: var(--color-text-secondary);
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }

      .notice-list {
        max-height: 320px;
        overflow-y: auto;
      }
      .notice-item {
        width: 100%;
        display: flex;
        gap: 8px;
        align-items: flex-start;
        text-align: left;
        padding: 10px 14px;
        background: none;
        border: none;
        border-bottom: 1px solid var(--color-border);
        cursor: pointer;
      }
      .notice-item:hover {
        background: var(--color-bg-secondary);
      }
      .notice-item.unread {
        background: var(--color-primary-lighter, #f1f7f3);
      }
      .dot {
        width: 8px;
        height: 8px;
        margin-top: 5px;
        border-radius: 50%;
        background: var(--color-primary);
        flex-shrink: 0;
      }
      .notice-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .notice-title {
        font-size: var(--font-size-xs);
        font-weight: 600;
        color: var(--color-text);
      }
      .notice-msg {
        font-size: 11px;
        color: var(--color-text-secondary);
        line-height: 1.35;
      }
      .notice-time {
        font-size: 10px;
        color: var(--color-text-tertiary);
      }
      .empty {
        padding: 18px 14px;
        text-align: center;
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
      }
      .dd-foot {
        display: block;
        text-align: center;
        padding: 9px;
        font-size: var(--font-size-xs);
        font-weight: 600;
        color: var(--color-primary);
        text-decoration: none;
        border-top: 1px solid var(--color-border);
      }

      .dd-link {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: none;
        border: none;
        text-decoration: none;
        font-size: var(--font-size-xs);
        color: var(--color-text);
        cursor: pointer;
        text-align: left;
      }
      .dd-link:hover {
        background: var(--color-bg-secondary);
      }
      .dd-link.danger {
        color: var(--color-danger);
      }

      @media (max-width: 900px) {
        .portal-header,
        :host-context(body.seller-sidebar-collapsed) .portal-header,
        :host-context(body.admin-sidebar-collapsed) .portal-header {
          left: 0;
          padding-left: var(--space-3);
          padding-right: var(--space-3);
        }
        .mobile-only {
          display: inline-flex;
        }
        .page-greeting {
          display: none;
        }
      }
      @media (max-width: 600px) {
        .account-name,
        .portal-pill {
          display: none;
        }
      }
    `,
  ],
})
export class PortalHeaderComponent {
  // ─── What the parent gives us ────────────────────────────────────────
  @Input() portalLabel = '';
  @Input() homeLink = '/';
  @Input() accountLink = '/';
  @Input() accountLabel = '';
  @Input() userName = '';
  @Input() userEmail = '';
  @Input() photoUrl = '';
  @Input() notices: PortalNotice[] = [];
  @Input() unread = 0;
  @Input() viewAllLink = '/';
  @Input() viewAllLabel = '';

  // ─── What we tell the parent ─────────────────────────────────────────
  @Output() menuToggle = new EventEmitter<void>();
  @Output() markAllRead = new EventEmitter<void>();
  @Output() noticeOpened = new EventEmitter<PortalNotice>();
  @Output() logout = new EventEmitter<void>();

  noticesOpen = signal(false);
  accountOpen = signal(false);

  private host = inject(ElementRef<HTMLElement>);
  private router = inject(Router);

  initials(): string {
    const parts = this.userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  toggleNotices() {
    this.noticesOpen.update((v) => !v);
    this.accountOpen.set(false);
  }

  toggleAccount() {
    this.accountOpen.update((v) => !v);
    this.noticesOpen.set(false);
  }

  closeAll() {
    this.noticesOpen.set(false);
    this.accountOpen.set(false);
  }

  openNotice(n: PortalNotice) {
    this.noticeOpened.emit(n);
    this.closeAll();
    if (n.link) this.router.navigateByUrl(n.link);
  }

  onLogout() {
    this.closeAll();
    this.logout.emit();
  }

  /** Click anywhere outside the header closes the dropdowns. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closeAll();
  }
}
