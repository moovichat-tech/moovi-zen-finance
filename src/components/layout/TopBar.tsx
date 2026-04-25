import { useI18n } from '@/i18n/context';
import { localeNames, localeFlags, type Locale, type Currency } from '@/i18n/translations';
import { Globe, Coins, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const TopBar = ({ title, subtitle, onMenuClick }: { title: string; subtitle?: string; onMenuClick: () => void }) => {
  const { locale, currency, setLocale, setCurrency } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-3 sm:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col min-w-0 leading-tight">
          <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="hidden lg:block text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className="h-8 w-auto gap-1 sm:gap-1.5 border-none bg-secondary px-1.5 sm:px-2.5 text-xs font-medium shadow-none">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline"><SelectValue /></span>
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {localeFlags[key]} {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="h-8 w-auto gap-1 sm:gap-1.5 border-none bg-secondary px-1.5 sm:px-2.5 text-xs font-medium shadow-none">
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline"><SelectValue /></span>
          </SelectTrigger>
          <SelectContent>
            {(['BRL', 'USD', 'EUR', 'CHF'] as Currency[]).map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};
