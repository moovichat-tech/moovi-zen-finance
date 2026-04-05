import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ArrowDownRight, CalendarDays, Bell, Clock, Loader2, Circle, CheckCircle2, Receipt } from 'lucide-react';
import { ptBR, enUS, es, fr, de } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Locale } from '@/i18n/translations';
import { toast } from 'sonner';

const dateFnsLocales: Record<Locale, DateFnsLocale> = { pt: ptBR, en: enUS, es, fr, de };

interface UnifiedCommitment {
  id: string;
  titulo: string;
  data: string;
  tipo: 'recorrente' | 'temporario';
  valor?: number;
  status: string;
  recorrencia?: string | null;
  notas?: string | null;
}

interface PendingTransaction {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  categoria: string;
  cartao: string | null;
  data_transacao: string;
  conta: string | null;
  status: string;
}

const CommitmentsPage = () => {
  const { formatCurrency, formatDate, locale } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Compromissos', subtitle: 'Sua agenda financeira e pessoal', noItems: 'Nenhum compromisso nesta data', upcoming: 'Próximos compromissos', schedule: 'Agendar compromisso', today: 'Hoje', inDays: 'em {n} dia(s)', recorrente: 'Recorrente', temporario: 'Temporário', selectedDay: 'Compromissos do dia', loading: 'Carregando...', error: 'Erro ao carregar compromissos', pending: 'Contas Pendentes', noPending: 'Ufa! Nenhuma conta pendente.', markPaid: 'Marcar como pago', paid: 'Pago!' },
    en: { title: 'Commitments', subtitle: 'Your financial and personal agenda', noItems: 'No commitments on this date', upcoming: 'Upcoming commitments', schedule: 'Schedule commitment', today: 'Today', inDays: 'in {n} day(s)', recorrente: 'Recurring', temporario: 'Temporary', selectedDay: 'Day commitments', loading: 'Loading...', error: 'Error loading commitments', pending: 'Pending Bills', noPending: 'Phew! No pending bills.', markPaid: 'Mark as paid', paid: 'Paid!' },
    es: { title: 'Compromisos', subtitle: 'Tu agenda financiera y personal', noItems: 'Sin compromisos en esta fecha', upcoming: 'Próximos compromisos', schedule: 'Agendar compromiso', today: 'Hoy', inDays: 'en {n} día(s)', recorrente: 'Recurrente', temporario: 'Temporal', selectedDay: 'Compromisos del día', loading: 'Cargando...', error: 'Error al cargar', pending: 'Cuentas Pendientes', noPending: '¡Uf! Sin cuentas pendientes.', markPaid: 'Marcar como pagado', paid: '¡Pagado!' },
    fr: { title: 'Engagements', subtitle: 'Votre agenda financier et personnel', noItems: "Aucun engagement à cette date", upcoming: 'Prochains engagements', schedule: 'Planifier un engagement', today: "Aujourd'hui", inDays: 'dans {n} jour(s)', recorrente: 'Récurrent', temporario: 'Temporaire', selectedDay: 'Engagements du jour', loading: 'Chargement...', error: 'Erreur de chargement', pending: 'Factures en attente', noPending: 'Ouf ! Aucune facture en attente.', markPaid: 'Marquer comme payé', paid: 'Payé !' },
    de: { title: 'Verpflichtungen', subtitle: 'Ihre finanzielle und persönliche Agenda', noItems: 'Keine Verpflichtungen', upcoming: 'Kommende Verpflichtungen', schedule: 'Verpflichtung planen', today: 'Heute', inDays: 'in {n} Tag(en)', recorrente: 'Wiederkehrend', temporario: 'Temporär', selectedDay: 'Tagesverpflichtungen', loading: 'Laden...', error: 'Fehler beim Laden', pending: 'Offene Rechnungen', noPending: 'Puh! Keine offenen Rechnungen.', markPaid: 'Als bezahlt markieren', paid: 'Bezahlt!' },
  };
  const l = labels[locale] || labels.pt;

  const todayLocal = new Date();
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
  const dfLocale = dateFnsLocales[locale];
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // === Commitments query ===
  const { data: commitments = [], isLoading, isError } = useQuery<UnifiedCommitment[]>({
    queryKey: ['compromissos'],
    queryFn: async () => {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-compromissos`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({}) }
      );
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    enabled: !!token,
  });

  // === Pending transactions query ===
  const { data: pendingItems = [], isLoading: pendingLoading } = useQuery<PendingTransaction[]>({
    queryKey: ['pendentes'],
    queryFn: async () => {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-pendentes`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({}) }
      );
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    enabled: !!token,
  });

  // === Mark as paid mutation ===
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/marcar-pago`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) }
      );
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['contas'] });
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
      toast.success(l.paid);
    },
  });

  // === Commitments logic ===
  const allItems = useMemo(() => {
    return commitments.map(c => {
      const d = new Date(c.data);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { ...c, dateStr };
    });
  }, [commitments]);

  const transactionDates = useMemo(() => {
    const dateMap: Record<string, boolean> = {};
    allItems.forEach(item => { dateMap[item.dateStr] = true; });
    return dateMap;
  }, [allItems]);

  const selectedDateStr = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';
  const selectedItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return allItems.filter(item => item.dateStr === selectedDateStr);
  }, [allItems, selectedDateStr]);

  const upcomingItems = useMemo(() => {
    return allItems.filter(item => item.dateStr >= today).slice(0, 8);
  }, [allItems, today]);

  const getDaysDiff = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    return Math.round((target - local) / (1000 * 60 * 60 * 24));
  };

  const daysWithItems = useMemo(() => {
    return Object.keys(transactionDates).map(d => {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day, 12, 0, 0);
    });
  }, [transactionDates]);

  const renderItemRow = (item: typeof allItems[0], variant: 'full' | 'compact' = 'full') => {
    const isRecorrente = item.tipo === 'recorrente';
    return (
      <div key={item.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${variant === 'full' ? 'bg-secondary/50' : 'border-b border-border last:border-0'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {item.valor ? (
            <ArrowDownRight className={`h-4 w-4 shrink-0 text-destructive`} />
          ) : (
            <Bell className={`h-4 w-4 shrink-0 text-primary`} />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.titulo}</p>
            {variant === 'compact' && (
              <p className="text-[11px] text-muted-foreground">
                {formatDate(item.dateStr)}
                {item.recorrencia && ` • ${item.recorrencia}`}
                {item.dateStr >= today && (() => {
                  const diff = getDaysDiff(item.dateStr);
                  return ` • ${diff === 0 ? l.today : l.inDays.replace('{n}', String(diff))}`;
                })()}
              </p>
            )}
            {item.notas && <p className="text-[11px] text-muted-foreground truncate">{item.notas}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant={isRecorrente ? 'default' : 'outline'} className="text-[10px]">
            {isRecorrente ? l.recorrente : l.temporario}
          </Badge>
          {item.valor != null && item.valor > 0 && (
            <span className="text-sm font-semibold text-destructive">-{formatCurrency(item.valor)}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">{l.loading}</span>
        </div>
      )}

      {isError && (
        <Card className="p-5 text-center text-sm text-destructive">{l.error}</Card>
      )}

      {!isLoading && !isError && (
        <>
          {/* Top row: Calendar + Day details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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

          {/* Bottom row: Upcoming + Pending */}
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
                <Receipt className="h-4 w-4 text-primary" />
                {l.pending}
              </h3>
              {pendingLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{l.noPending}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingItems.map(tx => {
                    const d = new Date(tx.data_transacao);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-2.5 px-3 border-b border-border last:border-0 group">
                        <button
                          onClick={() => markPaidMutation.mutate(tx.id)}
                          disabled={markPaidMutation.isPending}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title={l.markPaid}
                        >
                          <Circle className="h-5 w-5 group-hover:hidden" />
                          <CheckCircle2 className="h-5 w-5 hidden group-hover:block text-primary" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tx.descricao}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDate(dateStr)}</p>
                        </div>
                        <span className="text-sm font-semibold text-destructive shrink-0">
                          -{formatCurrency(tx.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CommitmentsPage;
