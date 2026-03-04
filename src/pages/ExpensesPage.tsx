import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData, type Transaction } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Pencil, Search, ArrowDownRight, ArrowUpDown } from 'lucide-react';

type SortKey = 'description' | 'category' | 'date' | 'amount' | 'status';

const ExpensesPage = () => {
  const { t, formatCurrency, formatDate, translateRecurrence, translatePeriod, locale } = useI18n();
  const { transactions, accounts, cards, categories, addTransaction, deleteTransaction, updateTransaction } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const expenses = useMemo(() => {
    let filtered = transactions
      .filter(tr => tr.type === 'expense')
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

  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPlanned = expenses.filter(e => e.status === 'planned').reduce((s, e) => s + e.amount, 0);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.filter(tr => tr.type === 'expense').forEach(tr => set.add(tr.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.filter(tr => tr.type === 'expense').forEach(tr => set.add(tr.date.substring(0, 4)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const [form, setForm] = useState({
    description: '', amount: '', category: categories.expense[0] || '', date: new Date().toISOString().split('T')[0],
    status: 'paid' as 'paid' | 'planned', recurrence: 'once' as Transaction['recurrence'],
    accountId: '', cardId: '', installments: '', fixed: false, tags: '',
  });

  const resetForm = () => setForm({ description: '', amount: '', category: categories.expense[0] || '', date: new Date().toISOString().split('T')[0], status: 'paid', recurrence: 'once', accountId: '', cardId: '', installments: '', fixed: false, tags: '' });

  const openAdd = () => { setEditingId(null); resetForm(); setOpen(true); };

  const openEdit = (tr: Transaction) => {
    setEditingId(tr.id);
    setForm({ description: tr.description, amount: String(tr.amount), category: tr.category, date: tr.date, status: tr.status as any, recurrence: tr.recurrence, accountId: tr.accountId, cardId: tr.cardId || '', installments: '', fixed: tr.fixed || false, tags: tr.tags?.join(', ') || '' });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.accountId) return;
    if (editingId) {
      updateTransaction(editingId, {
        type: 'expense', description: form.description, amount: parseFloat(form.amount),
        category: form.category, date: form.date, status: form.status,
        recurrence: form.recurrence, accountId: form.accountId,
        cardId: form.cardId || undefined, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [], fixed: form.fixed,
      });
    } else {
      const inst = form.installments ? parseInt(form.installments) : undefined;
      if (inst && inst > 1) {
        const amount = parseFloat(form.amount) / inst;
        for (let i = 0; i < inst; i++) {
          const date = new Date(form.date);
          date.setMonth(date.getMonth() + i);
          addTransaction({
            type: 'expense', description: form.description, amount,
            category: form.category, date: date.toISOString().split('T')[0],
            status: i === 0 ? 'paid' : 'planned', recurrence: 'once',
            accountId: form.accountId, cardId: form.cardId || undefined,
            installments: inst, currentInstallment: i + 1,
            tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [], fixed: form.fixed,
          });
        }
      } else {
        addTransaction({
          type: 'expense', description: form.description, amount: parseFloat(form.amount),
          category: form.category, date: form.date, status: form.status,
          recurrence: form.recurrence, accountId: form.accountId,
          cardId: form.cardId || undefined, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [], fixed: form.fixed,
        });
      }
    }
    setOpen(false);
    resetForm();
  };

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
          <h2 className="text-xl font-semibold">{t.pages.expenses.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.expenses.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.paid}</span>
          <div className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(totalPaid)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.planned}</span>
          <div className="mt-1 text-xl font-semibold text-muted-foreground">{formatCurrency(totalPlanned)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Total</span>
          <div className="mt-1 text-xl font-semibold">{formatCurrency(totalPaid + totalPlanned)}</div>
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
            <Input type="date" className="w-36" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <Input type="date" className="w-36" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
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
            {expenses.map(exp => (
              <TableRow key={exp.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                    {exp.description}
                    {exp.installments && <Badge variant="outline" className="text-[10px]">{exp.currentInstallment}/{exp.installments}</Badge>}
                    {exp.recurrence !== 'once' && !exp.installments && <Badge variant="secondary" className="text-[10px]">{translateRecurrence(exp.recurrence)}</Badge>}
                    {exp.fixed && <Badge variant="secondary" className="text-[10px]">{locale === 'pt' ? 'fixa' : locale === 'en' ? 'fixed' : locale === 'es' ? 'fija' : locale === 'fr' ? 'fixe' : 'fest'}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{exp.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(exp.date)}</TableCell>
                <TableCell>
                  <Badge variant={exp.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                    {exp.status === 'paid' ? t.common.paid : t.common.planned}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">-{formatCurrency(exp.amount)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exp)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransaction(exp.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma despesa encontrada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? t.common.edit : t.common.add} {t.common.expense}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.description}</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.common.amount}</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.date}</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.common.category}</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.expense.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!editingId && (
                <div className="space-y-1.5">
                  <Label>Parcelas</Label>
                  <Input type="number" placeholder="1" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cartão (opcional)</Label>
                <Select value={form.cardId} onValueChange={v => setForm({ ...form, cardId: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.fixed} onCheckedChange={v => setForm({ ...form, fixed: v })} />
              <Label>Despesa fixa</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ex: tech, assinatura" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSubmit}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesPage;
