import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ArrowRightLeft, Landmark, Globe, Building2, TrendingUp, Pencil, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Conta {
  id: number | string;
  nome: string;
  tipo: string | null;
  icone: string | null;
  saldo_inicial: number | null;
  saldo_atual: number | string | null;
}

interface Transacao {
  id: number | string;
  tipo: string;
  valor: number;
  descricao: string;
  categoria: string;
  cartao: string;
  data_transacao: string;
  conta: string;
  status: string;
}

async function callApi(fnName: string, token: string, body?: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

const typeIcons: Record<string, any> = {
  corrente: Landmark,
  poupanca: Landmark,
  pj: Building2,
  internacional: Globe,
  investimento: TrendingUp,
};

const typeLabels: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Conta Poupança',
  pj: 'Conta PJ',
  internacional: 'Conta Internacional',
  investimento: 'Conta Investimento',
};

const AccountsPage = () => {
  const { t, formatCurrency, formatDate } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Conta | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'move'>('delete');
  const [moveToAccount, setMoveToAccount] = useState('');
  const [sheetAccountName, setSheetAccountName] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'corrente', balance: '', institution: '', color: 'hsl(234, 62%, 52%)' });
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '' });

  const { data: contas = [] } = useQuery<Conta[]>({
    queryKey: ['contas'],
    queryFn: () => callApi('get-contas', token!),
    enabled: !!token,
  });

  const { data: sheetTransacoes = [], isLoading: isLoadingTransacoes } = useQuery<Transacao[]>({
    queryKey: ['transacoes-conta', sheetAccountName],
    queryFn: () => callApi('get-transacoes-conta', token!, { conta: sheetAccountName }),
    enabled: !!token && !!sheetAccountName,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => callApi('create-conta', token!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contas'] }); toast.success('Conta criada!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => callApi('update-conta', token!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contas'] }); toast.success('Conta atualizada!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => callApi('delete-conta', token!, { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contas'] }); toast.success('Conta excluída!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const accounts = useMemo(() => contas.map(c => ({
    id: String(c.id),
    name: c.nome,
    type: (c.tipo || 'corrente').toLowerCase(),
    balance: Number(c.saldo_atual) || 0,
    institution: c.nome,
    color: 'hsl(234, 62%, 52%)',
  })), [contas]);

  const handleAdd = () => {
    if (!form.name || !form.balance) return;
    const payload = {
      nome: form.name,
      tipo: form.type || null,
      saldo_inicial: parseFloat(form.balance),
    };
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
    setOpenAdd(false);
    setForm({ name: '', type: 'corrente', balance: '', institution: '', color: 'hsl(234, 62%, 52%)' });
    setEditingAccount(null);
  };

  const openEdit = (acc: typeof accounts[0]) => {
    const conta = contas.find(c => String(c.id) === acc.id);
    if (!conta) return;
    setEditingAccount(conta);
    setForm({ name: conta.nome, type: (conta.tipo || 'corrente').toLowerCase(), balance: String(conta.saldo_inicial || 0), institution: conta.nome, color: 'hsl(234, 62%, 52%)' });
    setOpenAdd(true);
  };

  const transferMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => callApi('create-transferencia', token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-conta'] });
      toast.success('Transferência realizada com sucesso!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleTransfer = () => {
    if (!transfer.from || !transfer.to || !transfer.amount || transfer.from === transfer.to) {
      if (transfer.from === transfer.to && transfer.from) {
        toast.error('Conta de origem e destino devem ser diferentes.');
      }
      return;
    }
    const fromAcc = accounts.find(a => a.id === transfer.from);
    const toAcc = accounts.find(a => a.id === transfer.to);
    if (!fromAcc || !toAcc) return;
    transferMutation.mutate({
      conta_origem: fromAcc.name,
      conta_destino: toAcc.name,
      valor: parseFloat(transfer.amount),
    });
    setOpenTransfer(false);
    setTransfer({ from: '', to: '', amount: '' });
  };

  const confirmDelete = () => {
    if (!deletingAccount) return;
    deleteMutation.mutate(deletingAccount);
    setDeletingAccount(null);
    setMoveToAccount('');
  };

  const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  const statusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'PAGO') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    if (s === 'PENDENTE') return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    return 'bg-muted text-muted-foreground';
  };

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
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingAccount(null); setForm({ name: '', type: 'corrente', balance: '', institution: '', color: 'hsl(234, 62%, 52%)' }); setOpenAdd(true); }}>
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
            <Card key={acc.id} className="p-4 sm:p-5 card-hover">
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
                onClick={() => setSheetAccountName(acc.name)}
              >
                <Eye className="h-3.5 w-3.5" /> Ver lançamentos
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Sheet de Lançamentos da Conta */}
      <Sheet open={!!sheetAccountName} onOpenChange={(open) => { if (!open) setSheetAccountName(null); }}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="text-base">Lançamentos — {sheetAccountName}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="p-6 space-y-3">
              {isLoadingTransacoes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sheetTransacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Nenhum lançamento nesta conta</p>
              ) : (
                sheetTransacoes.map(tr => (
                  <div key={tr.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tr.descricao}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tr.data_transacao?.split('T')[0] || tr.data_transacao)}
                        </span>
                        <span className="text-xs text-muted-foreground">{tr.categoria}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(tr.status)}`}>
                          {tr.status}
                        </Badge>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${tr.tipo === 'receita' ? 'text-emerald-500' : 'text-destructive'}`}>
                      {tr.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(tr.valor) || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAccount} onOpenChange={(open) => { if (!open) setDeletingAccount(null); }}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingAccount && accounts.length > 1 && (
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
              <div className="space-y-1.5"><Label>Saldo Inicial</Label><Input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
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
