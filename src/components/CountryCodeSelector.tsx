import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Country {
  code: string;
  ddi: string;
  flag: string;
  mask: string;
  maxDigits: number;
}

export const countries: Country[] = [
  { code: 'BR', ddi: '55', flag: '🇧🇷', mask: '(##) #####-####', maxDigits: 11 },
  { code: 'US', ddi: '1', flag: '🇺🇸', mask: '(###) ###-####', maxDigits: 10 },
  { code: 'PT', ddi: '351', flag: '🇵🇹', mask: '### ### ###', maxDigits: 9 },
  { code: 'AR', ddi: '54', flag: '🇦🇷', mask: '## ####-####', maxDigits: 10 },
  { code: 'MX', ddi: '52', flag: '🇲🇽', mask: '## #### ####', maxDigits: 10 },
  { code: 'CO', ddi: '57', flag: '🇨🇴', mask: '### ### ####', maxDigits: 10 },
  { code: 'CL', ddi: '56', flag: '🇨🇱', mask: '# #### ####', maxDigits: 9 },
  { code: 'UY', ddi: '598', flag: '🇺🇾', mask: '## ### ###', maxDigits: 8 },
  { code: 'PY', ddi: '595', flag: '🇵🇾', mask: '### ### ###', maxDigits: 9 },
  { code: 'PE', ddi: '51', flag: '🇵🇪', mask: '### ### ###', maxDigits: 9 },
  { code: 'GB', ddi: '44', flag: '🇬🇧', mask: '#### ######', maxDigits: 10 },
  { code: 'DE', ddi: '49', flag: '🇩🇪', mask: '### #######', maxDigits: 10 },
  { code: 'FR', ddi: '33', flag: '🇫🇷', mask: '# ## ## ## ##', maxDigits: 9 },
  { code: 'ES', ddi: '34', flag: '🇪🇸', mask: '### ### ###', maxDigits: 9 },
  { code: 'IT', ddi: '39', flag: '🇮🇹', mask: '### ### ####', maxDigits: 10 },
  { code: 'JP', ddi: '81', flag: '🇯🇵', mask: '##-####-####', maxDigits: 10 },
];

export function applyMask(digits: string, mask: string, maxDigits: number): string {
  const limited = digits.slice(0, maxDigits);
  let result = '';
  let di = 0;
  for (let i = 0; i < mask.length && di < limited.length; i++) {
    if (mask[i] === '#') {
      result += limited[di++];
    } else {
      result += mask[i];
    }
  }
  return result;
}

interface Props {
  selected: Country;
  onSelect: (c: Country) => void;
}

export function CountryCodeSelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-12 px-3 rounded-l-md border border-r-0 border-input bg-muted/50 hover:bg-muted transition-colors text-sm"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="text-xs text-muted-foreground">+{selected.ddi}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 max-h-60 overflow-y-auto rounded-md border border-input bg-popover shadow-lg">
          {countries.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onSelect(c); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors ${c.code === selected.code ? 'bg-accent/50' : ''}`}
            >
              <span className="text-lg leading-none">{c.flag}</span>
              <span className="flex-1 text-left">{c.code}</span>
              <span className="text-muted-foreground">+{c.ddi}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
