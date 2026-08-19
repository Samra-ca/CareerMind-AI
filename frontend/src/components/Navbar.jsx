import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const S = {
  size: 18,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const ICONS = {
  dashboard: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  user: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  zap: (
    <svg {...S} viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  trend: (
    <svg {...S} viewBox="0 0 24 24">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  target: (
    <svg {...S} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  chat: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  map: (
    <svg {...S} viewBox="0 0 24 24">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  briefcase: (
    <svg {...S} viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  file: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  linkedin: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v2a6 6 0 0 1 2-2z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  mic: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  ),
  kanban: (
    <svg {...S} viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  award: (
    <svg {...S} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  money: (
    <svg {...S} viewBox="0 0 24 24">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  mail: (
    <svg {...S} viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/profile', label: 'Profile', icon: 'user' },
  { to: '/skills', label: 'Skills', icon: 'zap' },
  { to: '/skill-gap', label: 'Skill Gap', icon: 'trend' },
  { to: '/goals', label: 'Goals', icon: 'target' },
  { to: '/chat', label: 'AI Chat', icon: 'chat' },
  { to: '/roadmap', label: 'Roadmap', icon: 'map' },
  { to: '/jobs', label: 'Jobs', icon: 'briefcase' },
  { to: '/resume', label: 'Resume', icon: 'file' },
  { to: '/linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { to: '/interview', label: 'Interview', icon: 'mic' },
  { to: '/applications', label: 'Pipeline', icon: 'kanban' },
  { to: '/achievements', label: 'Achievements', icon: 'award' },
  { to: '/salary', label: 'Salary', icon: 'money' },
  { to: '/cover-letter', label: 'Cover Letter', icon: 'mail' },
];

const ChevronLeft = (
  <svg {...S} viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = (
  <svg {...S} viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const LogoutIcon = (
  <svg {...S} viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const Navbar = ({ collapsed, onToggleCollapse, mobileOpen, onToggleMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onToggleMobile(false);
    navigate('/login');
  };

  return (
    <>
      {user && mobileOpen && <div className="sidebar-backdrop" onClick={() => onToggleMobile(false)} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo" onClick={() => onToggleMobile(false)}>
            <span className="sidebar-logo-icon">C</span>
            {!collapsed && <span className="sidebar-logo-text">CareerMind.AI</span>}
          </Link>
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? ChevronRight : ChevronLeft}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => onToggleMobile(false)}
            >
              <span className="sidebar-icon">{ICONS[item.icon]}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user" title={collapsed ? user.name : undefined}>
              <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
              {!collapsed && (
                <div className="sidebar-user-meta">
                  <strong className="sidebar-user-name">{user.name}</strong>
                  <span className="sidebar-user-email">{user.email}</span>
                </div>
              )}
              {!collapsed && (
                <button className="sidebar-logout" onClick={handleLogout} title="Logout">
                  {LogoutIcon}
                </button>
              )}
            </div>
          ) : (
            !collapsed && (
              <div className="sidebar-auth">
                <NavLink to="/login" className="sidebar-link" onClick={() => onToggleMobile(false)}>
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="sidebar-link sidebar-link-btn"
                  onClick={() => onToggleMobile(false)}
                >
                  Sign Up
                </NavLink>
              </div>
            )
          )}
          {user && collapsed && (
            <button className="sidebar-logout sidebar-logout-full" onClick={handleLogout} title="Logout">
              {LogoutIcon}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Navbar;