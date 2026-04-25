import { useState } from 'react';
import ActionButtonGuard from '@/components/ActionButtonGuard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Target, Plus, CalendarDays, MoreVertical, Trash2, Rocket, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Meta {
  id: string;
  nome: string;
  descricao: string | null;
  valor_meta: number;
  valor_guardado: number;
  prazo: string | null;
  data_criacao: string;
}

const MetasPage = () => {
  const { token } = useAuth();
  const { formatCurrency, formatDate } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', valor_guardado: '', valor_meta: '' });
  const [form, setForm] = useState({ nome: '', descricao: '', valor_meta: '', valor_guardado: '', prazo: '' });

  const { data: metas = [], isLoading } = useQuery<Meta[]>({
    queryKey: ['metas'],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-metas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Erro ao carregar metas');
      return res.json();
    },
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome: form.nome,
          descricao: form.descricao || null,
          valor_meta: Number(form.valor_meta),
          valor_guardado: Number(form.valor_guardado || 0),
          prazo: form.prazo || null,
        }),
      });
      if (!res.ok) throw new Error('Erro ao criar meta');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      setDialogOpen(false);
      setForm({ nome: '', descricao: '', valor_meta: '', valor_guardado: '', prazo: '' });
      toast.success('Meta criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar meta'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingMeta) throw new Error('Nenhuma meta selecionada');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editingMeta.id,
          nome: editForm.nome,
          valor_guardado: Number(editForm.valor_guardado || 0),
          valor_meta: Number(editForm.valor_meta || 0),
        }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar meta');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      setEditDialogOpen(false);
      setEditingMeta(null);
      toast.success('Meta atualizada com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar meta'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Erro ao excluir meta');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      toast.success('Meta excluída');
    },
    onError: () => toast.error('Erro ao excluir meta'),
  });

  const isPastDue = (prazo: string | null) => {
    if (!prazo) return false;
    return new Date(prazo + 'T23:59:59') < new Date();
  };

  const openEditDialog = (meta: Meta) => {
    setEditingMeta(meta);
    setEditForm({
      nome: meta.nome,
      valor_guardado: String(meta.valor_guardado),
      valor_meta: String(meta.valor_meta),
    });
    setEditDialogOpen(true);
  };

  const getDisplayValues = (meta: Meta) => {
    const guardado = meta.valor_guardado || 0;
    const objetivo = meta.valor_meta;
    if (objetivo <= 0 && guardado > 0) {
      return { displayMeta: guardado, displayGuardado: guardado, pct: 100 };
    }
    if (objetivo <= 0 && guardado <= 0) {
      return { displayMeta: 0, displayGuardado: 0, pct: 0 };
    }
    return {
      displayMeta: objetivo,
      displayGuardado: guardado,
      pct: Math.min(Math.round((guardado / objetivo) * 100), 100),
    };
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Metas</h2>
          <p className="text-sm text-muted-foreground">Acompanhe seus objetivos financeiros</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <ActionButtonGuard requiredPlan="pro" featureName="Criar Metas">
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
          </ActionButtonGuard>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Viagem de férias" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor da Meta (R$) *</Label>
                  <Input type="number" value={form.valor_meta} onChange={e => setForm(f => ({ ...f, valor_meta: e.target.value }))} placeholder="10000" />
                </div>
                <div>
                  <Label>Já Guardado (R$)</Label>
                  <Input type="number" value={form.valor_guardado} onChange={e => setForm(f => ({ ...f, valor_guardado: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!form.nome || !form.valor_meta || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Salvando...' : 'Criar Meta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : metas.length === 0 ? (
        <Card className="flex min-h-[400px] items-center justify-center p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Rocket className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Nenhuma meta ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie o seu primeiro objetivo financeiro e comece a acompanhar o progresso!
              </p>
            </div>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Criar Primeira Meta
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metas.map((meta) => {
            const { displayMeta, displayGuardado, pct } = getDisplayValues(meta);
            const pastDue = isPastDue(meta.prazo);

            return (
              <Card key={meta.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{meta.nome}</CardTitle>
                      {meta.descricao && (
                        <CardDescription className="text-xs line-clamp-2">{meta.descricao}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(meta)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteMutation.mutate(meta.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {formatCurrency(displayGuardado)} de {formatCurrency(displayMeta)}
                    </p>
                    <Progress value={pct} className="h-2.5" />
                  </div>
                  <Badge variant={pct >= 100 ? 'default' : 'secondary'} className="text-[11px]">
                    {pct}% alcançado
                  </Badge>
                  {meta.prazo && (
                    <div className={`flex items-center gap-1.5 text-xs ${pastDue ? 'text-destructive' : 'text-muted-foreground'}`}>
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{pastDue ? 'Venceu em' : 'Vence em'} {formatDate(meta.prazo)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome da Meta</Label>
              <Input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label>Valor Guardado (R$)</Label>
              <Input type="number" value={editForm.valor_guardado} onChange={e => setEditForm(f => ({ ...f, valor_guardado: e.target.value }))} />
            </div>
            <div>
              <Label>Objetivo da Meta (R$)</Label>
              <Input type="number" value={editForm.valor_meta} onChange={e => setEditForm(f => ({ ...f, valor_meta: e.target.value }))} />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!editForm.nome || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MetasPage;
