import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/chat', label: 'Chat', icon: 'forum' },
  { to: '/skill-gap', label: 'Gap Analysis', icon: 'analytics' },
  { to: '/roadmap', label: 'Roadmap', icon: 'route' },
  { to: '/jobs', label: 'Job Matcher', icon: 'work_outline' },
  { to: '/resume', label: 'Resume', icon: 'description' },
  { to: '/linkedin', label: 'LinkedIn', icon: 'link' },
  { to: '/interview', label: 'Interview', icon: 'record_voice_over' },
  { to: '/cover-letter', label: 'Cover Letter', icon: 'mail' },
  { to: '/salary', label: 'Salary', icon: 'payments' },
  { to: '/applications', label: 'Kanban', icon: 'view_kanban' },
  { to: '/goals', label: 'Goals', icon: 'emoji_events' },
  { to: '/skills', label: 'Skills', icon: 'psychology' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const Sidebar = ({ mobileOpen, onClose }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    onClose?.();
    logout();
  };

  const navList = (
    <nav className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl font-label-md text-label-md transition-all duration-200 group ${
              isActive
                ? 'text-on-primary-container bg-primary-container font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
            }`
          }
        >
          <Icon name={item.icon} className="group-hover:translate-x-1 transition-transform" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 mb-stack-lg px-2">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-container to-tertiary-container flex items-center justify-center shadow-lg shrink-0">
        <Icon name="psychology" className="text-on-primary-container" />
      </div>
      <div>
        <h1 className="font-headline-md font-black text-primary tracking-tight leading-none">
          CareerMind.AI
        </h1>
        <p className="font-label-md text-label-md text-on-surface-variant mt-1">AI Career Strategist</p>
      </div>
    </Link>
  );

  const footer = (
    <div className="mt-auto pt-stack-md space-y-2 border-t border-border-subtle">
      {user && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-high border border-border-subtle">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md text-on-surface truncate">{user.name}</p>
            <p className="font-mono-sm text-[10px] text-on-surface-variant truncate">{user.email}</p>
          </div>
          <button onClick={handleLogout} title="Logout" className="text-on-surface-variant hover:text-error transition-colors p-1">
            <Icon name="logout" className="text-lg" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface-container border-r border-border-subtle flex-col p-stack-md z-40">
        {brand}
        {navList}
        {footer}
      </nav>
      {/* Mobile drawer */}
      <nav
        className={`fixed left-0 top-0 h-screen w-72 bg-surface-container border-r border-border-subtle flex-col p-stack-md z-50 md:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-on-surface-variant p-2 rounded-lg hover:bg-surface-variant">
            <Icon name="close" className="text-lg" />
          </button>
        </div>
        {brand}
        {navList}
        {footer}
      </nav>
    </>
  );
};

export default Sidebar;