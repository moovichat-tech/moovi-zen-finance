import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useI18n } from '@/i18n/context';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/': 'dashboard',
  '/income': 'income',
  '/expenses': 'expenses',
  '/cards': 'cards',
  '/accounts': 'accounts',
  '/budget': 'budget',
  '/reports': 'reports',
  '/ai': 'ai',
  '/settings': 'settings',
  '/subscription': 'subscription',
};

export const AppLayout = () => {
  const { t } = useI18n();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('moovi-sidebar-collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const navKey = routeTitles[location.pathname] || 'dashboard';
  const title = t.nav[navKey as keyof typeof t.nav] || 'Moovi';

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('moovi-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <AppSidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={`transition-all duration-300 lg:${collapsed ? 'pl-[60px]' : 'pl-52'}`} style={{ paddingLeft: undefined }}>
        <div className={`hidden lg:block`}>
          <div className={`transition-all duration-300 ${collapsed ? 'pl-[60px]' : 'pl-52'}`}>
          </div>
        </div>
        <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[60px]' : 'lg:pl-52'}`}>
          <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
          <main className="p-3 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
