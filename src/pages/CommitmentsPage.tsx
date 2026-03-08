import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';
import { ArrowUpRight, ArrowDownRight, CalendarDays, Plus, Bell, Clock, Trash2 } from 'lucide-react';
import { ptBR, enUS, es, fr, de } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Locale } from '@/i18n/translations';

const dateFnsLocales: Record<Locale, DateFnsLocale> = { pt: ptBR, en: enUS, es, fr, de };

interface Commitment {
  id: string;
  title: string;
  date: string;
  time?: string;
  recurrence: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
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
  const [newCommitment, setNewCommitment] = useState({ title: '', date: new Date().toISOString().split('T')[0], time: '', recurrence: 'once' as const, notes: '' });

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

  const handleDeleteCommitment = (id: string) => {
    saveCommitments(commitments.filter(c => c.id !== id));
  };

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Compromissos', subtitle: 'Sua agenda financeira e pessoal', noItems: 'Nenhum compromisso nesta data', upcoming: 'Próximos compromissos', recent: 'Compromissos recentes', schedule: 'Agendar compromisso', commitTitle: 'Título', notes: 'Observações', save: 'Salvar', cancel: 'Cancelar', today: 'Hoje', inDays: 'em {n} dia(s)', personal: 'Pessoal', planned: 'Previsto', paid: 'Pago', received: 'Recebido', selectedDay: 'Compromissos do dia' },
    en: { title: 'Commitments', subtitle: 'Your financial and personal agenda', noItems: 'No commitments on this date', upcoming: 'Upcoming commitments', recent: 'Recent commitments', schedule: 'Schedule commitment', commitTitle: 'Title', notes: 'Notes', save: 'Save', cancel: 'Cancel', today: 'Today', inDays: 'in {n} day(s)', personal: 'Personal', planned: 'Planned', paid: 'Paid', received: 'Received', selectedDay: 'Day commitments' },
    es: { title: 'Compromisos', subtitle: 'Tu agenda financiera y personal', noItems: 'Sin compromisos en esta fecha', upcoming: 'Próximos compromisos', recent: 'Compromisos recientes', schedule: 'Agendar compromiso', commitTitle: 'Título', notes: 'Notas', save: 'Guardar', cancel: 'Cancelar', today: 'Hoy', inDays: 'en {n} día(s)', personal: 'Personal', planned: 'Previsto', paid: 'Pagado', received: 'Recibido', selectedDay: 'Compromisos del día' },
    fr: { title: 'Engagements', subtitle: 'Votre agenda financier et personnel', noItems: "Aucun engagement à cette date", upcoming: 'Prochains engagements', recent: 'Engagements récents', schedule: 'Planifier un engagement', commitTitle: 'Titre', notes: 'Notes', save: 'Enregistrer', cancel: 'Annuler', today: "Aujourd'hui", inDays: 'dans {n} jour(s)', personal: 'Personnel', planned: 'Prévu', paid: 'Payé', received: 'Reçu', selectedDay: 'Engagements du jour' },
    de: { title: 'Verpflichtungen', subtitle: 'Ihre finanzielle und persönliche Agenda', noItems: 'Keine Verpflichtungen', upcoming: 'Kommende Verpflichtungen', recent: 'Letzte Verpflichtungen', schedule: 'Verpflichtung planen', commitTitle: 'Titel', notes: 'Notizen', save: 'Speichern', cancel: 'Abbrechen', today: 'Heute', inDays: 'in {n} Tag(en)', personal: 'Persönlich', planned: 'Geplant', paid: 'Bezahlt', received: 'Erhalten', selectedDay: 'Tagesverpflichtungen' },
  };
  const l = labels[locale] || labels.pt;

  const today = new Date().toISOString().split('T')[0];
  const dfLocale = dateFnsLocales[locale];

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

  const upcomingItems = useMemo(() => {
    return allItems
      .filter(item => item.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [allItems, today]);

  const recentItems = useMemo(() => {
    return allItems
      .filter(item => item.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [allItems, today]);

  const daysWithItems = useMemo(() => {
    return Object.keys(transactionDates).map(d => new Date(d + 'T12:00:00'));
  }, [transactionDates]);

  const getDaysDiff = (date: string) => {
    return Math.ceil((new Date(date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderItemRow = (item: typeof allItems[0], variant: 'full' | 'compact' | 'muted' = 'full') => {
    const isMuted = variant === 'muted';
    return (
      <div key={item.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${variant === 'full' ? 'bg-secondary/50' : ''} ${variant !== 'full' ? 'border-b border-border last:border-0' : ''}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {item.type === 'financial' ? (
            ('transactionType' in item && item.transactionType === 'income')
              ? <ArrowUpRight className={`h-4 w-4 shrink-0 ${isMuted ? 'text-muted-foreground' : 'text-success'}`} />
              : <ArrowDownRight className={`h-4 w-4 shrink-0 ${isMuted ? 'text-muted-foreground' : 'text-destructive'}`} />
          ) : (
            <Bell className={`h-4 w-4 shrink-0 ${isMuted ? 'text-muted-foreground' : 'text-primary'}`} />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isMuted ? 'text-muted-foreground' : ''}`}>{item.title}</p>
            {variant === 'compact' && (
              <p className="text-[11px] text-muted-foreground">
                {formatDate(item.date)}
                {item.date >= today && (() => {
                  const diff = getDaysDiff(item.date);
                  return ` • ${diff === 0 ? l.today : l.inDays.replace('{n}', String(diff))}`;
                })()}
              </p>
            )}
            {variant === 'muted' && (
              <p className="text-[11px] text-muted-foreground">{formatDate(item.date)}</p>
            )}
            {'notes' in item && item.notes && <p className="text-[11px] text-muted-foreground truncate">{item.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {item.type === 'financial' && 'status' in item && (
            <Badge variant={item.status === 'planned' ? 'secondary' : 'default'} className="text-[10px]">
              {item.status === 'planned' ? l.planned : item.status === 'paid' ? l.paid : l.received}
            </Badge>
          )}
          {item.type === 'personal' && (
            <>
              <Badge variant="outline" className="text-[10px]">{l.personal}</Badge>
              {variant === 'full' && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteCommitment(item.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </>
          )}
          {'amount' in item && (
            <span className={`text-sm font-semibold ${'transactionType' in item && item.transactionType === 'income' ? 'text-success' : 'text-destructive'}`}>
              {'transactionType' in item && item.transactionType === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={() => setOpenSchedule(true)}>
          <Plus className="h-4 w-4" /> {l.schedule}
        </Button>
      </div>

      {/* Main grid: Calendar left, upcoming right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar + selected day */}
        <Card className="p-5 lg:col-span-5 flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{ hasTransaction: daysWithItems }}
            modifiersClassNames={{ hasTransaction: 'bg-primary/10 font-bold' }}
            className="w-full [&_.rdp-table]:w-full [&_.rdp-head_cell]:flex-1 [&_.rdp-cell]:flex-1 [&_.rdp-day]:w-full"
            locale={dfLocale}
          />
        </Card>

        {/* Selected day details */}
        <Card className="p-5 lg:col-span-7">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {l.selectedDay} — {selectedDateStr ? formatDate(selectedDateStr) : '—'}
          </h3>
          {selectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{l.noItems}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedItems.map(item => renderItemRow(item, 'full'))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom: upcoming + recent side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {l.upcoming}
          </h3>
          {upcomingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{l.noItems}</p>
          ) : (
            <div className="space-y-1">
              {upcomingItems.map(item => renderItemRow(item, 'compact'))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {l.recent}
          </h3>
          {recentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{l.noItems}</p>
          ) : (
            <div className="space-y-1">
              {recentItems.map(item => renderItemRow(item, 'muted'))}
            </div>
          )}
        </Card>
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
