import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { BlockedScreen } from '@/components/BlockedScreen';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/': 'dashboard',
  '/income': 'income',
  '/expenses': 'expenses',
  '/cards': 'cards',
  '/accounts': 'accounts',
  '/budget': 'budget',
  '/reports': 'reports',
  '/settings': 'settings',
  '/subscription': 'subscription',
  '/commitments': 'commitments',
  '/open-finance': 'openfinance',
  '/categories': 'categories',
  '/payables': 'payables',
};

export const AppLayout = () => {
  const { t } = useI18n();
  const { statusUsuario } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('moovi-sidebar-collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const navKey = routeTitles[location.pathname] || 'dashboard';
  const title = t.nav[navKey as keyof typeof t.nav] || 'Moovi';

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('moovi-sidebar-collapsed', String(next));
      return next;
    });
  };

  const isBlocked = statusUsuario === 'Inativo';
  const mainContent = isBlocked ? <BlockedScreen /> : <Outlet />;

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader />
        <main className="pt-14 pb-20 px-3 sm:px-4">
          {mainContent}
        </main>
        {!isBlocked && <MobileBottomNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} isDesktop={isDesktop} />
      <div className="transition-all duration-300" style={{ paddingLeft: collapsed ? 60 : 208 }}>
        <TopBar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-3 sm:p-4 md:p-6">{mainContent}</main>
      </div>
    </div>
  );
};
