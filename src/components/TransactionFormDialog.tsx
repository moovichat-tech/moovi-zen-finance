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
}

const emptyForm = (type: 'income' | 'expense'): TransactionFormData => ({
  description: '',
  amount: '',
  category: '',
  date: new Date().toISOString().split('T')[0],
  status: type === 'income' ? 'PAGO' : 'PAGO',
  conta: '',
});

interface TransactionFormDialogProps {
  type: 'income' | 'expense';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionFormDialog({ type, open, onOpenChange }: TransactionFormDialogProps) {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransactionFormData>(emptyForm(type));

  useEffect(() => {
    if (open) setForm(emptyForm(type));
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

  const filteredCategorias = categorias.filter(c =>
    c.tipo === (type === 'income' ? 'receita' : 'despesa')
  );

  const createMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo: type === 'income' ? 'receita' : 'despesa',
          descricao: data.description,
          valor: Number(data.amount),
          categoria: data.category,
          data_transacao: data.date,
          status: data.status,
          conta: data.conta,
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar transação');
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
    if (!form.description || !form.amount || !form.conta || !form.category) return;
    createMutation.mutate(form);
  };

  const labels = {
    pt: { account: 'Conta', selectAccount: 'Selecionar conta', totalAmount: 'Valor Total' },
    en: { account: 'Account', selectAccount: 'Select account', totalAmount: 'Total Amount' },
    es: { account: 'Cuenta', selectAccount: 'Seleccionar cuenta', totalAmount: 'Valor Total' },
    fr: { account: 'Compte', selectAccount: 'Sélectionner un compte', totalAmount: 'Montant Total' },
    de: { account: 'Konto', selectAccount: 'Konto auswählen', totalAmount: 'Gesamtbetrag' },
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

          {/* Account */}
          <div className="space-y-1.5">
            <Label>{l.account}</Label>
            <Select value={form.conta} onValueChange={v => setForm({ ...form, conta: v })}>
              <SelectTrigger><SelectValue placeholder={l.selectAccount} /></SelectTrigger>
              <SelectContent>
                {contas.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
