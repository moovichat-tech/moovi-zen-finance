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
  const navKey = routeTitles[location.pathname] || 'dashboard';
  const title = t.nav[navKey as keyof typeof t.nav] || 'Moovi';

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-60">
        <TopBar title={title} />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
