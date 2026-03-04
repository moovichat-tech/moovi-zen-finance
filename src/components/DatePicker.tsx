import * as React from "react";
import { format } from "date-fns";
import { ptBR, enUS, es, fr, de } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/translations";

const dateFnsLocales: Record<Locale, any> = {
  pt: ptBR,
  en: enUS,
  es: es,
  fr: fr,
  de: de,
};

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder, className }: DatePickerProps) {
  const { locale } = useI18n();
  const dfLocale = dateFnsLocales[locale];

  const date = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      const yyyy = day.getFullYear();
      const mm = String(day.getMonth() + 1).padStart(2, "0");
      const dd = String(day.getDate()).padStart(2, "0");
      onChange?.(`${yyyy}-${mm}-${dd}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: dfLocale }) : <span>{placeholder || "Selecionar data"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={dfLocale}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
