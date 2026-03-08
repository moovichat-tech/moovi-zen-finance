import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';
import { ArrowUpRight, ArrowDownRight, CalendarDays, Plus, Bell, Clock } from 'lucide-react';
import { ptBR, enUS, es, fr, de } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Locale } from '@/i18n/translations';

const dateFnsLocales: Record<Locale, DateFnsLocale> = { pt: ptBR, en: enUS, es, fr, de };

interface Commitment {
  id: string;
  title: string;
  date: string;
  type: 'financial' | 'personal';
  notes?: string;
}

const CommitmentsPage = () => {
  const { formatCurrency, formatDate, locale } = useI18n();
  const { transactions } = useData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [openSchedule, setOpenSchedule] = useState(false);
  const [commitments, setCommitments] = useState<Commitment[]>(() => {
    try {
      const stored = localStorage.getItem('moovi_commitments');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [newCommitment, setNewCommitment] = useState({ title: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const saveCommitments = (items: Commitment[]) => {
    setCommitments(items);
    localStorage.setItem('moovi_commitments', JSON.stringify(items));
  };

  const handleAddCommitment = () => {
    if (!newCommitment.title) return;
    const item: Commitment = {
      id: `c-${Date.now()}`,
      title: newCommitment.title,
      date: newCommitment.date,
      type: 'personal',
      notes: newCommitment.notes,
    };
    saveCommitments([...commitments, item]);
    setOpenSchedule(false);
    setNewCommitment({ title: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Compromissos', subtitle: 'Sua agenda financeira e pessoal', noItems: 'Nenhum compromisso nesta data', upcoming: 'Próximos compromissos', recent: 'Compromissos recentes', schedule: 'Agendar compromisso', commitTitle: 'Título', notes: 'Observações', save: 'Salvar', cancel: 'Cancelar' },
    en: { title: 'Commitments', subtitle: 'Your financial and personal agenda', noItems: 'No commitments on this date', upcoming: 'Upcoming commitments', recent: 'Recent commitments', schedule: 'Schedule commitment', commitTitle: 'Title', notes: 'Notes', save: 'Save', cancel: 'Cancel' },
    es: { title: 'Compromisos', subtitle: 'Tu agenda financiera y personal', noItems: 'Sin compromisos en esta fecha', upcoming: 'Próximos compromisos', recent: 'Compromisos recientes', schedule: 'Agendar compromiso', commitTitle: 'Título', notes: 'Notas', save: 'Guardar', cancel: 'Cancelar' },
    fr: { title: 'Engagements', subtitle: 'Votre agenda financier et personnel', noItems: "Aucun engagement à cette date", upcoming: 'Prochains engagements', recent: 'Engagements récents', schedule: 'Planifier un engagement', commitTitle: 'Titre', notes: 'Notes', save: 'Enregistrer', cancel: 'Annuler' },
    de: { title: 'Verpflichtungen', subtitle: 'Ihre finanzielle und persönliche Agenda', noItems: 'Keine Verpflichtungen', upcoming: 'Kommende Verpflichtungen', recent: 'Letzte Verpflichtungen', schedule: 'Verpflichtung planen', commitTitle: 'Titel', notes: 'Notizen', save: 'Speichern', cancel: 'Abbrechen' },
  };
  const l = labels[locale] || labels.pt;

  const today = new Date().toISOString().split('T')[0];
  const dfLocale = dateFnsLocales[locale];

  // Merge transactions and personal commitments
  const allItems = useMemo(() => {
    const financialItems = transactions
      .filter(tr => tr.status === 'planned' || tr.recurrence !== 'once')
      .map(tr => ({
        id: tr.id,
        title: tr.description,
        date: tr.date,
        type: 'financial' as const,
        amount: tr.amount,
        transactionType: tr.type,
        status: tr.status,
        category: tr.category,
      }));
    const personalItems = commitments.map(c => ({
      id: c.id,
      title: c.title,
      date: c.date,
      type: 'personal' as const,
      notes: c.notes,
    }));
    return [...financialItems, ...personalItems];
  }, [transactions, commitments]);

  // Dates with items
  const transactionDates = useMemo(() => {
    const dateMap: Record<string, boolean> = {};
    allItems.forEach(item => { dateMap[item.date] = true; });
    return dateMap;
  }, [allItems]);

  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const selectedItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return allItems.filter(item => item.date === selectedDateStr);
  }, [allItems, selectedDateStr]);

  // Upcoming
  const upcomingItems = useMemo(() => {
    return allItems
      .filter(item => item.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [allItems, today]);

  // Recent (past)
  const recentItems = useMemo(() => {
    return allItems
      .filter(item => item.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [allItems, today]);

  const daysWithItems = useMemo(() => {
    return Object.keys(transactionDates).map(d => new Date(d + 'T12:00:00'));
  }, [transactionDates]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={() => setOpenSchedule(true)}>
          <Plus className="h-4 w-4" /> {l.schedule}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasTransaction: daysWithItems }}
            modifiersClassNames={{ hasTransaction: 'bg-primary/10 font-bold' }}
            className="w-full"
            locale={dfLocale}
          />

          {/* Selected date items */}
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {selectedDateStr ? formatDate(selectedDateStr) : '—'}
            </h3>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{l.noItems}</p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2">
                      {item.type === 'financial' ? (
                        ('transactionType' in item && item.transactionType === 'income')
                          ? <ArrowUpRight className="h-4 w-4 text-success shrink-0" />
                          : <ArrowDownRight className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <Bell className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <div>
                        <span className="text-sm font-medium">{item.title}</span>
                        {'category' in item && <span className="ml-2 text-xs text-muted-foreground">{item.category}</span>}
                        {'notes' in item && item.notes && <span className="ml-2 text-xs text-muted-foreground">{item.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === 'financial' && 'status' in item && (
                        <Badge variant={item.status === 'planned' ? 'secondary' : 'default'} className="text-[10px]">
                          {item.status === 'planned' ? 'Previsto' : item.status === 'paid' ? 'Pago' : 'Recebido'}
                        </Badge>
                      )}
                      {item.type === 'personal' && (
                        <Badge variant="outline" className="text-[10px]">Pessoal</Badge>
                      )}
                      {'amount' in item && (
                        <span className={`text-sm font-medium ${'transactionType' in item && item.transactionType === 'income' ? 'text-success' : 'text-destructive'}`}>
                          {'transactionType' in item && item.transactionType === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {l.upcoming}
            </h3>
            {upcomingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{l.noItems}</p>
            ) : (
              <div className="space-y-3">
                {upcomingItems.map(item => {
                  const diff = Math.ceil((new Date(item.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={item.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'personal' && <Bell className="h-3 w-3 text-primary" />}
                          <p className="text-xs font-medium">{item.title}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(item.date)} • {diff === 0 ? 'Hoje' : `em ${diff} dia${diff > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {'amount' in item && (
                        <span className={`text-xs font-medium ${'transactionType' in item && item.transactionType === 'income' ? 'text-success' : 'text-destructive'}`}>
                          {'transactionType' in item && item.transactionType === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold mb-4">{l.recent}</h3>
            {recentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{l.noItems}</p>
            ) : (
              <div className="space-y-3">
                {recentItems.map(item => (
                  <div key={item.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {item.type === 'personal' && <Bell className="h-3 w-3 text-muted-foreground" />}
                        <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                    {'amount' in item && (
                      <span className={`text-xs font-medium ${'transactionType' in item && item.transactionType === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {'transactionType' in item && item.transactionType === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{l.schedule}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{l.commitTitle}</Label>
              <Input value={newCommitment.title} onChange={e => setNewCommitment({ ...newCommitment, title: e.target.value })} placeholder="Ex: Reunião, Consulta médica..." />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <DatePicker value={newCommitment.date} onChange={v => setNewCommitment({ ...newCommitment, date: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>{l.notes}</Label>
              <Input value={newCommitment.notes} onChange={e => setNewCommitment({ ...newCommitment, notes: e.target.value })} placeholder="Observações opcionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSchedule(false)}>{l.cancel}</Button>
            <Button onClick={handleAddCommitment}>{l.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommitmentsPage;
