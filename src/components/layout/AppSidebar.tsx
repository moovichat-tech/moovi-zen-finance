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
  Tag,
  PanelLeftClose,
  PanelLeft,
  ClipboardList,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import mooviLogo from '@/assets/moovi-logo.jpeg';

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'income', path: '/income', icon: TrendingUp },
  { key: 'expenses', path: '/expenses', icon: TrendingDown },
  { key: 'cards', path: '/cards', icon: CreditCard },
  { key: 'accounts', path: '/accounts', icon: Landmark },
  { key: 'budget', path: '/budget', icon: Target },
  { key: 'categories', path: '/categories', icon: Tag },
  { key: 'reports', path: '/reports', icon: BarChart3 },
  { key: 'ai', path: '/ai', icon: Sparkles },
] as const;

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const navLabels: Record<string, string> = {
    dashboard: t.nav.dashboard,
    income: t.nav.income,
    expenses: t.nav.expenses,
    cards: t.nav.cards,
    accounts: t.nav.accounts,
    budget: t.nav.budget,
    categories: 'Categorias',
    reports: t.nav.reports,
    ai: t.nav.ai,
  };

  const NavButton = ({ keyName, path, Icon, label }: { keyName: string; path: string; Icon: React.ElementType; label: string }) => {
    const isActive = location.pathname === path;
    const btn = (
      <button
        onClick={() => navigate(path)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
        } ${collapsed ? 'justify-center px-2' : ''}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? 'w-[60px]' : 'w-52'
      }`}
    >
      {/* Logo */}
      <div className={`flex h-14 items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
        <img src={mooviLogo} alt="Moovi" className="h-8 w-8 rounded-lg object-cover shrink-0" />
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-sidebar-accent-foreground">Moovi</span>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-0.5 py-2 ${collapsed ? 'px-1.5' : 'px-2.5'}`}>
        {navItems.map(({ key, path, icon: Icon }) => (
          <NavButton key={key} keyName={key} path={path} Icon={Icon} label={navLabels[key]} />
        ))}
      </nav>

      {/* Bottom */}
      <div className={`space-y-0.5 border-t border-sidebar-border py-3 ${collapsed ? 'px-1.5' : 'px-2.5'}`}>
        <NavButton keyName="subscription" path="/subscription" Icon={Crown} label={t.nav.subscription} />
        <NavButton keyName="settings" path="/settings" Icon={Settings} label={t.nav.settings} />

        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10">
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{t.nav.logout}</TooltipContent>
          </Tooltip>
        ) : (
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.nav.logout}</span>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground ${collapsed ? 'justify-center px-2' : ''}`}
        >
          {collapsed ? <PanelLeft className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
          {!collapsed && <span className="truncate">Recolher</span>}
        </button>
      </div>
    </aside>
  );
};
