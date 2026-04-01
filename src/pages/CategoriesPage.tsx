import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Tag } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Categoria {
  id: number | string;
  nome: string;
  icone: string | null;
  tipo: 'despesa' | 'receita';
  orcamento_mensal: number | null;
  criado_em: string;
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

const CategoriesPage = () => {
  const { t } = useI18n();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ name: '', type: 'expense' as 'income' | 'expense' });
  const [activeTab, setActiveTab] = useState('expense');

  const { data: categorias = [], isLoading } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: () => callApi('get-categorias', token!),
    enabled: !!token,
  });

  const expenseList = categorias.filter(c => c.tipo === 'despesa');
  const incomeList = categorias.filter(c => c.tipo === 'receita');

  const createMutation = useMutation({
    mutationFn: (data: { nome: string; tipo: string }) => callApi('create-categoria', token!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria criada!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number | string; nome: string }) => callApi('update-categoria', token!, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria atualizada!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => callApi('delete-categoria', token!, { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria excluída!'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd = (type: 'income' | 'expense') => {
    setEditingCategory(null);
    setForm({ name: '', type });
    setOpen(true);
  };

  const openEdit = (cat: Categoria) => {
    setEditingCategory(cat);
    setForm({ name: cat.nome, type: cat.tipo === 'receita' ? 'income' : 'expense' });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, nome: form.name.trim() });
    } else {
      createMutation.mutate({ nome: form.name.trim(), tipo: form.type === 'income' ? 'receita' : 'despesa' });
    }
    setOpen(false);
  };

  const renderCategoryList = (type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeList : expenseList;
    return (
      <div className="space-y-2">
        {list.map(cat => (
          <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{cat.nome}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(cat.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma categoria cadastrada</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Categorias</h2>
          <p className="text-sm text-muted-foreground">Gerencie suas categorias de receitas e despesas</p>
        </div>
      </div>

      <Card className="p-3 sm:p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="expense" className="text-xs sm:text-sm">Despesas ({expenseList.length})</TabsTrigger>
              <TabsTrigger value="income" className="text-xs sm:text-sm">Receitas ({incomeList.length})</TabsTrigger>
            </TabsList>
            <Button size="sm" className="gap-1.5 self-start sm:self-auto" onClick={() => openAdd(activeTab as 'income' | 'expense')}>
              <Plus className="h-4 w-4" /> {t.common.add}
            </Button>
          </div>
          <TabsContent value="expense">{renderCategoryList('expense')}</TabsContent>
          <TabsContent value="income">{renderCategoryList('income')}</TabsContent>
        </Tabs>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar' : 'Adicionar'} Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da categoria</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Alimentação" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {form.type === 'income' ? 'Receita' : 'Despesa'}
            </Badge>
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

export default CategoriesPage;
