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
import { Plus, Trash2, Search, ArrowDownRight } from 'lucide-react';

const ExpensesPage = () => {
  const { t, formatCurrency } = useI18n();
  const { transactions, accounts, cards, categories, addTransaction, deleteTransaction } = useData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const expenses = useMemo(() =>
    transactions
      .filter(tr => tr.type === 'expense')
      .filter(tr => tr.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, search]
  );

  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const totalPlanned = expenses.filter(e => e.status === 'planned').reduce((s, e) => s + e.amount, 0);

  const [form, setForm] = useState({
    description: '', amount: '', category: categories.expense[0], date: new Date().toISOString().split('T')[0],
    status: 'paid' as 'paid' | 'planned', recurrence: 'once' as Transaction['recurrence'],
    accountId: '', cardId: '', installments: '', fixed: false, tags: '',
  });

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.accountId) return;
    const inst = form.installments ? parseInt(form.installments) : undefined;
    if (inst && inst > 1) {
      // Create installment transactions
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
          tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
          fixed: form.fixed,
        });
      }
    } else {
      addTransaction({
        type: 'expense', description: form.description, amount: parseFloat(form.amount),
        category: form.category, date: form.date, status: form.status,
        recurrence: form.recurrence, accountId: form.accountId,
        cardId: form.cardId || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        fixed: form.fixed,
      });
    }
    setOpen(false);
    setForm({ description: '', amount: '', category: categories.expense[0], date: new Date().toISOString().split('T')[0], status: 'paid', recurrence: 'once', accountId: '', cardId: '', installments: '', fixed: false, tags: '' });
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.expenses.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.expenses.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

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
            {expenses.map(exp => (
              <TableRow key={exp.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                    {exp.description}
                    {exp.installments && (
                      <Badge variant="outline" className="text-[10px] font-mono">{exp.currentInstallment}/{exp.installments}</Badge>
                    )}
                    {exp.recurrence !== 'once' && !exp.installments && (
                      <Badge variant="secondary" className="text-[10px]">{exp.recurrence}</Badge>
                    )}
                    {exp.fixed && <Badge variant="secondary" className="text-[10px]">fixa</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{exp.category}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{exp.date}</TableCell>
                <TableCell>
                  <Badge variant={exp.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                    {exp.status === 'paid' ? t.common.paid : t.common.planned}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-destructive">-{formatCurrency(exp.amount)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransaction(exp.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
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
          <DialogHeader><DialogTitle>{t.common.add} {t.common.expense}</DialogTitle></DialogHeader>
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
              <div className="space-y-1.5">
                <Label>Parcelas</Label>
                <Input type="number" placeholder="1" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} />
              </div>
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
