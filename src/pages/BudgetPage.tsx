import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Edit2, Plus, Trash2, Lock, Loader2 } from 'lucide-react';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface OrcamentoRow {
  id: string | number;
  nome: string;
  icone: string | null;
  orcamento_mensal: number;
  total_gasto: number;
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

const BudgetPage = () => {
  const { t, formatCurrency } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const isPastMonth = selectedMonth < currentMonth;

  const [ano, mes] = selectedMonth.split('-');

  // Fetch budgets from backend
  const { data: orcamentos = [], isLoading } = useQuery<OrcamentoRow[]>({
    queryKey: ['orcamentos', mes, ano],
    queryFn: () => callApi('get-orcamentos', token!, { mes, ano }),
    enabled: !!token,
  });

  // Fetch all expense categories (for adding new budgets)
  const { data: allCategories = [] } = useQuery<{ id: string | number; nome: string; tipo: string; orcamento_mensal: number | null }[]>({
    queryKey: ['categorias'],
    queryFn: () => callApi('get-categorias', token!),
    enabled: !!token,
  });

  // Categories without a budget (orcamento_mensal null or 0)
  const availableCategories = useMemo(() =>
    allCategories
      .filter(c => c.tipo === 'despesa' && (!c.orcamento_mensal || c.orcamento_mensal <= 0)),
    [allCategories]
  );

  // Available months for picker
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonth);
    // Add a range of months around current
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(set).sort().reverse();
  }, [currentMonth]);

  // Mutation to update orcamento_mensal on a category
  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, orcamento_mensal }: { id: string | number; orcamento_mensal: number }) =>
      callApi('update-categoria', token!, { id, nome: orcamentos.find(o => String(o.id) === String(id))?.nome, orcamento_mensal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Orçamento atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation to add budget (set orcamento_mensal on existing category)
  const addBudgetMutation = useMutation({
    mutationFn: ({ id, nome, orcamento_mensal }: { id: string | number; nome: string; orcamento_mensal: number }) =>
      callApi('update-categoria', token!, { id, nome, orcamento_mensal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Orçamento adicionado!');
      setOpenAdd(false);
      setNewCategory('');
      setNewLimit('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutation to remove budget (set orcamento_mensal to null)
  const deleteBudgetMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string | number; nome: string }) =>
      callApi('update-categoria', token!, { id, nome, orcamento_mensal: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Orçamento removido!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalLimit = orcamentos.reduce((s, b) => s + (Number(b.orcamento_mensal) || 0), 0);
  const totalSpent = orcamentos.reduce((s, b) => s + (Number(b.total_gasto) || 0), 0);

  const handleSave = (id: string | number) => {
    if (editValue) {
      updateBudgetMutation.mutate({ id, orcamento_mensal: parseFloat(editValue) });
    }
    setEditing(null);
  };

  const handleAdd = () => {
    if (!newCategory || !newLimit) return;
    const cat = availableCategories.find(c => String(c.id) === newCategory);
    if (!cat) return;
    addBudgetMutation.mutate({ id: cat.id, nome: cat.nome, orcamento_mensal: parseFloat(newLimit) });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.budget.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.budget.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} availableMonths={availableMonths} />
          {!isPastMonth && availableCategories.length > 0 && (
            <Button size="sm" className="gap-1.5" onClick={() => { setNewCategory(String(availableCategories[0].id)); setOpenAdd(true); }}>
              <Plus className="h-4 w-4" /> {t.common.add}
            </Button>
          )}
        </div>
      </div>

      {isPastMonth && (
        <Card className="p-3 flex items-center gap-2 bg-muted/50 border-muted">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Visualização de histórico — os valores deste mês não podem ser alterados.</span>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Orçamento Total</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold">{formatCurrency(totalLimit)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Gasto</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-destructive">{formatCurrency(totalSpent)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Disponível</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-success">{formatCurrency(totalLimit - totalSpent)}</div>
        </Card>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Budget Items */}
      {!isLoading && (
        <div className="space-y-3">
          {orcamentos.map(budget => {
            const limit = Number(budget.orcamento_mensal) || 0;
            const spent = Number(budget.total_gasto) || 0;
            const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
            const isOver = spent >= limit && limit > 0;
            const isWarning = percent >= 80 && percent < 100;

            return (
              <Card key={budget.id} className="p-5 card-hover">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isOver ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    <span className="text-sm font-semibold">{budget.nome}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isPastMonth && (
                      <>
                        {editing === String(budget.id) ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="h-7 w-28 text-xs"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSave(budget.id)}
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleSave(budget.id)}>{t.common.save}</Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setEditing(String(budget.id)); setEditValue(String(limit)); }}
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deleteBudgetMutation.mutate({ id: budget.id, nome: budget.nome })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    <span className={`text-sm font-medium ${isOver ? 'text-destructive' : isWarning ? 'text-warning' : ''}`}>
                      {percent}%
                    </span>
                  </div>
                </div>
                <Progress value={percent} className="mt-3 h-2" />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(spent)} {t.common.paid?.toLowerCase() || 'gastos'}</span>
                  <span>{formatCurrency(limit)} limite</span>
                </div>
              </Card>
            );
          })}
          {orcamentos.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum orçamento configurado. Adicione categorias de despesas primeiro.</p>
          )}
        </div>
      )}

      {/* Add Budget Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t.common.add} Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.category}</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Limite mensal</Label>
              <Input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAdd} disabled={addBudgetMutation.isPending}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
