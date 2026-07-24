import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, CalendarCheck2 } from 'lucide-react';
import { toast } from 'sonner';
import CommitmentItemRow, { type Compromisso } from '@/components/commitments/CommitmentItemRow';

const CommitmentsPage = () => {
  const { telefone } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', data: '', hora: '' });

  const { data: compromissos = [], isLoading, isError } = useQuery<Compromisso[]>({
    queryKey: ['compromissos', telefone],
    queryFn: async () => {
      if (!telefone) return [];
      const { data, error } = await supabase
        .from('compromissos' as never)
        .select('*')
        .eq('telefone_usuario', telefone)
        .order('data_hora_limite', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Compromisso[];
    },
    enabled: !!telefone,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { titulo: string; descricao: string; data_hora_limite: string }) => {
      if (!telefone) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('compromissos' as never).insert({
        telefone_usuario: telefone,
        titulo: payload.titulo,
        descricao: payload.descricao || null,
        data_hora_limite: payload.data_hora_limite,
        status: 'pendente',
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compromissos', telefone] });
      toast.success('Compromisso criado com sucesso!');
      setDialogOpen(false);
      setForm({ titulo: '', descricao: '', data: '', hora: '' });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao criar compromisso'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('compromissos' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compromissos', telefone] });
      toast.success('Compromisso excluído!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('compromissos' as never)
        .update({ status: 'concluido' } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compromissos', telefone] });
      toast.success('Marcado como concluído!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!form.titulo.trim()) return toast.error('Informe um título');
    if (!form.data || !form.hora) return toast.error('Selecione data e hora');
    const dt = new Date(`${form.data}T${form.hora}:00`);
    if (isNaN(dt.getTime())) return toast.error('Data/hora inválida');
    createMutation.mutate({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      data_hora_limite: dt.toISOString(),
    });
  };

  return (
    <div className="space-y-5 animate-in-up">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div>
          <h2 className="text-lg font-semibold">Compromissos</h2>
          <p className="text-sm text-muted-foreground">Sua agenda financeira e pessoal</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Compromisso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Compromisso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Pagar aluguel"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={form.descricao}
                  onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={form.hora}
                    onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button disabled={createMutation.isPending} onClick={handleSubmit}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar Compromisso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-destructive py-10">Erro ao carregar compromissos</p>
        ) : compromissos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarCheck2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum compromisso cadastrado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Compromisso" para começar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {compromissos.map(item => (
              <CommitmentItemRow
                key={item.id}
                item={item}
                onDelete={id => deleteMutation.mutate(id)}
                onMarkDone={id => markDoneMutation.mutate(id)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CommitmentsPage;
