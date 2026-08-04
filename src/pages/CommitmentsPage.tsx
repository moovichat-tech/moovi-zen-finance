import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2, CalendarCheck2, CalendarDays, Link2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CommitmentItemRow, { type Compromisso } from '@/components/commitments/CommitmentItemRow';

const SUPABASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

const CommitmentsPage = () => {
  const { telefone, token } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
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

  // ---- Google Agenda ----
  const { data: googleStatus } = useQuery({
    queryKey: ['google-agenda-status', telefone],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-auth`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { connected: false };
      return res.json() as Promise<{ connected: boolean }>;
    },
    enabled: !!token,
  });

  const connectGoogle = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-auth`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao gerar link do Google');
      return json.url as string;
    },
    onSuccess: (url) => { window.location.href = url; },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectGoogle = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-auth`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      if (!res.ok) throw new Error('Falha ao desconectar');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-agenda-status', telefone] });
      toast.success('Google Agenda desconectado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      toast.success('Google Agenda conectado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['google-agenda-status', telefone] });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [queryClient, telefone]);

  // ---- Mutations ----
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

      // Sincroniza com o Google Agenda (não bloqueia o fluxo em caso de erro)
      if (googleStatus?.connected) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/sync-google-event`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.error('sync-google-event falhou:', err);
        }
      }
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

  // ---- Calendário ----
  const pendingDays = useMemo(
    () => compromissos
      .filter(c => c.status === 'pendente' && new Date(c.data_hora_limite).getTime() >= Date.now())
      .map(c => new Date(c.data_hora_limite)),
    [compromissos]
  );

  const expiredDays = useMemo(
    () => compromissos
      .filter(c => c.status !== 'concluido' && new Date(c.data_hora_limite).getTime() < Date.now())
      .map(c => new Date(c.data_hora_limite)),
    [compromissos]
  );

  const visibleCommitments = useMemo(() => {
    if (!selectedDay) return compromissos;
    return compromissos.filter(c => isSameDay(new Date(c.data_hora_limite), selectedDay));
  }, [compromissos, selectedDay]);

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

  const openDialogForSelectedDay = () => {
    if (selectedDay) {
      setForm(p => ({ ...p, data: format(selectedDay, 'yyyy-MM-dd') }));
    }
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5 animate-in-up">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div>
          <h2 className="text-lg font-semibold">Compromissos</h2>
          <p className="text-sm text-muted-foreground">Sua agenda financeira e pessoal</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {googleStatus?.connected ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={disconnectGoogle.isPending}
            onClick={() => disconnectGoogle.mutate()}
          >
            <Check className="h-4 w-4 text-primary" />
            Google Agenda conectado
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={connectGoogle.isPending}
            onClick={() => connectGoogle.mutate()}
          >
            {connectGoogle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Conectar Google Agendas
          </Button>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openDialogForSelectedDay}>
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

      <div className="grid gap-5 lg:grid-cols-[auto,1fr] items-start">
        <Card className="p-3 w-full lg:w-auto">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            locale={ptBR}
            modifiers={{ pendente: pendingDays, expirado: expiredDays }}
            modifiersClassNames={{
              pendente: 'font-bold text-primary relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary',
              expirado: 'relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-destructive',
            }}
            className={cn('p-2 pointer-events-auto mx-auto')}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-2 border-t border-border mt-2">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pendente
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Expirado
              </span>
            </div>
            {selectedDay && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDay(undefined)}>
                Limpar
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="text-sm font-semibold truncate">
                {selectedDay
                  ? format(selectedDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Todos os compromissos'}
              </h3>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {visibleCommitments.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : isError ? (
            <p className="text-center text-sm text-destructive py-10">Erro ao carregar compromissos</p>
          ) : visibleCommitments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {selectedDay ? 'Nenhum compromisso nesta data.' : 'Nenhum compromisso cadastrado ainda.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Compromisso" para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleCommitments.map(item => (
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
    </div>
  );
};

export default CommitmentsPage;
