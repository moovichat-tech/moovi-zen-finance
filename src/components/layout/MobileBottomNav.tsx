import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import {
  Home, Receipt, CreditCard, MoreHorizontal, TrendingUp, TrendingDown,
  Landmark, Target, BarChart3, Settings, LogOut, Crown, Tag, CalendarDays,
  Building2, ClipboardList, LineChart, HelpCircle, SlidersHorizontal, Check,
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'moovi_mobile_shortcuts';
const DEFAULT_SHORTCUTS = ['transactions', 'cards', 'metas'];
const MAX_SHORTCUTS = 3;

interface NavItem {
  key: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: string;
}

const allItems: NavItem[] = [
  { key: 'transactions', path: '/expenses', icon: Receipt },
  { key: 'cards', path: '/cards', icon: CreditCard },
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
];

function loadShortcuts(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === MAX_SHORTCUTS) return parsed;
    }
  } catch {}
  return DEFAULT_SHORTCUTS;
}

function saveShortcuts(keys: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export const MobileBottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<string[]>(loadShortcuts);
  const [editSelection, setEditSelection] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { logout } = useAuth();

  const navLabels: Record<string, string> = {
    home: locale === 'pt' ? 'Início' : locale === 'en' ? 'Home' : locale === 'es' ? 'Inicio' : locale === 'fr' ? 'Accueil' : 'Start',
    transactions: locale === 'pt' ? 'Transações' : locale === 'en' ? 'Transactions' : locale === 'es' ? 'Transacciones' : locale === 'fr' ? 'Transactions' : 'Transaktionen',
    cards: t.nav.cards,
    menu: 'Menu',
    edit: locale === 'pt' ? 'Editar' : 'Edit',
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

  const getItemByKey = (key: string) => allItems.find((i) => i.key === key);

  const dynamicTabs = shortcuts.map((key) => getItemByKey(key)).filter(Boolean) as NavItem[];

  const handleNav = (path: string, external?: string) => {
    if (external) {
      window.open(external, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
    setMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const openEdit = () => {
    setEditSelection([...shortcuts]);
    setEditOpen(true);
  };

  const toggleOption = useCallback((key: string) => {
    setEditSelection((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SHORTCUTS) return prev;
      return [...prev, key];
    });
  }, []);

  const confirmEdit = () => {
    if (editSelection.length === MAX_SHORTCUTS) {
      setShortcuts(editSelection);
      saveShortcuts(editSelection);
      setEditOpen(false);
    }
  };

  // Long-press the menu button opens edit drawer instead
  const handleMenuLongPress = () => {
    openEdit();
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/90 backdrop-blur-xl safe-bottom">
        {/* Fixed: Home */}
        <button
          onClick={() => handleNav('/')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
            isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>{navLabels.home}</span>
        </button>

        {/* Dynamic: 3 customizable shortcuts */}
        {dynamicTabs.map(({ key, path, icon: Icon, external }) => (
          <button
            key={key}
            onClick={() => handleNav(path, external)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              !external && isActive(path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate max-w-[56px]">{navLabels[key]}</span>
          </button>
        ))}

        {/* Fixed: More / Edit */}
        <button
          onClick={() => setMenuOpen(true)}
          onDoubleClick={openEdit}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
            menuOpen || editOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>{navLabels.menu}</span>
        </button>
      </nav>

      {/* Full Menu Drawer */}
      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base">Menu</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-4 overflow-y-auto max-h-[55vh]">
            {allItems.map(({ key, path, icon: Icon, external }) => (
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
            ))}
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-center leading-tight">{t.nav.logout}</span>
            </button>
          </div>
          {/* Edit shortcuts button inside menu */}
          <div className="px-4 pb-6">
            <Button variant="outline" className="w-full gap-2" onClick={() => { setMenuOpen(false); setTimeout(openEdit, 300); }}>
              <SlidersHorizontal className="h-4 w-4" />
              {locale === 'pt' ? 'Personalizar Atalhos' : locale === 'es' ? 'Personalizar Atajos' : 'Customize Shortcuts'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Shortcuts Drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base">
              {locale === 'pt' ? 'Personalizar Atalhos' : locale === 'es' ? 'Personalizar Atajos' : 'Customize Shortcuts'}
            </DrawerTitle>
            <p className="text-center text-xs text-muted-foreground mt-1">
              {locale === 'pt'
                ? `Selecione ${MAX_SHORTCUTS} atalhos para a barra inferior`
                : `Select ${MAX_SHORTCUTS} shortcuts for the bottom bar`}
              {' '}({editSelection.length}/{MAX_SHORTCUTS})
            </p>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-4 overflow-y-auto max-h-[50vh]">
            {allItems.map(({ key, icon: Icon }) => {
              const selected = editSelection.includes(key);
              const disabled = !selected && editSelection.length >= MAX_SHORTCUTS;
              return (
                <button
                  key={key}
                  onClick={() => toggleOption(key)}
                  disabled={disabled}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-[12px] font-medium transition-all border-2 ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : disabled
                        ? 'border-transparent opacity-40 text-muted-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {selected && (
                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{navLabels[key]}</span>
                </button>
              );
            })}
          </div>
          <div className="px-4 pb-6">
            <Button
              className="w-full"
              disabled={editSelection.length !== MAX_SHORTCUTS}
              onClick={confirmEdit}
            >
              {locale === 'pt' ? 'Salvar' : 'Save'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
