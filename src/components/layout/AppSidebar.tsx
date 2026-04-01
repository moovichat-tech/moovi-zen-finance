import { useI18n } from '@/i18n/context';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, TrendingUp, TrendingDown, CreditCard, Landmark, Target, BarChart3, Settings, LogOut, Crown, Tag, PanelLeftClose, PanelLeft, ClipboardList, X, CalendarDays, Building2, LineChart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import mooviLogo from '@/assets/moovi-logo.jpeg';

const navItems = [
  { key: 'dashboard', path: '/', icon: LayoutDashboard },
  { key: 'income', path: '/income', icon: TrendingUp },
  { key: 'expenses', path: '/expenses', icon: TrendingDown },
  { key: 'payables', path: '/payables', icon: ClipboardList },
  { key: 'cards', path: '/cards', icon: CreditCard },
  { key: 'accounts', path: '/accounts', icon: Landmark },
  { key: 'budget', path: '/budget', icon: Target },
  { key: 'categories', path: '/categories', icon: Tag },
  { key: 'commitments', path: '/commitments', icon: CalendarDays },
  { key: 'reports', path: '/reports', icon: BarChart3 },
  { key: 'openfinance', path: '/open-finance', icon: Building2 },
  { key: 'investments', path: '/investments', icon: LineChart, external: 'https://stoots.com.br' },
] as const;

interface AppSidebarProps { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onMobileClose: () => void; isDesktop: boolean; }

export const AppSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose, isDesktop }: AppSidebarProps) => {
  const { t, locale } = useI18n();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navLabels: Record<string, string> = {
    dashboard: t.nav.dashboard, income: t.nav.income, expenses: t.nav.expenses,
    payables: locale === 'pt' ? 'A Pagar/Receber' : locale === 'en' ? 'Payables' : locale === 'es' ? 'Por Pagar' : locale === 'fr' ? 'À Payer' : 'Forderungen',
    cards: t.nav.cards, accounts: t.nav.accounts, budget: t.nav.budget,
    categories: locale === 'pt' ? 'Categorias' : locale === 'en' ? 'Categories' : locale === 'es' ? 'Categorías' : locale === 'fr' ? 'Catégories' : 'Kategorien',
    commitments: locale === 'pt' ? 'Compromissos' : locale === 'en' ? 'Commitments' : locale === 'es' ? 'Compromisos' : locale === 'fr' ? 'Engagements' : 'Verpflichtungen',
    reports: t.nav.reports,
    openfinance: 'Open Finance',
    investments: locale === 'pt' ? 'Investimentos' : locale === 'en' ? 'Investments' : locale === 'es' ? 'Inversiones' : locale === 'fr' ? 'Investissements' : 'Investitionen',
  };

  const handleNavigate = (path: string, external?: string) => {
    if (external) {
      window.open(external, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
    onMobileClose();
  };

  const showLabels = !isDesktop || !collapsed;
  const sidebarWidth = isDesktop ? (collapsed ? 60 : 208) : 256;

  const NavButton = ({ keyName, path, Icon, label, external }: { keyName: string; path: string; Icon: React.ElementType; label: string; external?: string }) => {
    const isActive = !external && location.pathname === path;
    const btn = (
      <button onClick={() => handleNavigate(path, external)} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'} ${!showLabels ? 'justify-center px-2' : ''}`}>
        <Icon className="h-4 w-4 shrink-0" />
        {showLabels && <span className="truncate">{label}</span>}
      </button>
    );
    if (isDesktop && collapsed) {
      return <Tooltip delayDuration={0}><TooltipTrigger asChild>{btn}</TooltipTrigger><TooltipContent side="right" className="text-xs">{label}</TooltipContent></Tooltip>;
    }
    return btn;
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      style={{ width: sidebarWidth }}
    >
      <div className={`flex h-14 items-center justify-between ${!showLabels ? 'px-2' : 'px-4'} gap-2.5`}>
        <div className="flex items-center gap-2.5">
          <img src={mooviLogo} alt="Moovi" className="h-8 w-8 rounded-lg object-cover shrink-0" />
          {showLabels && <span className="text-base font-bold tracking-tight text-sidebar-accent-foreground">Moovi</span>}
        </div>
        <button onClick={onMobileClose} className="lg:hidden text-sidebar-foreground"><X className="h-5 w-5" /></button>
      </div>

      <nav className={`flex-1 space-y-0.5 overflow-y-auto py-2 ${!showLabels ? 'px-1.5' : 'px-2.5'}`}>
        {navItems.map(({ key, path, icon: Icon, ...rest }) => <NavButton key={key} keyName={key} path={path} Icon={Icon} label={navLabels[key]} external={'external' in rest ? (rest as any).external : undefined} />)}
      </nav>

      <div className={`space-y-0.5 border-t border-sidebar-border py-3 ${!showLabels ? 'px-1.5' : 'px-2.5'}`}>
        <NavButton keyName="subscription" path="/subscription" Icon={Crown} label={t.nav.subscription} />
        <NavButton keyName="settings" path="/settings" Icon={Settings} label={t.nav.settings} />
        <button onClick={() => { logout(); navigate('/login'); }} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 ${!showLabels ? 'justify-center px-2' : ''}`}>
          <LogOut className="h-4 w-4 shrink-0" />
          {showLabels && <span className="truncate">{t.nav.logout}</span>}
        </button>
        <button onClick={onToggle} className={`hidden lg:flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground ${!showLabels ? 'justify-center px-2' : ''}`}>
          {collapsed ? <PanelLeft className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
          {showLabels && <span className="truncate">Recolher</span>}
        </button>
      </div>
    </aside>
  );
};
