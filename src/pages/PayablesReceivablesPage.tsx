import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData, type Transaction } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PayablesReceivablesPage = () => {
  const { t, formatCurrency, formatDate, locale } = useI18n();
  const { transactions, accounts, updateTransaction } = useData();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  const labels: Record<string, Record<string, string>> = {
    pt: { title: 'Contas a Pagar e Receber', subtitle: 'Acompanhe suas pendências financeiras', payable: 'A Pagar', receivable: 'A Receber', all: 'Todos', overdue: 'Vencidos', upcoming: 'A vencer', markPaid: 'Marcar como pago', markReceived: 'Marcar como recebido', noItems: 'Nenhuma pendência', totalPayable: 'Total a Pagar', totalReceivable: 'Total a Receber', overdueLabel: 'Vencido', dueToday: 'Vence hoje', daysLeft: 'dias restantes', daysOverdue: 'dias em atraso' },
    en: { title: 'Payables & Receivables', subtitle: 'Track your financial obligations', payable: 'Payable', receivable: 'Receivable', all: 'All', overdue: 'Overdue', upcoming: 'Upcoming', markPaid: 'Mark as paid', markReceived: 'Mark as received', noItems: 'No pending items', totalPayable: 'Total Payable', totalReceivable: 'Total Receivable', overdueLabel: 'Overdue', dueToday: 'Due today', daysLeft: 'days left', daysOverdue: 'days overdue' },
    es: { title: 'Cuentas por Pagar y Cobrar', subtitle: 'Acompaña tus pendientes financieros', payable: 'Por Pagar', receivable: 'Por Cobrar', all: 'Todos', overdue: 'Vencidos', upcoming: 'Por vencer', markPaid: 'Marcar como pagado', markReceived: 'Marcar como recibido', noItems: 'Sin pendientes', totalPayable: 'Total por Pagar', totalReceivable: 'Total por Cobrar', overdueLabel: 'Vencido', dueToday: 'Vence hoy', daysLeft: 'días restantes', daysOverdue: 'días en atraso' },
    fr: { title: 'Comptes à Payer et à Recevoir', subtitle: 'Suivez vos obligations financières', payable: 'À Payer', receivable: 'À Recevoir', all: 'Tous', overdue: 'En retard', upcoming: 'À venir', markPaid: 'Marquer comme payé', markReceived: 'Marquer comme reçu', noItems: 'Aucun élément en attente', totalPayable: 'Total à Payer', totalReceivable: 'Total à Recevoir', overdueLabel: 'En retard', dueToday: "Dû aujourd'hui", daysLeft: 'jours restants', daysOverdue: 'jours de retard' },
    de: { title: 'Forderungen & Verbindlichkeiten', subtitle: 'Verfolgen Sie Ihre finanziellen Verpflichtungen', payable: 'Zu Zahlen', receivable: 'Zu Empfangen', all: 'Alle', overdue: 'Überfällig', upcoming: 'Anstehend', markPaid: 'Als bezahlt markieren', markReceived: 'Als erhalten markieren', noItems: 'Keine ausstehenden Posten', totalPayable: 'Gesamt zu Zahlen', totalReceivable: 'Gesamt zu Empfangen', overdueLabel: 'Überfällig', dueToday: 'Fällig heute', daysLeft: 'Tage übrig', daysOverdue: 'Tage überfällig' },
  };
  const l = labels[locale] || labels.pt;

  const today = new Date().toISOString().split('T')[0];

  const pendingTransactions = useMemo(() => {
    return transactions.filter(tr => tr.status === 'planned').sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const getFilteredItems = (type: 'expense' | 'income') => {
    let items = pendingTransactions.filter(tr => tr.type === type);
    if (filter === 'overdue') items = items.filter(tr => tr.date < today);
    else if (filter === 'upcoming') items = items.filter(tr => tr.date >= today);
    return items;
  };

  const payables = getFilteredItems('expense');
  const receivables = getFilteredItems('income');

  const totalPayable = payables.reduce((s, tr) => s + tr.amount, 0);
  const totalReceivable = receivables.reduce((s, tr) => s + tr.amount, 0);
  const overduePayables = pendingTransactions.filter(tr => tr.type === 'expense' && tr.date < today).length;
  const overdueReceivables = pendingTransactions.filter(tr => tr.type === 'income' && tr.date < today).length;

  const getDaysInfo = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)} ${l.daysOverdue}`, variant: 'destructive' as const };
    if (diff === 0) return { label: l.dueToday, variant: 'default' as const };
    return { label: `${diff} ${l.daysLeft}`, variant: 'secondary' as const };
  };

  const markAsCompleted = (tr: Transaction) => {
    updateTransaction(tr.id, { status: tr.type === 'income' ? 'received' : 'paid' });
  };

  const renderTable = (items: Transaction[], type: 'expense' | 'income') => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.common.description}</TableHead>
            <TableHead>{t.common.category}</TableHead>
            <TableHead>{t.common.date}</TableHead>
            <TableHead className="text-right">{t.common.amount}</TableHead>
            <TableHead>{t.common.status}</TableHead>
            <TableHead className="w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(tr => {
            const days = getDaysInfo(tr.date);
            const acc = accounts.find(a => a.id === tr.accountId);
            return (
              <TableRow key={tr.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {type === 'expense' ? <ArrowDownRight className="h-3.5 w-3.5 text-destructive" /> : <ArrowUpRight className="h-3.5 w-3.5 text-success" />}
                    {tr.description}
                    {tr.installments && <Badge variant="outline" className="text-[10px]">{tr.currentInstallment}/{tr.installments}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{tr.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(tr.date)}</TableCell>
                <TableCell className={`text-right font-medium ${type === 'expense' ? 'text-destructive' : 'text-success'}`}>
                  {type === 'expense' ? '-' : '+'}{formatCurrency(tr.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={days.variant} className="text-[10px] gap-1">
                    {tr.date < today && <AlertTriangle className="h-3 w-3" />}
                    {tr.date === today && <Clock className="h-3 w-3" />}
                    {days.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markAsCompleted(tr)}>
                    <CheckCircle2 className="h-3 w-3" />
                    {type === 'expense' ? l.markPaid : l.markReceived}
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

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{l.all}</SelectItem>
            <SelectItem value="overdue">{l.overdue}</SelectItem>
            <SelectItem value="upcoming">{l.upcoming}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 card-hover">
          <span className="text-xs font-medium text-muted-foreground">{l.totalPayable}</span>
          <div className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(totalPayable)}</div>
        </Card>
        <Card className="p-4 card-hover">
          <span className="text-xs font-medium text-muted-foreground">{l.totalReceivable}</span>
          <div className="mt-1 text-xl font-semibold text-success">{formatCurrency(totalReceivable)}</div>
        </Card>
        <Card className="p-4 card-hover">
          <span className="text-xs font-medium text-muted-foreground">{l.overdue} ({l.payable})</span>
          <div className="mt-1 text-xl font-semibold text-destructive">{overduePayables}</div>
        </Card>
        <Card className="p-4 card-hover">
          <span className="text-xs font-medium text-muted-foreground">{l.overdue} ({l.receivable})</span>
          <div className="mt-1 text-xl font-semibold text-warning">{overdueReceivables}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payable" className="gap-1.5">
            <ArrowDownRight className="h-3.5 w-3.5" /> {l.payable}
            {payables.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{payables.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="receivable" className="gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> {l.receivable}
            {receivables.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{receivables.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payable">
          {renderTable(payables, 'expense')}
        </TabsContent>

        <TabsContent value="receivable">
          {renderTable(receivables, 'income')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayablesReceivablesPage;
