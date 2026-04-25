import { useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const rolePermissions = {
  'Super Admin': null,
  'AudioVisual': ['/events', '/announcements', '/volunteers', '/media-audio', '/media-library', '/live-streaming', '/sermons', '/graphics', '/bible'],
  'Accountant': ['/donations', '/finance', '/reports', '/accountant', '/budget', '/expenses', '/invoicing', '/bible'],
  'Clerk': ['/members', '/families', '/reports', '/finance', '/volunteers', '/attendance', '/member-registration', '/events', '/announcements', '/clerk', '/visitors', '/bible'],
  'Member': ['/bible', '/member-dashboard']
};

const baseMenuItems = [
  { to: "/dashboard", label: "Dashboard", icon: "grid" },
  { to: "/bible", label: "Bible", icon: "book" },
  { to: "/events", label: "Services", icon: "calendar" },
  { to: "/attendance", label: "Activity", icon: "check" },
  { to: "/announcements", label: "Document", icon: "message" },
  { to: "/volunteers", label: "Worship", icon: "serve" },
  { to: "/donations", label: "Donate", icon: "gift" },
  { to: "/finance", label: "Payment", icon: "wallet" },
  { to: "/settings", label: "Notifications", icon: "gear" },
  { to: "/member-registration", label: "Account", icon: "form" }
];

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Loading church data...</p>
    </div>
  );
}

export default function AppShell({ bootstrap, children, onLogout, session }) {
  const location = useLocation();
  
  const allowedPaths = useMemo(() => {
    return rolePermissions[session?.role] || [];
  }, [session?.role]);

  const hasAccess = (path) => allowedPaths == null || allowedPaths.length === 0 || allowedPaths.includes(path);

  const userSubmenu = useMemo(() => {
    return [
      { to: "/members", label: "Members" },
      { to: "/families", label: "Family Members" },
      { to: "/finance", label: "Accountant" },
      { to: "/reports", label: "Groups" },
      { to: "/volunteers", label: "Ministry" }
    ].filter(item => hasAccess(item.to));
  }, [allowedPaths]);

  const menuItems = useMemo(() => {
    return baseMenuItems.filter(item => hasAccess(item.to));
  }, [allowedPaths]);

  const pageTitle = useMemo(() => {
    if (
      location.pathname.startsWith("/members") ||
      location.pathname.startsWith("/families") ||
      location.pathname.startsWith("/reports")
    ) {
      return "Users";
    }

    const match = menuItems.find((item) => item.to === location.pathname);
    return match?.label || "Dashboard";
  }, [location.pathname, menuItems]);

  const userMenuOpen =
    location.pathname.startsWith("/members") ||
    location.pathname.startsWith("/families") ||
    location.pathname.startsWith("/reports") ||
    location.pathname.startsWith("/finance") ||
    location.pathname.startsWith("/volunteers");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="sidebar-brand">
          <div className="sidebar-brand-mark presby-sidebar-mark">
            <span className="sidebar-shield"></span>
          </div>
          <div>
            <strong>REDEMPTION PRESBY</strong>
            <span>NEW GBAWE DISTRICT</span>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
          >
            <span className="nav-icon nav-icon-grid"></span>
            <span>Dashboard</span>
          </NavLink>

          <div className={`nav-flyout-group ${userMenuOpen ? "is-open" : ""}`}>
            <button type="button" className="nav-item nav-parent">
              <span className="nav-icon nav-icon-people"></span>
              <span>Users</span>
              <span className="nav-chevron">›</span>
            </button>

            <div className="nav-flyout-menu">
              {userSubmenu.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `flyout-link ${isActive ? "is-active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {menuItems
            .filter((item) => item.to !== "/dashboard")
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
              >
                <span className={`nav-icon nav-icon-${item.icon}`}></span>
                <span>{item.label}</span>
                <span className="nav-chevron">›</span>
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-footer-profile">
          <div className="avatar-circle">{session?.name?.charAt(0) || "A"}</div>
          <div>
            <strong>{session?.name || "Administrator"}</strong>
            <span>{session?.role || "Super Admin"}</span>
          </div>
          <button className="sidebar-logout" onClick={onLogout} type="button">
            Log Out
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
          </div>

          <div className="topbar-actions">
            <button className="topbar-icon-button" type="button">
              🔔
            </button>
            <div className="profile-chip">
              <span className="avatar-circle">{session?.name?.charAt(0) || "A"}</span>
            </div>
          </div>
        </header>

        {bootstrap.error ? <div className="alert-banner">{bootstrap.error}</div> : null}
        {bootstrap.loading ? <LoadingState /> : children}
      </div>
    </div>
  );
}