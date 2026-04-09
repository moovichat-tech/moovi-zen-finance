import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { Home, Receipt, CreditCard, MoreHorizontal, TrendingUp, TrendingDown, Landmark, Target, BarChart3, Settings, LogOut, Crown, Tag, CalendarDays, Building2, ClipboardList, LineChart, HelpCircle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

const mainTabs = [
  { key: 'home', path: '/', icon: Home },
  { key: 'transactions', path: '/expenses', icon: Receipt },
  { key: 'cards', path: '/cards', icon: CreditCard },
] as const;

const menuItems = [
  { key: 'income', path: '/income', icon: TrendingUp },
  { key: 'expenses', path: '/expenses', icon: TrendingDown },
  { key: 'payables', path: '/payables', icon: ClipboardList },
  { key: 'accounts', path: '/accounts', icon: Landmark },
  { key: 'budget', path: '/budget', icon: Target },
  { key: 'categories', path: '/categories', icon: Tag },
  { key: 'commitments', path: '/commitments', icon: CalendarDays },
  { key: 'reports', path: '/reports', icon: BarChart3 },
  { key: 'metas', path: '/metas', icon: Target },
  { key: 'openfinance', path: '/open-finance', icon: Building2 },
  { key: 'investments', path: '/investments', icon: LineChart, external: 'https://stoots.com.br' },
  { key: 'subscription', path: '/subscription', icon: Crown },
  { key: 'settings', path: '/settings', icon: Settings },
  { key: 'faq', path: '/help', icon: HelpCircle },
] as const;

export const MobileBottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { logout } = useAuth();

  const navLabels: Record<string, string> = {
    home: locale === 'pt' ? 'Início' : locale === 'en' ? 'Home' : locale === 'es' ? 'Inicio' : locale === 'fr' ? 'Accueil' : 'Start',
    transactions: locale === 'pt' ? 'Transações' : locale === 'en' ? 'Transactions' : locale === 'es' ? 'Transacciones' : locale === 'fr' ? 'Transactions' : 'Transaktionen',
    cards: t.nav.cards,
    menu: 'Menu',
    income: t.nav.income,
    expenses: t.nav.expenses,
    payables: locale === 'pt' ? 'A Pagar/Receber' : locale === 'en' ? 'Payables' : locale === 'es' ? 'Por Pagar' : locale === 'fr' ? 'À Payer' : 'Forderungen',
    accounts: t.nav.accounts,
    budget: t.nav.budget,
    categories: locale === 'pt' ? 'Categorias' : locale === 'en' ? 'Categories' : locale === 'es' ? 'Categorías' : locale === 'fr' ? 'Catégories' : 'Kategorien',
    commitments: locale === 'pt' ? 'Compromissos' : locale === 'en' ? 'Commitments' : locale === 'es' ? 'Compromisos' : locale === 'fr' ? 'Engagements' : 'Verpflichtungen',
    reports: t.nav.reports,
    metas: locale === 'pt' ? 'Metas' : locale === 'en' ? 'Goals' : locale === 'es' ? 'Metas' : locale === 'fr' ? 'Objectifs' : 'Ziele',
    openfinance: 'Open Finance',
    investments: locale === 'pt' ? 'Investimentos' : locale === 'en' ? 'Investments' : locale === 'es' ? 'Inversiones' : locale === 'fr' ? 'Investissements' : 'Investitionen',
    subscription: t.nav.subscription,
    settings: t.nav.settings,
    faq: 'FAQ',
  };

  const handleNav = (path: string, external?: string) => {
    if (external) {
      window.open(external, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/90 backdrop-blur-xl safe-bottom">
        {mainTabs.map(({ key, path, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleNav(path)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              isActive(path)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{navLabels[key]}</span>
          </button>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
            menuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>{navLabels.menu}</span>
        </button>
      </nav>

      {/* Bottom Sheet Menu */}
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base">Menu</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6 overflow-y-auto max-h-[60vh]">
            {menuItems.map(({ key, path, icon: Icon, ...rest }) => {
              const external = 'external' in rest ? (rest as any).external : undefined;
              return (
                <button
                  key={key}
                  onClick={() => handleNav(path, external)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-[12px] font-medium transition-colors ${
                    !external && isActive(path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{navLabels[key]}</span>
                </button>
              );
            })}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-center leading-tight">{t.nav.logout}</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
