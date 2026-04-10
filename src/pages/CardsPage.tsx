import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import PlanGuard from '@/components/PlanGuard';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, CreditCard, Pencil, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Cartao {
  id: number | string;
  nome: string;
  nome_conta: string | null;
  icone: string | null;
  limite_total: number | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  tipo_cartao: string | null;
  ultimos_digitos: string | null;
  gasto_total: number | string | null;
}

interface Conta {
  id: number | string;
  nome: string;
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

const CardsPage = () => {
  const { t, formatCurrency } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Cartao | null>(null);
  const [sheetCardName, setSheetCardName] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', lastDigits: '', limit: '', closingDay: '3', dueDay: '10', nomeConta: '' });

  const { data: cartoes = [] } = useQuery<Cartao[]>({
    queryKey: ['cartoes'],
    queryFn: () => callApi('get-cartoes', token!),
    enabled: !!token,
  });

  const { data: contas = [] } = useQuery<Conta[]>({
    queryKey: ['contas'],
    queryFn: () => callApi('get-contas', token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => callApi('create-cartao', token!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cartoes'] }); toast.success('Cartão criado!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => callApi('update-cartao', token!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cartoes'] }); toast.success('Cartão atualizado!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => callApi('delete-cartao', token!, { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cartoes'] }); toast.success('Cartão excluído!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Map API data to the shape used in the UI
  const cards = useMemo(() => cartoes.map(c => ({
    id: String(c.id),
    name: c.nome,
    lastDigits: c.ultimos_digitos || '',
    limit: c.limite_total || 0,
    closingDay: c.dia_fechamento || 1,
    dueDay: c.dia_vencimento || 10,
    color: 'hsl(234, 62%, 52%)',
    nomeConta: c.nome_conta || null,
    gastoTotal: Number(c.gasto_total) || 0,
  })), [cartoes]);

  const openAdd = () => {
    setEditingCard(null);
    setForm({ name: '', lastDigits: '', limit: '', closingDay: '3', dueDay: '10', nomeConta: '' });
    setOpen(true);
  };

  const openEdit = (cardId: string) => {
    const cartao = cartoes.find(c => String(c.id) === cardId);
    if (!cartao) return;
    setEditingCard(cartao);
    setForm({
      name: cartao.nome,
      lastDigits: cartao.ultimos_digitos || '',
      limit: String(cartao.limite_total || ''),
      closingDay: String(cartao.dia_fechamento || ''),
      dueDay: String(cartao.dia_vencimento || ''),
      nomeConta: cartao.nome_conta || '',
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.limit) return;
    const payload = {
      nome: form.name,
      ultimos_digitos: form.lastDigits || null,
      limite_total: parseFloat(form.limit),
      dia_fechamento: form.closingDay ? parseInt(form.closingDay) : null,
      dia_vencimento: form.dueDay ? parseInt(form.dueDay) : null,
      nome_conta: form.nomeConta || form.name,
    };
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
    setOpen(false);
  };

  // Fetch transactions for selected card
  const { data: transacoesCartao = [], isLoading: loadingTx } = useQuery<Transacao[]>({
    queryKey: ['transacoes-cartao', sheetCardName],
    queryFn: () => callApi('get-transacoes-cartao', token!, { cartao: sheetCardName }),
    enabled: !!token && !!sheetCardName,
  });


  const selectedCardData = sheetCardName ? cards.find(c => c.name === sheetCardName) : null;

  const formatTxDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <PlanGuard requiredPlan="premium" featureName="Cartões">
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.cards.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.cards.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(card => {
          const usedLimit = card.gastoTotal;
          const usagePercent = card.limit > 0 ? Math.round((usedLimit / card.limit) * 100) : 0;
          return (
            <Card key={card.id} className="p-4 sm:p-5 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: card.color + '20' }}>
                    <CreditCard className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{card.name}</h3>
                    {card.lastDigits && <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>}
                    {card.nomeConta && <p className="text-xs text-muted-foreground">Conta: {card.nomeConta}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(card.id)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(cartoes.find(c => String(c.id) === card.id)?.id!)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Limite usado</span>
                  <span className={`font-medium ${usagePercent > 80 ? 'text-destructive' : ''}`}>{usagePercent}%</span>
                </div>
                <Progress value={Math.min(usagePercent, 100)} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(usedLimit)}</span>
                  <span>{formatCurrency(card.limit)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Disponível: <span className="font-medium text-foreground">{formatCurrency(Math.max(card.limit - usedLimit, 0))}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-secondary p-2.5">
                  <span className="text-muted-foreground">Fechamento</span>
                  <div className="mt-0.5 font-semibold">Dia {card.closingDay}</div>
                </div>
                <div className="rounded-lg bg-secondary p-2.5">
                  <span className="text-muted-foreground">Vencimento</span>
                  <div className="mt-0.5 font-semibold">Dia {card.dueDay}</div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5 text-xs"
                onClick={() => setSheetCardName(card.name)}
              >
                <Eye className="h-3.5 w-3.5" /> Ver lançamentos
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Transactions Sheet */}
      <Sheet open={!!sheetCardName} onOpenChange={(open) => { if (!open) setSheetCardName(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Lançamentos — {sheetCardName}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="px-6 py-4">
              {loadingTx ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transacoesCartao.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Nenhum lançamento encontrado para este cartão.
                </p>
              ) : (
                <div className="space-y-1">
                  {transacoesCartao.map(tr => {
                    const isIncome = tr.tipo === 'receita';
                    const isPago = tr.status?.toUpperCase() === 'PAGO';
                    return (
                      <div key={tr.id} className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tr.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatTxDate(tr.data_transacao)}</span>
                            {tr.categoria && <span className="text-xs text-muted-foreground">· {tr.categoria}</span>}
                            <Badge
                              variant={isPago ? 'default' : 'secondary'}
                              className={`text-[10px] px-1.5 py-0 h-4 ${isPago ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-0' : 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-0'}`}
                            >
                              {tr.status}
                            </Badge>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-emerald-600' : 'text-destructive'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(tr.valor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCard ? 'Editar' : t.common.add} Cartão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank Gold" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Últimos 4 dígitos <span className="text-muted-foreground font-normal">(opcional)</span></Label><Input maxLength={4} value={form.lastDigits} onChange={e => setForm({ ...form, lastDigits: e.target.value })} placeholder="Ex: 4521" /></div>
              <div className="space-y-1.5"><Label>Limite</Label><Input type="number" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Dia fechamento</Label><Input type="number" min={1} max={31} value={form.closingDay} onChange={e => setForm({ ...form, closingDay: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Dia vencimento</Label><Input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Conta Vinculada</Label>
              <Select value={form.nomeConta} onValueChange={v => setForm({ ...form, nomeConta: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => (
                    <SelectItem key={String(c.id)} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSubmit}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PlanGuard>
  );
};

export default CardsPage;
