import { useAuth } from '../hooks/useAuth';

const Icon = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{name}</span>
);

const TopBar = ({ onMenu }) => {
  const { user } = useAuth();

  return (
    <header className="md:hidden flex justify-between items-center w-full px-margin-mobile h-16 glass-bg border-b border-border-subtle sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-2">
        <button onClick={onMenu} className="text-on-surface-variant p-2 rounded-lg hover:bg-surface-variant">
          <Icon name="menu" />
        </button>
        <div className="font-headline-md font-bold text-primary flex items-center gap-2">
          <Icon name="psychology" className="text-primary" />
          CareerMind.AI
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-bright/50 transition-colors">
          <Icon name="local_fire_department" className="text-lg" />
        </button>
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-bright/50 transition-colors relative">
          <Icon name="notifications" className="text-lg" />
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-variant border border-border-subtle flex items-center justify-center text-on-surface font-bold text-sm">
          {user && user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
};

export default TopBar;