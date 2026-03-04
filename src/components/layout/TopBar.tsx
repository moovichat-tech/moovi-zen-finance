import { useI18n, type Theme } from '@/i18n/context';
import { localeNames, type Locale, type Currency } from '@/i18n/translations';
import { Globe, Coins, Sun, Moon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const TopBar = ({ title }: { title: string }) => {
  const { locale, currency, theme, setLocale, setCurrency, setTheme } = useI18n();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-2">
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className="h-8 w-auto gap-1.5 border-none bg-secondary px-2.5 text-xs font-medium shadow-none">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
              <SelectItem key={key} value={key} className="text-xs">{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="h-8 w-auto gap-1.5 border-none bg-secondary px-2.5 text-xs font-medium shadow-none">
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
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
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </div>
    </header>
  );
};
