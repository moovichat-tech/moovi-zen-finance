import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, CalendarCheck2, CalendarDays, Link2, CheckCircle2, ChevronDown, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CommitmentItemRow, { type Compromisso } from '@/components/commitments/CommitmentItemRow';


const CommitmentsPage = () => {
  const { telefone, token } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [form, setForm] = useState({ titulo: '', descricao: '', data: '', hora: '' });
  const [disconnectOpen, setDisconnectOpen] = useState(false);


  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const fnUrl = (name: string) => `https://${projectId}.supabase.co/functions/v1/${name}`;

  // Feedback do retorno do OAuth do Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'ok') toast.success('Google Agendas conectado!');
    if (g === 'erro') toast.error('Não foi possível conectar o Google Agendas.');
    if (g) {
      window.history.replaceState({}, '', window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
    }
  }, [queryClient]);

  const { data: google } = useQuery<{ connected: boolean; auth_url: string | null }>({
    queryKey: ['google-status', telefone],
    queryFn: async () => {
      const res = await fetch(fnUrl('google-status'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erro ao verificar Google');
      return res.json();
    },
    enabled: !!token,
  });

  const callFn = async (name: string, body?: unknown) => {
    const res = await fetch(fnUrl(name), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data as { error?: string })?.error || 'Erro na requisição');
    return data;
  };

  const disconnectGoogle = useMutation({
    mutationFn: async () => callFn('disconnect-google-calendar'),
    onSuccess: () => {
      queryClient.setQueryData(
        ['google-status', telefone],
        (old: { connected: boolean; auth_url: string | null } | undefined) =>
          old ? { ...old, connected: false } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
      setDisconnectOpen(false);
      toast.success('Google Agendas desconectado.');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao desconectar a agenda.'),
  });


  const { data: compromissos = [], isLoading, isError } = useQuery<Compromisso[]>({
    queryKey: ['compromissos', telefone],
    queryFn: async () => {
      const res = await fetch(fnUrl('compromissos-list'), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erro ao carregar compromissos');
      const data = await res.json();
      return (Array.isArray(data) ? data : []) as Compromisso[];
    },
    enabled: !!token,
  });

  const pendingDays = useMemo(
    () =>
      compromissos
        .filter(c => c.status === 'pendente')
        .map(c => new Date(c.data_hora_limite)),
    [compromissos]
  );

  const filtered = useMemo(() => {
    if (!selectedDate) return compromissos;
    return compromissos.filter(c => isSameDay(new Date(c.data_hora_limite), selectedDate));
  }, [compromissos, selectedDate]);

  const syncGoogle = async (payload: { titulo: string; descricao: string; data_hora_limite: string }) => {
    if (!google?.connected || !token) return;
    try {
      const res = await fetch(fnUrl('sync-google-event'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (body?.synced) toast.success('Evento criado no Google Agendas!');
      else if (res.ok === false) toast.error('Falha ao sincronizar com o Google Agendas.');
    } catch {
      toast.error('Falha ao sincronizar com o Google Agendas.');
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: { titulo: string; descricao: string; data_hora_limite: string }) => {
      if (!token) throw new Error('Usuário não autenticado');
      await callFn('compromissos-create', payload);
      await syncGoogle(payload);
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
    mutationFn: async (id: number) => { await callFn('compromissos-delete', { id }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compromissos', telefone] });
      toast.success('Compromisso excluído!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markDoneMutation = useMutation({
    mutationFn: async (id: number) => {
      await callFn('compromissos-update-status', { id, status: 'concluido' });
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

  const openDialog = () => {
    const base = selectedDate ?? new Date();
    setForm(p => ({ ...p, data: format(base, 'yyyy-MM-dd') }));
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
        {google?.connected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Google Agendas conectado
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); setDisconnectOpen(true); }}
              >
                <Unlink className="h-4 w-4" />
                Desconectar Agenda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={!google?.auth_url}
            onClick={() => google?.auth_url && (window.location.href = google.auth_url)}
          >
            <Link2 className="h-4 w-4" />
            Conectar Google Agendas
          </Button>
        )}

        <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar Google Agendas?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desconectar sua conta do Google Agendas? Novos compromissos
                não serão mais sincronizados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={disconnectGoogle.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={disconnectGoogle.isPending}
                onClick={(e) => { e.preventDefault(); disconnectGoogle.mutate(); }}
              >
                {disconnectGoogle.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openDialog}>
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

      <div className="grid gap-5 lg:grid-cols-[auto_1fr] items-start">
        <Card className="p-3 w-full lg:w-auto flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            modifiers={{ pendente: pendingDays }}
            modifiersClassNames={{
              pendente: 'font-bold text-primary relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary',
            }}
            className="p-3 pointer-events-auto"
          />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold truncate">
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Todos os compromissos'}
              </h3>
            </div>
            {selectedDate && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>
                Ver todos
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : isError ? (
            <p className="text-center text-sm text-destructive py-10">Erro ao carregar compromissos</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarCheck2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {selectedDate ? 'Nenhum compromisso nesta data.' : 'Nenhum compromisso cadastrado ainda.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Compromisso" para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
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
