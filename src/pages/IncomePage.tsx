import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Pencil, Search, ArrowUpRight, ArrowUpDown } from 'lucide-react';
import { TransactionFormDialog, useTransactionForm } from '@/components/TransactionFormDialog';
import { DatePicker } from '@/components/DatePicker';

type SortKey = 'description' | 'category' | 'date' | 'amount' | 'status';

const IncomePage = () => {
  const { t, formatCurrency, formatDate, translateRecurrence, translatePeriod } = useI18n();
  const { transactions, deleteTransaction } = useData();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('month');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const { open, setOpen, editingId, initialData, openAdd, openEdit } = useTransactionForm('income');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const incomes = useMemo(() => {
    let filtered = transactions
      .filter(tr => tr.type === 'income')
      .filter(tr => tr.description.toLowerCase().includes(search.toLowerCase()));

    if (period === 'month') filtered = filtered.filter(tr => tr.date.startsWith(filterMonth));
    else if (period === 'year') filtered = filtered.filter(tr => tr.date.startsWith(filterYear));
    else if (period === 'custom' && customStart && customEnd) filtered = filtered.filter(tr => tr.date >= customStart && tr.date <= customEnd);

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'description') cmp = a.description.localeCompare(b.description);
      else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [transactions, search, period, filterMonth, filterYear, customStart, customEnd, sortKey, sortAsc]);

  const totalReceived = incomes.filter(i => i.status === 'received').reduce((s, i) => s + i.amount, 0);
  const totalPlanned = incomes.filter(i => i.status === 'planned').reduce((s, i) => s + i.amount, 0);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.filter(tr => tr.type === 'income').forEach(tr => set.add(tr.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.filter(tr => tr.type === 'income').forEach(tr => set.add(tr.date.substring(0, 4)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const SortableHead = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.income.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.income.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.received}</span>
          <div className="mt-1 text-xl font-semibold text-success">{formatCurrency(totalReceived)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.planned}</span>
          <div className="mt-1 text-xl font-semibold text-muted-foreground">{formatCurrency(totalPlanned)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Total</span>
          <div className="mt-1 text-xl font-semibold">{formatCurrency(totalReceived + totalPlanned)}</div>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{translatePeriod('all')}</SelectItem>
            <SelectItem value="month">{translatePeriod('month')}</SelectItem>
            <SelectItem value="year">{translatePeriod('year')}</SelectItem>
            <SelectItem value="custom">{translatePeriod('custom')}</SelectItem>
          </SelectContent>
        </Select>
        {period === 'month' && (
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {period === 'year' && (
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {period === 'custom' && (
          <>
            <DatePicker value={customStart} onChange={setCustomStart} placeholder="Data início" className="w-44" />
            <DatePicker value={customEnd} onChange={setCustomEnd} placeholder="Data fim" className="w-44" />
          </>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label={t.common.description} field="description" />
              <SortableHead label={t.common.category} field="category" />
              <SortableHead label={t.common.date} field="date" />
              <SortableHead label={t.common.status} field="status" />
              <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  {t.common.amount}
                  <ArrowUpDown className={`h-3 w-3 ${sortKey === 'amount' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                </div>
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.map(inc => (
              <TableRow key={inc.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                    {inc.description}
                    {inc.installments && <Badge variant="outline" className="text-[10px]">{inc.currentInstallment}/{inc.installments}</Badge>}
                    {inc.recurrence !== 'once' && !inc.installments && <Badge variant="secondary" className="text-[10px]">{translateRecurrence(inc.recurrence)}</Badge>}
                    {inc.fixed && <Badge variant="secondary" className="text-[10px]">{t.common.status === 'Status' ? 'fixed' : 'fixa'}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{inc.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(inc.date)}</TableCell>
                <TableCell>
                  <Badge variant={inc.status === 'received' ? 'default' : 'secondary'} className="text-[10px]">
                    {inc.status === 'received' ? t.common.received : t.common.planned}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-success">{formatCurrency(inc.amount)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(inc)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransaction(inc.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {incomes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma receita encontrada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <TransactionFormDialog type="income" open={open} onOpenChange={setOpen} editingId={editingId} initialData={initialData} />
    </div>
  );
};

export default IncomePage;
