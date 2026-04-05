import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

const PayablesReceivablesPage = () => {
  const { t, formatCurrency, formatDate, locale } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Contas a Pagar e Receber', subtitle: 'Acompanhe suas pendências financeiras', payable: 'A Pagar', receivable: 'A Receber', all: 'Todos', overdue: 'Vencidos', upcoming: 'A vencer', markPaid: 'Pago', markReceived: 'Recebido', noItems: 'Nenhuma pendência', totalPayable: 'Total a Pagar', totalReceivable: 'Total a Receber', overdueLabel: 'Vencido', dueToday: 'Vence hoje', daysLeft: 'dias restantes', daysOverdue: 'dias em atraso', paidSuccess: 'Pagamento concluído com sucesso!', receivedSuccess: 'Recebimento confirmado com sucesso!' },
    en: { title: 'Payables & Receivables', subtitle: 'Track your financial obligations', payable: 'Payable', receivable: 'Receivable', all: 'All', overdue: 'Overdue', upcoming: 'Upcoming', markPaid: 'Paid', markReceived: 'Received', noItems: 'No pending items', totalPayable: 'Total Payable', totalReceivable: 'Total Receivable', overdueLabel: 'Overdue', dueToday: 'Due today', daysLeft: 'days left', daysOverdue: 'days overdue', paidSuccess: 'Payment completed successfully!', receivedSuccess: 'Receipt confirmed successfully!' },
    es: { title: 'Cuentas por Pagar y Cobrar', subtitle: 'Acompaña tus pendientes financieros', payable: 'Por Pagar', receivable: 'Por Cobrar', all: 'Todos', overdue: 'Vencidos', upcoming: 'Por vencer', markPaid: 'Pagado', markReceived: 'Recibido', noItems: 'Sin pendientes', totalPayable: 'Total por Pagar', totalReceivable: 'Total por Cobrar', overdueLabel: 'Vencido', dueToday: 'Vence hoy', daysLeft: 'días restantes', daysOverdue: 'días en atraso', paidSuccess: '¡Pago completado!', receivedSuccess: '¡Recibo confirmado!' },
    fr: { title: 'Comptes à Payer et à Recevoir', subtitle: 'Suivez vos obligations financières', payable: 'À Payer', receivable: 'À Recevoir', all: 'Tous', overdue: 'En retard', upcoming: 'À venir', markPaid: 'Payé', markReceived: 'Reçu', noItems: 'Aucun élément en attente', totalPayable: 'Total à Payer', totalReceivable: 'Total à Recevoir', overdueLabel: 'En retard', dueToday: "Dû aujourd'hui", daysLeft: 'jours restants', daysOverdue: 'jours de retard', paidSuccess: 'Paiement effectué!', receivedSuccess: 'Réception confirmée!' },
    de: { title: 'Forderungen & Verbindlichkeiten', subtitle: 'Verfolgen Sie Ihre finanziellen Verpflichtungen', payable: 'Zu Zahlen', receivable: 'Zu Empfangen', all: 'Alle', overdue: 'Überfällig', upcoming: 'Anstehend', markPaid: 'Bezahlt', markReceived: 'Erhalten', noItems: 'Keine ausstehenden Posten', totalPayable: 'Gesamt zu Zahlen', totalReceivable: 'Gesamt zu Empfangen', overdueLabel: 'Überfällig', dueToday: 'Fällig heute', daysLeft: 'Tage übrig', daysOverdue: 'Tage überfällig', paidSuccess: 'Zahlung abgeschlossen!', receivedSuccess: 'Empfang bestätigt!' },
  };
  const l = labels[locale] || labels.pt;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const isOverdue = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const { data: rawPendentes = [], isLoading } = useQuery<PendingTransaction[]>({
    queryKey: ['pendentes-payables'],
    queryFn: async () => {
      const res = await fetch(`${supabaseUrl}/functions/v1/get-pendentes`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erro ao buscar pendentes');
      return res.json();
    },
    enabled: !!token,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/marcar-pago`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Erro ao marcar como pago');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendentes-payables'] });
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['contas'] });
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
    },
  });

  const pendingTransactions = useMemo(() => {
    return [...rawPendentes].sort((a, b) => {
      const aOver = isOverdue(a.data_transacao);
      const bOver = isOverdue(b.data_transacao);
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      return (a.data_transacao || '').localeCompare(b.data_transacao || '');
    });
  }, [rawPendentes, todayStr]);

  const getFilteredItems = (tipo: 'despesa' | 'receita') => {
    let items = pendingTransactions.filter(tr => tr.tipo === tipo);
    if (filter === 'overdue') items = items.filter(tr => isOverdue(tr.data_transacao));
    else if (filter === 'upcoming') items = items.filter(tr => !isOverdue(tr.data_transacao));
    return items;
  };

  const payables = getFilteredItems('despesa');
  const receivables = getFilteredItems('receita');

  const totalPayable = payables.reduce((s, tr) => s + (parseFloat(String(tr.valor)) || 0), 0);
  const totalReceivable = receivables.reduce((s, tr) => s + (parseFloat(String(tr.valor)) || 0), 0);
  const overduePayables = pendingTransactions.filter(tr => tr.tipo === 'despesa' && isOverdue(tr.data_transacao)).length;
  const overdueReceivables = pendingTransactions.filter(tr => tr.tipo === 'receita' && isOverdue(tr.data_transacao)).length;

  const getDaysInfo = (dateStr: string) => {
    if (!dateStr) return { label: '-', variant: 'secondary' as const };
    const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
    if (isNaN(d.getTime())) return { label: '-', variant: 'secondary' as const };
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)} ${l.daysOverdue}`, variant: 'destructive' as const };
    if (diff === 0) return { label: l.dueToday, variant: 'default' as const };
    return { label: `${diff} ${l.daysLeft}`, variant: 'secondary' as const };
  };

  const handleMarkPaid = (tr: PendingTransaction) => {
    markPaidMutation.mutate(tr.id, {
      onSuccess: () => {
        toast.success(
          tr.tipo === 'receita' ? l.receivedSuccess : l.paidSuccess,
          {
            description: `${tr.descricao} — ${formatCurrency(parseFloat(String(tr.valor)) || 0)}`,
            position: 'bottom-right',
            style: { backgroundColor: 'hsl(152, 60%, 42%)', color: '#fff', border: 'none' },
            descriptionClassName: 'text-white/90',
          }
        );
      },
    });
  };

  const renderTable = (items: PendingTransaction[], tipo: 'despesa' | 'receita') => (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.common.description}</TableHead>
            <TableHead className="hidden sm:table-cell">{t.common.category}</TableHead>
            <TableHead>{t.common.date}</TableHead>
            <TableHead className="text-right">{t.common.amount}</TableHead>
            <TableHead>{t.common.status}</TableHead>
            <TableHead className="w-24 sm:w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(tr => {
            const dateStr = tr.data_transacao || '';
            const days = getDaysInfo(dateStr);
            const overdue = isOverdue(dateStr);
            const valor = parseFloat(String(tr.valor)) || 0;
            return (
              <TableRow key={tr.id} className={overdue ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {tipo === 'despesa' ? <ArrowDownRight className={`h-3.5 w-3.5 shrink-0 text-destructive`} /> : <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${overdue ? 'text-destructive' : 'text-success'}`} />}
                    <span className={`truncate max-w-[100px] sm:max-w-none ${overdue ? 'text-destructive' : ''}`}>{tr.descricao}</span>
                    {overdue && <Badge variant="destructive" className="text-[9px] px-1 py-0 shrink-0">ATRASADO</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{tr.categoria}</TableCell>
                <TableCell className={`text-sm whitespace-nowrap ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{formatDate(dateStr)}</TableCell>
                <TableCell className={`text-right font-medium whitespace-nowrap ${tipo === 'despesa' ? 'text-destructive' : 'text-success'}`}>
                  {tipo === 'despesa' ? '-' : '+'}{formatCurrency(valor)}
                </TableCell>
                <TableCell>
                  <Badge variant={days.variant} className="text-[10px] gap-1">
                    {overdue && <AlertTriangle className="h-3 w-3" />}
                    {!overdue && dateStr === todayStr && <Clock className="h-3 w-3" />}
                    <span className="hidden sm:inline">{days.label}</span>
                    <span className="sm:hidden">{overdue ? '!' : days.label.split(' ')[0]}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={markPaidMutation.isPending}
                    onClick={() => handleMarkPaid(tr)}
                  >
                    {markPaidMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    <span className="hidden sm:inline">{tipo === 'despesa' ? l.markPaid : l.markReceived}</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">{l.noItems}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-28 sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l.all}</SelectItem>
            <SelectItem value="overdue">{l.overdue}</SelectItem>
            <SelectItem value="upcoming">{l.upcoming}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 card-hover">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{l.totalPayable}</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-destructive">{formatCurrency(totalPayable)}</div>
        </Card>
        <Card className="p-3 sm:p-4 card-hover">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{l.totalReceivable}</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-success">{formatCurrency(totalReceivable)}</div>
        </Card>
        <Card className="p-3 sm:p-4 card-hover">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{l.overdue} ({l.payable})</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-destructive">{overduePayables}</div>
        </Card>
        <Card className="p-3 sm:p-4 card-hover">
          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{l.overdue} ({l.receivable})</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-warning">{overdueReceivables}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payable" className="gap-1.5 text-xs sm:text-sm">
            <ArrowDownRight className="h-3.5 w-3.5" /> {l.payable}
            {payables.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{payables.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="receivable" className="gap-1.5 text-xs sm:text-sm">
            <ArrowUpRight className="h-3.5 w-3.5" /> {l.receivable}
            {receivables.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{receivables.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payable">
          {renderTable(payables, 'despesa')}
        </TabsContent>

        <TabsContent value="receivable">
          {renderTable(receivables, 'receita')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayablesReceivablesPage;
