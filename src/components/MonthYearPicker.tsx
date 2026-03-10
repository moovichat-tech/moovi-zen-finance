import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/i18n/context';

const monthNames: Record<string, string[]> = {
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
};

export function getMonthLabel(yyyymm: string, locale: string): string {
  const [y, m] = yyyymm.split('-');
  const names = monthNames[locale] || monthNames.pt;
  return `${names[parseInt(m) - 1]} ${y}`;
}

interface MonthYearPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  availableMonths?: string[]; // optional - only used for highlighting, not restricting
  className?: string;
  triggerClassName?: string;
}

export function MonthYearPicker({ value, onChange, availableMonths, className, triggerClassName }: MonthYearPickerProps) {
  const { locale } = useI18n();
  const names = monthNames[locale] || monthNames.pt;

  // Generate full range of years: data years + current ± 3
  const allYears = useMemo(() => {
    const set = new Set<string>();
    const now = new Date().getFullYear();
    for (let y = now - 3; y <= now + 1; y++) set.add(String(y));
    if (availableMonths) {
      availableMonths.forEach(m => set.add(m.substring(0, 4)));
    }
    return Array.from(set).sort().reverse();
  }, [availableMonths]);

  const currentYear = value.substring(0, 4);
  const currentMonthNum = value.substring(5, 7);

  // Always show all 12 months
  const allMonthNums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  const handleYearChange = (year: string) => {
    onChange(`${year}-${currentMonthNum}`);
  };

  return (
    <div className={`flex gap-1.5 ${className || ''}`}>
      <Select value={currentMonthNum} onValueChange={m => onChange(`${currentYear}-${m}`)}>
        <SelectTrigger className={triggerClassName || "h-8 w-28 text-xs"}>
          <SelectValue>{names[parseInt(currentMonthNum) - 1]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allMonthNums.map(m => (
            <SelectItem key={m} value={m}>{names[parseInt(m) - 1]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={currentYear} onValueChange={handleYearChange}>
        <SelectTrigger className={triggerClassName || "h-8 w-20 text-xs"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allYears.map(y => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
