/** Floating dark-green sidebar shared by the admin and seller portals. */
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
    top: 16px;
    left: 16px;
    bottom: 16px;
    width: var(--sidebar-width);
    background: linear-gradient(180deg, #305f42 0%, #264c35 100%);
    border-radius: 24px;
    box-shadow: 0 14px 34px rgba(30, 67, 46, 0.28);
    color: var(--color-sidebar-text);
    display: flex;
    flex-direction: column;
    z-index: 500;
    transition: width var(--transition);
    overflow-x: hidden;
  }
  .sidebar.collapsed { width: var(--sidebar-collapsed); }

  .sidebar-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 26px var(--space-4) 18px;
    flex-shrink: 0;
    color: #fff;
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .sidebar.collapsed .sidebar-brand { padding: 22px 0 14px; }
  .brand-accent { color: #a8dcb9; }

  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    padding: 11px 14px;
    color: var(--color-sidebar-text);
    text-decoration: none;
    font-size: 13.5px;
    border-radius: 14px;
    transition: background var(--transition-fast), color var(--transition-fast);
    white-space: nowrap;
    position: relative;
  }
  .sidebar.collapsed .sidebar-nav a { justify-content: center; padding: 12px 0; }
  .sidebar-nav a:hover { background: rgba(255, 255, 255, 0.09); color: #fff; }
  .sidebar-nav a.active { background: rgba(255, 255, 255, 0.18); color: #fff; font-weight: 600; }
  .sidebar-nav a:focus-visible,
  .logout-btn:focus-visible { outline: 2px solid #a8dcb9; outline-offset: 1px; }
  .sidebar-nav a.disabled-link { opacity: 0.45; pointer-events: none; }
  .sidebar-nav a.highlight-link { color: #fbd38d; }

  .count-pill {
    margin-left: auto;
    background: #a8dcb9;
    color: #17352a;
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
    margin: 0 var(--space-4);
    padding: var(--space-3) 0 var(--space-4);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }
  .logout-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    border-radius: 14px;
    color: var(--color-sidebar-text);
    font-size: 13.5px;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
  }
  .sidebar.collapsed .logout-btn { justify-content: center; padding: 12px 0; }
  .logout-btn:hover { background: rgba(255, 255, 255, 0.09); color: #fff; }

  @media (max-width: 900px) {
    .drawer-backdrop { display: block; }
    .sidebar {
      top: 12px;
      left: 12px;
      bottom: 12px;
      transform: translateX(calc(-100% - 24px));
      transition: transform var(--transition);
      width: 280px !important;
      z-index: 600;
    }
    .sidebar.mobile-open { transform: translateX(0); }
  }
`;
