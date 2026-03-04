import { useI18n } from '@/i18n/context';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Landmark,
  Target,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Crown,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'income', path: '/income', icon: TrendingUp },
  { key: 'expenses', path: '/expenses', icon: TrendingDown },
  { key: 'cards', path: '/cards', icon: CreditCard },
  { key: 'accounts', path: '/accounts', icon: Landmark },
  { key: 'budget', path: '/budget', icon: Target },
  { key: 'reports', path: '/reports', icon: BarChart3 },
  { key: 'ai', path: '/ai', icon: Sparkles },
] as const;

export const AppSidebar = () => {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">M</span>
        </div>
        <span className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">Moovi</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map(({ key, path, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.nav[key as keyof typeof t.nav]}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
        <button
          onClick={() => navigate('/subscription')}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            location.pathname === '/subscription'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Crown className="h-4 w-4" />
          {t.nav.subscription}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            location.pathname === '/settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
          }`}
        >
          <Settings className="h-4 w-4" />
          {t.nav.settings}
        </button>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          {t.nav.logout}
        </button>
      </div>
    </aside>
  );
};
