/** Dark-green sidebar look shared by the admin and seller portals. */
export const PORTAL_SIDEBAR_STYLES = `
  :host { display: block; }

  .drawer-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 250;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--sidebar-width);
    background: var(--color-sidebar);
    color: var(--color-sidebar-text);
    display: flex;
    flex-direction: column;
    z-index: 500;
    transition: width var(--transition);
    overflow-x: hidden;
  }
  .sidebar.collapsed { width: var(--sidebar-collapsed); }

  .sidebar-brand {
    height: var(--nav-height);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 var(--space-5);
    flex-shrink: 0;
    color: #fff;
    text-decoration: none;
    font-size: var(--font-size-lg);
    font-weight: 700;
  }
  .sidebar.collapsed .sidebar-brand { justify-content: center; padding: 0; }
  .brand-accent { color: #9bd3ae; }

  .profile-card {
    margin: var(--space-2) var(--space-4) var(--space-3);
    padding: var(--space-4) var(--space-3);
    border-radius: var(--radius-lg);
    background: rgba(255, 255, 255, 0.07);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }
  .profile-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    background: #fff;
    color: var(--color-primary);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .profile-name {
    color: #fff;
    font-size: var(--font-size-sm);
    font-weight: 600;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .role-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: var(--radius-full);
    background: #9bd3ae;
    color: var(--color-sidebar-deep);
  }
  .status-chip {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }
  .status-approved { background: rgba(155, 211, 174, 0.2); color: #b8e6c7; }
  .status-pending { background: rgba(240, 173, 78, 0.22); color: #fbd38d; }
  .status-rejected { background: rgba(220, 53, 69, 0.25); color: #fca5a5; }
  .status-info_required { background: rgba(59, 130, 246, 0.25); color: #bfdbfe; }
  .status-alert { font-size: 11px; line-height: 1.35; color: var(--color-sidebar-text); }
  .sidebar.collapsed .profile-card { display: none; }

  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-section-title {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    font-weight: 600;
    padding: var(--space-4) var(--space-3) var(--space-1);
  }
  .sidebar-nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    color: var(--color-sidebar-text);
    text-decoration: none;
    font-size: 13px;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast), color var(--transition-fast);
    white-space: nowrap;
    position: relative;
  }
  .sidebar.collapsed .sidebar-nav a { justify-content: center; padding: 10px 0; }
  .sidebar-nav a:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
  .sidebar-nav a.active { background: var(--color-sidebar-active); color: #fff; font-weight: 600; }
  .sidebar-nav a:focus-visible,
  .logout-btn:focus-visible { outline: 2px solid #9bd3ae; outline-offset: 1px; }
  .sidebar-nav a.disabled-link { opacity: 0.45; pointer-events: none; }
  .sidebar-nav a.highlight-link { color: #fbd38d; }

  .count-pill {
    margin-left: auto;
    background: #9bd3ae;
    color: var(--color-sidebar-deep);
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: var(--radius-full);
  }
  .warning-pill { background: #fbd38d; color: #78350f; }
  .icon-with-badge { position: relative; display: inline-flex; }
  .sub-badge {
    position: absolute;
    top: -5px;
    right: -7px;
    background: #fbd38d;
    color: #78350f;
    font-size: 9px;
    font-weight: 700;
    min-width: 14px;
    height: 14px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-footer {
    padding: var(--space-3) var(--space-3) var(--space-4);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .logout-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 12px;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-sidebar-text);
    font-size: 13px;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
  }
  .sidebar.collapsed .logout-btn { justify-content: center; padding: 10px 0; }
  .logout-btn:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }

  @media (max-width: 900px) {
    .drawer-backdrop { display: block; }
    .sidebar {
      transform: translateX(-100%);
      transition: transform var(--transition);
      width: 280px !important;
      z-index: 600;
    }
    .sidebar.mobile-open { transform: translateX(0); box-shadow: var(--shadow-xl); }
    .sidebar.collapsed .profile-card { display: flex; }
  }
`;
