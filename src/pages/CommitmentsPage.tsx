import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ArrowUpRight, ArrowDownRight, CalendarDays } from 'lucide-react';

const CommitmentsPage = () => {
  const { formatCurrency, formatDate, locale } = useI18n();
  const { transactions } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Compromissos', subtitle: 'Visualize seus lançamentos no calendário', noItems: 'Nenhum compromisso nesta data', upcoming: 'Próximos compromissos' },
    en: { title: 'Commitments', subtitle: 'View your transactions on the calendar', noItems: 'No commitments on this date', upcoming: 'Upcoming commitments' },
    es: { title: 'Compromisos', subtitle: 'Visualiza tus transacciones en el calendario', noItems: 'Sin compromisos en esta fecha', upcoming: 'Próximos compromisos' },
    fr: { title: 'Engagements', subtitle: 'Visualisez vos transactions sur le calendrier', noItems: "Aucun engagement à cette date", upcoming: 'Prochains engagements' },
    de: { title: 'Verpflichtungen', subtitle: 'Sehen Sie Ihre Transaktionen im Kalender', noItems: 'Keine Verpflichtungen an diesem Datum', upcoming: 'Kommende Verpflichtungen' },
  };
  const l = labels[locale] || labels.pt;

  const today = new Date().toISOString().split('T')[0];

  // Get dates that have transactions (for dot indicators)
  const transactionDates = useMemo(() => {
    const dateMap: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(tr => {
      if (!dateMap[tr.date]) dateMap[tr.date] = { income: 0, expense: 0 };
      if (tr.type === 'income') dateMap[tr.date].income += tr.amount;
      else dateMap[tr.date].expense += tr.amount;
    });
    return dateMap;
  }, [transactions]);

  // Get transactions for the selected date
  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const selectedTransactions = useMemo(() => {
    if (!selectedDateStr) return [];
    return transactions
      .filter(tr => tr.date === selectedDateStr)
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [transactions, selectedDateStr]);

  // Upcoming planned transactions
  const upcomingTransactions = useMemo(() => {
    return transactions
      .filter(tr => tr.status === 'planned' && tr.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [transactions, today]);

  // Days with transactions for modifiers
  const daysWithTransactions = useMemo(() => {
    return Object.keys(transactionDates).map(d => new Date(d + 'T12:00:00'));
  }, [transactionDates]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold">{l.title}</h2>
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasTransaction: daysWithTransactions }}
            modifiersClassNames={{ hasTransaction: 'bg-primary/10 font-bold' }}
            className="w-full"
          />

          {/* Selected date transactions */}
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {selectedDateStr ? formatDate(selectedDateStr) : '—'}
            </h3>
            {selectedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{l.noItems}</p>
            ) : (
              <div className="space-y-2">
                {selectedTransactions.map(tr => (
                  <div key={tr.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      {tr.type === 'income'
                        ? <ArrowUpRight className="h-4 w-4 text-success shrink-0" />
                        : <ArrowDownRight className="h-4 w-4 text-destructive shrink-0" />
                      }
                      <div>
                        <span className="text-sm font-medium">{tr.description}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{tr.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tr.status === 'planned' ? 'secondary' : 'default'} className="text-[10px]">
                        {tr.status === 'planned' ? 'Previsto' : tr.status === 'paid' ? 'Pago' : 'Recebido'}
                      </Badge>
                      <span className={`text-sm font-medium ${tr.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming sidebar */}
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-4">{l.upcoming}</h3>
          {upcomingTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{l.noItems}</p>
          ) : (
            <div className="space-y-3">
              {upcomingTransactions.map(tr => {
                const diff = Math.ceil((new Date(tr.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={tr.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{tr.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(tr.date)} • {diff === 0 ? 'Hoje' : `em ${diff} dia${diff > 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${tr.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CommitmentsPage;
