import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Conta {
  id: string;
  nome: string;
  tipo: string;
}

interface Cartao {
  id: string;
  nome: string;
  dia_fechamento?: number | string | null;
}

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
}

export interface TransactionFormData {
  description: string;
  amount: string;
  category: string;
  date: string;
  status: 'PAGO' | 'PENDENTE';
  conta: string;
  installments: string;
}

const emptyForm = (type: 'income' | 'expense'): TransactionFormData => ({
  description: '',
  amount: '',
  category: '',
  date: new Date().toISOString().split('T')[0],
  status: type === 'income' ? 'PAGO' : 'PAGO',
  conta: '',
  installments: '1',
});

const normalize = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const addMonths = (dateStr: string, months: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(d, lastDay));
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
};

interface TransactionFormDialogProps {
  type: 'income' | 'expense';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TransactionFormData>;
  installments?: number;
  paymentMethod?: string | null;
}

export function TransactionFormDialog({ type, open, onOpenChange, initialData, installments, paymentMethod }: TransactionFormDialogProps) {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransactionFormData>(emptyForm(type));

  useEffect(() => {
    if (open) {
      setForm({
        ...emptyForm(type),
        ...(initialData || {}),
        ...(installments && installments > 1 ? { installments: String(installments) } : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);


  const { data: contas = [] } = useQuery<Conta[]>({
    queryKey: ['contas-list'],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-contas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && open,
  });

  const { data: cartoes = [] } = useQuery<Cartao[]>({
    queryKey: ['cartoes-list'],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-cartoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && open,
  });

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && open,
  });

  // Pré-preenche a conta a partir do método de pagamento sugerido pela IA (match por nome, sem case/acentos)
  useEffect(() => {
    if (!open || !paymentMethod || form.conta) return;
    const target = normalize(paymentMethod);
    const match = contas.find(c => normalize(c.nome) === target)
      ?? contas.find(c => normalize(c.nome).includes(target) || target.includes(normalize(c.nome)));
    if (match) setForm(prev => ({ ...prev, conta: match.nome }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paymentMethod, contas]);

  const filteredCategorias = categorias.filter(c =>
    c.tipo === (type === 'income' ? 'receita' : 'despesa')
  );

  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const total = Number(data.amount);
      const parcels = Math.max(1, Math.floor(Number(data.installments) || 1));

      // Fluxo simples: 1 parcela
      if (parcels === 1) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transacao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tipo: type === 'income' ? 'receita' : 'despesa',
            descricao: data.description,
            valor: total,
            categoria: data.category,
            data_transacao: data.date,
            status: data.status,
            conta: data.conta?.trim() ? data.conta : null,
          }),
        });
        if (!res.ok) throw new Error('Erro ao criar transação');
        return;
      }

      // Fatiamento de parcelas
      const valorParcela = Number((total / parcels).toFixed(2));

      // Data da primeira parcela: se o método for um cartão e a compra passou do fechamento, joga pro mês seguinte
      let startDate = data.date;
      if (data.conta) {
        const card = cartoes.find(c => normalize(c.nome) === normalize(data.conta));
        const fechamento = Number(card?.dia_fechamento);
        const dia = Number(data.date.split('-')[2]);
        if (Number.isFinite(fechamento) && fechamento > 0 && dia > fechamento) {
          startDate = addMonths(data.date, 1);
        }
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const transactionsToInsert = Array.from({ length: parcels }, (_, i) => {
        const dataParcela = addMonths(startDate, i);
        const isFutura = dataParcela > todayStr;
        return {
          tipo: type === 'income' ? 'receita' : 'despesa',
          descricao: `${data.description} (${i + 1}/${parcels})`,
          valor: valorParcela,
          categoria: data.category,
          data_transacao: dataParcela,
          status: i === 0 && !isFutura ? data.status : 'PENDENTE',
          conta: data.conta?.trim() ? data.conta : null,
        };
      });

      // Bulk insert: uma única chamada
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transactions: transactionsToInsert }),
      });
      if (!res.ok) throw new Error('Erro ao criar transações');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: type === 'income' ? ['receitas'] : ['despesas'] });
      queryClient.invalidateQueries({ queryKey: ['contas'] });
      queryClient.invalidateQueries({ queryKey: ['pendentes-payables'] });
      const msg = type === 'income'
        ? (locale === 'pt' ? 'Receita criada' : 'Income created')
        : (locale === 'pt' ? 'Despesa criada' : 'Expense created');
      toast.success(msg);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(locale === 'pt' ? 'Erro ao salvar' : 'Error saving');
    },
  });

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.category) return;
    createMutation.mutate(form);
  };

  const labels = {
    pt: { account: 'Conta (opcional)', selectAccount: 'Selecionar conta', totalAmount: 'Valor Total', installments: 'Parcelas' },
    en: { account: 'Account (optional)', selectAccount: 'Select account', totalAmount: 'Total Amount', installments: 'Installments' },
    es: { account: 'Cuenta', selectAccount: 'Seleccionar cuenta', totalAmount: 'Valor Total', installments: 'Cuotas' },
    fr: { account: 'Compte', selectAccount: 'Sélectionner un compte', totalAmount: 'Montant Total', installments: 'Mensualités' },
    de: { account: 'Konto', selectAccount: 'Konto auswählen', totalAmount: 'Gesamtbetrag', installments: 'Raten' },
  };
  const l = labels[locale] || labels.en;

  const title = `${t.common.add} ${type === 'income' ? t.common.income : t.common.expense}`;
  const statusPaidLabel = type === 'income' ? t.common.received : t.common.paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t.common.description}</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{l.totalAmount}</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.date}</Label>
              <DatePicker value={form.date} onChange={v => setForm({ ...form, date: v })} />
            </div>
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.common.category}</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {form.category && !filteredCategorias.some(c => c.nome === form.category) && (
                    <SelectItem value={form.category}>{form.category}</SelectItem>
                  )}
                  {filteredCategorias.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.status}</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGO">{statusPaidLabel}</SelectItem>
                  <SelectItem value="PENDENTE">{t.common.planned}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account + Installments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{l.account}</Label>
              <Select value={form.conta} onValueChange={v => setForm({ ...form, conta: v })}>
                <SelectTrigger><SelectValue placeholder={l.selectAccount} /></SelectTrigger>
                <SelectContent>
                  {form.conta && !contas.some(c => c.nome === form.conta) && (
                    <SelectItem value={form.conta}>{form.conta}</SelectItem>
                  )}
                  {contas.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{l.installments}</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.installments}
                onChange={e => setForm({ ...form, installments: e.target.value })}
              />
            </div>
          </div>

          {Number(form.installments) > 1 && Number(form.amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              {Number(form.installments)}x de {(Number(form.amount) / Number(form.installments)).toFixed(2)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useTransactionForm(type: 'income' | 'expense') {
  const [open, setOpen] = useState(false);

  const openAdd = () => setOpen(true);

  return { open, setOpen, openAdd };
}
