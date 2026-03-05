import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Plus, Trash2, ArrowRightLeft, Landmark, Globe, Building2, TrendingUp, Pencil, Eye, X } from 'lucide-react';

const typeIcons: Record<string, any> = {
  checking: Landmark,
  business: Building2,
  international: Globe,
  investment: TrendingUp,
};

const typeLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  business: 'Conta PJ',
  international: 'Conta Internacional',
  investment: 'Conta Investimento',
};

const AccountsPage = () => {
  const { t, formatCurrency, formatDate } = useI18n();
  const { accounts, transactions, addAccount, updateAccount, deleteAccountWithTransactions, moveAccountTransactions, transferBetweenAccounts } = useData();
  const [openAdd, setOpenAdd] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'move'>('delete');
  const [moveToAccount, setMoveToAccount] = useState('');
  const [viewingAccount, setViewingAccount] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'checking' as any, balance: '', institution: '', color: 'hsl(234, 62%, 52%)' });
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '' });

  const handleAdd = () => {
    if (!form.name || !form.balance) return;
    if (editingAccount) {
      updateAccount(editingAccount, { name: form.name, type: form.type, balance: parseFloat(form.balance), institution: form.institution, color: form.color });
      setEditingAccount(null);
    } else {
      addAccount({ name: form.name, type: form.type, balance: parseFloat(form.balance), institution: form.institution, color: form.color });
    }
    setOpenAdd(false);
    setForm({ name: '', type: 'checking', balance: '', institution: '', color: 'hsl(234, 62%, 52%)' });
  };

  const openEdit = (acc: typeof accounts[0]) => {
    setEditingAccount(acc.id);
    setForm({ name: acc.name, type: acc.type, balance: String(acc.balance), institution: acc.institution, color: acc.color });
    setOpenAdd(true);
  };

  const handleTransfer = () => {
    if (!transfer.from || !transfer.to || !transfer.amount || transfer.from === transfer.to) return;
    transferBetweenAccounts(transfer.from, transfer.to, parseFloat(transfer.amount));
    setOpenTransfer(false);
    setTransfer({ from: '', to: '', amount: '' });
  };

  const confirmDelete = () => {
    if (!deletingAccount) return;
    if (deleteAction === 'delete') {
      deleteAccountWithTransactions(deletingAccount);
    } else if (deleteAction === 'move' && moveToAccount) {
      moveAccountTransactions(deletingAccount, moveToAccount);
    }
    setDeletingAccount(null);
    setMoveToAccount('');
  };

  const accountTxCount = (accId: string) => transactions.filter(t => t.accountId === accId).length;

  const viewTransactions = useMemo(() => {
    if (!viewingAccount) return [];
    return transactions.filter(t => t.accountId === viewingAccount).sort((a, b) => b.date.localeCompare(a.date));
  }, [viewingAccount, transactions]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.accounts.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.accounts.subtitle}</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpenTransfer(true)}>
            <ArrowRightLeft className="h-4 w-4" /> <span className="hidden sm:inline">Transferir</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingAccount(null); setForm({ name: '', type: 'checking', balance: '', institution: '', color: 'hsl(234, 62%, 52%)' }); setOpenAdd(true); }}>
            <Plus className="h-4 w-4" /> {t.common.add}
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.totalBalance}</span>
        <div className="mt-1 text-xl sm:text-2xl font-semibold">{formatCurrency(totalBalance)}</div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map(acc => {
          const Icon = typeIcons[acc.type] || Landmark;
          return (
            <Card key={acc.id} className={`p-4 sm:p-5 card-hover ${viewingAccount === acc.id ? 'border-primary' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: acc.color + '20' }}>
                    <Icon className="h-5 w-5" style={{ color: acc.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{acc.name}</h3>
                    <p className="text-xs text-muted-foreground">{typeLabels[acc.type] || acc.type} • {acc.institution}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingAccount(acc.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xl font-semibold">{formatCurrency(acc.balance)}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5 text-xs"
                onClick={() => setViewingAccount(viewingAccount === acc.id ? null : acc.id)}
              >
                <Eye className="h-3.5 w-3.5" /> Ver lançamentos
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Viewing account transactions */}
      {viewingAccount && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Lançamentos — {accounts.find(a => a.id === viewingAccount)?.name}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingAccount(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {viewTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento nesta conta</p>
          ) : (
            <div className="space-y-2">
              {viewTransactions.map(tr => (
                <div key={tr.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0 gap-2">
                  <div className="truncate">
                    <span className="font-medium">{tr.description}</span>
                    <span className="ml-2 text-muted-foreground">{formatDate(tr.date)}</span>
                    <span className="ml-2 text-muted-foreground hidden sm:inline">{tr.category}</span>
                  </div>
                  <span className={`font-medium shrink-0 ${tr.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAccount} onOpenChange={(open) => { if (!open) setDeletingAccount(null); }}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingAccount && accountTxCount(deletingAccount) > 0
                ? `Esta conta possui ${accountTxCount(deletingAccount)} lançamento(s). O que deseja fazer?`
                : 'Tem certeza que deseja excluir esta conta?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingAccount && accountTxCount(deletingAccount) > 0 && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3">
                <input type="radio" id="del" checked={deleteAction === 'delete'} onChange={() => setDeleteAction('delete')} />
                <label htmlFor="del" className="text-sm">Excluir todos os lançamentos</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="radio" id="mov" checked={deleteAction === 'move'} onChange={() => setDeleteAction('move')} />
                <label htmlFor="mov" className="text-sm">Mover lançamentos para outra conta</label>
              </div>
              {deleteAction === 'move' && (
                <Select value={moveToAccount} onValueChange={setMoveToAccount}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.id !== deletingAccount).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Account Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAccount ? t.common.edit : t.common.add} Conta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nome / Instituição</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, institution: e.target.value })} placeholder="Ex: Nubank, Itaú, Wise" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Saldo</Label><Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAdd}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transferência entre contas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={transfer.from} onValueChange={v => setTransfer({ ...transfer, from: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={transfer.to} onValueChange={v => setTransfer({ ...transfer, to: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t.common.amount}</Label><Input type="number" value={transfer.amount} onChange={e => setTransfer({ ...transfer, amount: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTransfer(false)}>{t.common.cancel}</Button>
            <Button onClick={handleTransfer}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPage;
