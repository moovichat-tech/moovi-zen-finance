import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ArrowUpRight, ArrowDownRight, CalendarDays, Plus, Bell, Clock, Trash2, Loader2 } from 'lucide-react';
import { ptBR, enUS, es, fr, de } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Locale } from '@/i18n/translations';

const dateFnsLocales: Record<Locale, DateFnsLocale> = { pt: ptBR, en: enUS, es, fr, de };

interface UnifiedCommitment {
  id: string;
  titulo: string;
  data: string; // ISO string
  tipo: 'recorrente' | 'temporario';
  valor?: number;
  status: string;
  recorrencia?: string | null;
  notas?: string | null;
}

const CommitmentsPage = () => {
  const { formatCurrency, formatDate, locale } = useI18n();
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Compromissos', subtitle: 'Sua agenda financeira e pessoal', noItems: 'Nenhum compromisso nesta data', upcoming: 'Próximos compromissos', recent: 'Compromissos recentes', schedule: 'Agendar compromisso', today: 'Hoje', inDays: 'em {n} dia(s)', recorrente: 'Recorrente', temporario: 'Temporário', selectedDay: 'Compromissos do dia', loading: 'Carregando...', error: 'Erro ao carregar compromissos' },
    en: { title: 'Commitments', subtitle: 'Your financial and personal agenda', noItems: 'No commitments on this date', upcoming: 'Upcoming commitments', recent: 'Recent commitments', schedule: 'Schedule commitment', today: 'Today', inDays: 'in {n} day(s)', recorrente: 'Recurring', temporario: 'Temporary', selectedDay: 'Day commitments', loading: 'Loading...', error: 'Error loading commitments' },
    es: { title: 'Compromisos', subtitle: 'Tu agenda financiera y personal', noItems: 'Sin compromisos en esta fecha', upcoming: 'Próximos compromisos', recent: 'Compromisos recientes', schedule: 'Agendar compromiso', today: 'Hoy', inDays: 'en {n} día(s)', recorrente: 'Recurrente', temporario: 'Temporal', selectedDay: 'Compromisos del día', loading: 'Cargando...', error: 'Error al cargar' },
    fr: { title: 'Engagements', subtitle: 'Votre agenda financier et personnel', noItems: "Aucun engagement à cette date", upcoming: 'Prochains engagements', recent: 'Engagements récents', schedule: 'Planifier un engagement', today: "Aujourd'hui", inDays: 'dans {n} jour(s)', recorrente: 'Récurrent', temporario: 'Temporaire', selectedDay: 'Engagements du jour', loading: 'Chargement...', error: 'Erreur de chargement' },
    de: { title: 'Verpflichtungen', subtitle: 'Ihre finanzielle und persönliche Agenda', noItems: 'Keine Verpflichtungen', upcoming: 'Kommende Verpflichtungen', recent: 'Letzte Verpflichtungen', schedule: 'Verpflichtung planen', today: 'Heute', inDays: 'in {n} Tag(en)', recorrente: 'Wiederkehrend', temporario: 'Temporär', selectedDay: 'Tagesverpflichtungen', loading: 'Laden...', error: 'Fehler beim Laden' },
  };
  const l = labels[locale] || labels.pt;

  const todayLocal = new Date();
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
  const dfLocale = dateFnsLocales[locale];

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const { data: commitments = [], isLoading, isError } = useQuery<UnifiedCommitment[]>({
    queryKey: ['compromissos'],
    queryFn: async () => {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-compromissos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) throw new Error('Fetch failed');
      return res.json();
    },
    enabled: !!token,
  });

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

  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const selectedItems = useMemo(() => {
    if (!selectedDateStr) return [];
    return allItems.filter(item => item.dateStr === selectedDateStr);
  }, [allItems, selectedDateStr]);

  const upcomingItems = useMemo(() => {
    return allItems.filter(item => item.dateStr >= today).slice(0, 8);
  }, [allItems, today]);

  const recentItems = useMemo(() => {
    return allItems.filter(item => item.dateStr < today).sort((a, b) => b.dateStr.localeCompare(a.dateStr)).slice(0, 6);
  }, [allItems, today]);

  const daysWithItems = useMemo(() => {
    return Object.keys(transactionDates).map(d => new Date(d + 'T12:00:00'));
  }, [transactionDates]);

  const getDaysDiff = (dateStr: string) => {
    return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderItemRow = (item: typeof allItems[0], variant: 'full' | 'compact' | 'muted' = 'full') => {
    const isMuted = variant === 'muted';
    const isRecorrente = item.tipo === 'recorrente';
    return (
      <div key={item.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${variant === 'full' ? 'bg-secondary/50' : ''} ${variant !== 'full' ? 'border-b border-border last:border-0' : ''}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {item.valor ? (
            <ArrowDownRight className={`h-4 w-4 shrink-0 ${isMuted ? 'text-muted-foreground' : 'text-destructive'}`} />
          ) : (
            <Bell className={`h-4 w-4 shrink-0 ${isMuted ? 'text-muted-foreground' : 'text-primary'}`} />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isMuted ? 'text-muted-foreground' : ''}`}>
              {item.titulo}
            </p>
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
            {variant === 'muted' && (
              <p className="text-[11px] text-muted-foreground">{formatDate(item.dateStr)}</p>
            )}
            {item.notas && <p className="text-[11px] text-muted-foreground truncate">{item.notas}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant={isRecorrente ? 'default' : 'outline'} className="text-[10px]">
            {isRecorrente ? l.recorrente : l.temporario}
          </Badge>
          {item.valor != null && item.valor > 0 && (
            <span className="text-sm font-semibold text-destructive">
              -{formatCurrency(item.valor)}
            </span>
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
        </>
      )}
    </div>
  );
};

export default CommitmentsPage;
