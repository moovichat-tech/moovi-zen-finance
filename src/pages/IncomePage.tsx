import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pencil, Search, ArrowUpRight, ArrowUpDown, Loader2, CheckCircle } from 'lucide-react';
import { TransactionFormDialog, useTransactionForm } from '@/components/TransactionFormDialog';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Receita {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  categoria: string;
  cartao: string | null;
  data_transacao: string | null;
  conta: string | null;
  status: string;
}

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
}

type SortKey = 'descricao' | 'categoria' | 'data' | 'valor' | 'status';

const IncomePage = () => {
  const { t, formatCurrency, formatDate, locale } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('month');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterYear, setFilterYear] = useState(() => String(new Date().getFullYear()));
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortAsc, setSortAsc] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Receita | null>(null);
  const [editForm, setEditForm] = useState({ descricao: '', categoria: '', status: '', valor: '' });

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { open, setOpen, openAdd } = useTransactionForm('income');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const queryPayload = useMemo(() => {
    if (period === 'month') {
      const [ano, mes] = filterMonth.split('-');
      return { mes: Number(mes), ano: Number(ano), tipoPeriodo: 'month' };
    }
    if (period === 'year') {
      return { ano: Number(filterYear), tipoPeriodo: 'year' };
    }
    return { tipoPeriodo: 'all' };
  }, [period, filterMonth, filterYear]);

  const { data: receitas = [], isLoading } = useQuery<Receita[]>({
    queryKey: ['receitas', queryPayload],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-receitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(queryPayload),
      });
      if (!res.ok) throw new Error('Erro ao buscar receitas');
      return res.json();
    },
    enabled: !!token,
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
    enabled: !!token,
  });

  const categoriaReceita = useMemo(() => categorias.filter(c => c.tipo === 'receita'), [categorias]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['receitas'] });
    queryClient.invalidateQueries({ queryKey: ['pendentes-payables'] });
    queryClient.invalidateQueries({ queryKey: ['contas'] });
  };

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/marcar-pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Erro ao marcar como recebido');
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(locale === 'pt' ? 'Receita marcada como recebida' : 'Income marked as received');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-transacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Erro ao excluir');
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(locale === 'pt' ? 'Receita excluída' : 'Income deleted');
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; descricao: string; categoria: string; status: string; valor: number }) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-transacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
    },
    onSuccess: () => {
      invalidateAll();
      toast.success(locale === 'pt' ? 'Receita atualizada' : 'Income updated');
      setEditOpen(false);
      setEditItem(null);
    },
  });

  const handleEditOpen = (rec: Receita) => {
    setEditItem(rec);
    setEditForm({
      descricao: rec.descricao,
      categoria: rec.categoria,
      status: rec.status,
      valor: String(rec.valor),
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editItem) return;
    updateMutation.mutate({
      id: editItem.id,
      descricao: editForm.descricao,
      categoria: editForm.categoria,
      status: editForm.status,
      valor: Number(editForm.valor),
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteId) deleteMutation.mutate(deleteId);
  };

  const filtered = useMemo(() => {
    let list = receitas;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(d => d.descricao.toLowerCase().includes(s));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'descricao') cmp = a.descricao.localeCompare(b.descricao);
      else if (sortKey === 'categoria') cmp = (a.categoria || '').localeCompare(b.categoria || '');
      else if (sortKey === 'data') cmp = (a.data_transacao || '').localeCompare(b.data_transacao || '');
      else if (sortKey === 'valor') cmp = a.valor - b.valor;
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [receitas, search, sortKey, sortAsc]);

  const totalReceived = receitas.filter(r => r.status === 'PAGO').reduce((s, r) => s + r.valor, 0);
  const totalPending = receitas.filter(r => r.status === 'PENDENTE').reduce((s, r) => s + r.valor, 0);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(cur - i));
  }, []);

  const months = useMemo(() => {
    const cur = new Date();
    const list: string[] = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
  }, []);

  const translatePeriodLabel = (p: string) => {
    const map: Record<string, Record<string, string>> = {
      pt: { all: 'Tudo', month: 'Mensal', year: 'Anual' },
      en: { all: 'All', month: 'Monthly', year: 'Yearly' },
      es: { all: 'Todo', month: 'Mensual', year: 'Anual' },
      fr: { all: 'Tout', month: 'Mensuel', year: 'Annuel' },
      de: { all: 'Alle', month: 'Monatlich', year: 'Jährlich' },
    };
    return map[locale]?.[p] || p;
  };

  const statusLabel = (s: string) => {
    if (s === 'PAGO') return t.common.received;
    if (s === 'PENDENTE') return t.common.planned;
    return s;
  };

  const SortableHead = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.income.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.income.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.received}</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-success">{formatCurrency(totalReceived)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.planned}</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-muted-foreground">{formatCurrency(totalPending)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Total</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold">{formatCurrency(totalReceived + totalPending)}</div>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-28 sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{translatePeriodLabel('all')}</SelectItem>
            <SelectItem value="month">{translatePeriodLabel('month')}</SelectItem>
            <SelectItem value="year">{translatePeriodLabel('year')}</SelectItem>
          </SelectContent>
        </Select>
        {period === 'month' && (
          <MonthYearPicker value={filterMonth} onChange={setFilterMonth} availableMonths={months} />
        )}
        {period === 'year' && (
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-20 sm:w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label={t.common.description} field="descricao" />
                <SortableHead label={t.common.category} field="categoria" />
                <SortableHead label={t.common.date} field="data" />
                <SortableHead label={t.common.status} field="status" />
                <TableHead className="text-right cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('valor')}>
                  <div className="flex items-center justify-end gap-1">
                    {t.common.amount}
                    <ArrowUpDown className={`h-3 w-3 ${sortKey === 'valor' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  </div>
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{rec.descricao}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{rec.categoria}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {rec.data_transacao ? formatDate(rec.data_transacao) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rec.status === 'PAGO' ? 'default' : 'secondary'} className="text-[10px]">
                      {statusLabel(rec.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-success whitespace-nowrap">{formatCurrency(rec.valor)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditOpen(rec)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeleteId(rec.id); setDeleteOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  {locale === 'pt' ? 'Nenhuma receita encontrada' : 'No income found'}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <TransactionFormDialog type="income" open={open} onOpenChange={setOpen} />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === 'pt' ? 'Editar Receita' : 'Edit Income'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t.common.description}</Label>
              <Input value={editForm.descricao} onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t.common.category}</Label>
              <Select value={editForm.categoria} onValueChange={v => setEditForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoriaReceita.length > 0
                    ? categoriaReceita.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)
                    : <SelectItem value={editForm.categoria}>{editForm.categoria}</SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.common.status}</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGO">{t.common.received}</SelectItem>
                  <SelectItem value="PENDENTE">{t.common.planned}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.common.amount}</Label>
              <Input type="number" step="0.01" min="0" value={editForm.valor} onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {locale === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (locale === 'pt' ? 'Salvar' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{locale === 'pt' ? 'Excluir receita?' : 'Delete income?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {locale === 'pt' ? 'Esta ação não pode ser desfeita.' : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === 'pt' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (locale === 'pt' ? 'Excluir' : 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IncomePage;
