import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, ArrowRightLeft, Landmark, Wallet, Globe, Building2, TrendingUp } from 'lucide-react';

const typeIcons: Record<string, any> = {
  checking: Landmark,
  digital: Wallet,
  business: Building2,
  international: Globe,
  investment: TrendingUp,
};

const typeLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  digital: 'Conta Digital',
  business: 'Conta PJ',
  international: 'Conta Internacional',
  investment: 'Conta Investimento',
};

const AccountsPage = () => {
  const { t, formatCurrency } = useI18n();
  const { accounts, transactions, addAccount, deleteAccount, transferBetweenAccounts } = useData();
  const [openAdd, setOpenAdd] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'checking' as any, balance: '', institution: '', color: 'hsl(234, 62%, 52%)' });
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '' });

  const handleAdd = () => {
    if (!form.name || !form.balance) return;
    addAccount({ name: form.name, type: form.type, balance: parseFloat(form.balance), institution: form.institution, color: form.color });
    setOpenAdd(false);
    setForm({ name: '', type: 'checking', balance: '', institution: '', color: 'hsl(234, 62%, 52%)' });
  };

  const handleTransfer = () => {
    if (!transfer.from || !transfer.to || !transfer.amount || transfer.from === transfer.to) return;
    transferBetweenAccounts(transfer.from, transfer.to, parseFloat(transfer.amount));
    setOpenTransfer(false);
    setTransfer({ from: '', to: '', amount: '' });
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.accounts.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.accounts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpenTransfer(true)}>
            <ArrowRightLeft className="h-4 w-4" /> Transferir
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" /> {t.common.add}
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <span className="text-xs font-medium text-muted-foreground">{t.dashboard.totalBalance}</span>
        <div className="mt-1 text-2xl font-semibold">{formatCurrency(totalBalance)}</div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {accounts.map(acc => {
          const Icon = typeIcons[acc.type] || Wallet;
          const recentTx = transactions.filter(tr => tr.accountId === acc.id).slice(0, 4);
          return (
            <Card key={acc.id} className="p-5 card-hover">
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
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAccount(acc.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              <div className="mt-3 text-xl font-semibold">{formatCurrency(acc.balance)}</div>
              {recentTx.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {recentTx.map(tr => (
                    <div key={tr.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{tr.description}</span>
                      <span className={`font-medium ${tr.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t.common.add} Conta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
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
              <div className="space-y-1.5"><Label>Saldo inicial</Label><Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Instituição</Label><Input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAdd}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
        <DialogContent className="sm:max-w-md">
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
