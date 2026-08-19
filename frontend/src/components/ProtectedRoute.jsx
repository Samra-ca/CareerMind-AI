import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const AppShell = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-background text-on-surface font-body-md antialiased flex overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden min-w-0">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-background relative">{children}</main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant font-label-md">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

export default ProtectedRoute;