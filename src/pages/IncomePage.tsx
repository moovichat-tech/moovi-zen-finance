import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData, type Transaction } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Search, ArrowUpRight } from 'lucide-react';

const IncomePage = () => {
  const { t, formatCurrency } = useI18n();
  const { transactions, accounts, categories, addTransaction, deleteTransaction } = useData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const incomes = useMemo(() =>
    transactions
      .filter(tr => tr.type === 'income')
      .filter(tr => tr.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, search]
  );

  const totalReceived = incomes.filter(i => i.status === 'received').reduce((s, i) => s + i.amount, 0);
  const totalPlanned = incomes.filter(i => i.status === 'planned').reduce((s, i) => s + i.amount, 0);

  const [form, setForm] = useState({
    description: '', amount: '', category: categories.income[0], date: new Date().toISOString().split('T')[0],
    status: 'received' as 'received' | 'planned', recurrence: 'once' as Transaction['recurrence'], accountId: '',
    tags: '',
  });

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.accountId) return;
    addTransaction({
      type: 'income', description: form.description, amount: parseFloat(form.amount),
      category: form.category, date: form.date, status: form.status,
      recurrence: form.recurrence, accountId: form.accountId,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
    });
    setOpen(false);
    setForm({ description: '', amount: '', category: categories.income[0], date: new Date().toISOString().split('T')[0], status: 'received', recurrence: 'once', accountId: '', tags: '' });
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.income.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.income.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      {/* Summary Cards */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.description}</TableHead>
              <TableHead>{t.common.category}</TableHead>
              <TableHead>{t.common.date}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead className="text-right">{t.common.amount}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.map(inc => (
              <TableRow key={inc.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                    {inc.description}
                    {inc.recurrence !== 'once' && (
                      <Badge variant="secondary" className="text-[10px]">{inc.recurrence}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{inc.category}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{inc.date}</TableCell>
                <TableCell>
                  <Badge variant={inc.status === 'received' ? 'default' : 'secondary'} className="text-[10px]">
                    {inc.status === 'received' ? t.common.received : t.common.planned}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-success">{formatCurrency(inc.amount)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransaction(inc.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {incomes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma receita encontrada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t.common.add} {t.common.income}</DialogTitle></DialogHeader>
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
                    {categories.income.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.status}</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">{t.common.received}</SelectItem>
                    <SelectItem value="planned">{t.common.planned}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Única</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ex: freelance, web" />
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

export default IncomePage;
