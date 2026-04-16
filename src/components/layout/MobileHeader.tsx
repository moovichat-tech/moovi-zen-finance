import { useI18n } from '@/i18n/context';
import { type Currency } from '@/i18n/translations';
import { Coins, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import mooviLogoLight from '@/assets/moovi-logo-light.png';
import mooviLogoDark from '@/assets/moovi-logo-dark.png';

export const MobileHeader = () => {
  const { currency, setCurrency } = useI18n();
  const { theme, setTheme } = useTheme();
  const mooviLogo = theme === 'dark' ? mooviLogoDark : mooviLogoLight;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 backdrop-blur-xl px-4">
      <div className="flex items-center gap-2.5">
        <img src={mooviLogo} alt="Moovi" className="h-8 w-8 object-contain" />
        <span className="text-base font-bold tracking-tight text-foreground">Moovi</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="h-8 w-auto gap-1 border-none bg-secondary px-2 text-xs font-medium shadow-none">
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
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};
