import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarClock, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface Compromisso {
  id: number;
  telefone_usuario: string;
  titulo: string;
  descricao: string | null;
  data_hora_limite: string;
  status: string;
}

interface Props {
  item: Compromisso;
  onDelete: (id: number) => void;
  onMarkDone?: (id: number) => void;
  isDeleting?: boolean;
}

const CommitmentItemRow = ({ item, onDelete, onMarkDone, isDeleting }: Props) => {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dueDate = new Date(item.data_hora_limite);
  const now = new Date();
  const isExpired = item.status === 'pendente' && dueDate.getTime() < now.getTime();
  const isDone = item.status === 'concluido';

  const statusLabel = isDone ? 'Concluído' : isExpired ? 'Expirado' : 'Pendente';
  const statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' =
    isDone ? 'secondary' : isExpired ? 'destructive' : 'default';

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 py-3 px-3 rounded-lg border border-border bg-card group transition',
          (isExpired || isDone) && 'opacity-60'
        )}
      >
        <div className="shrink-0">
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          ) : isExpired ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <CalendarClock className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium truncate', (isExpired || isDone) && 'text-muted-foreground')}>
            {item.titulo}
          </p>
          {item.descricao && (
            <p className="text-xs text-muted-foreground truncate">{item.descricao}</p>
          )}
          <p className={cn('text-[11px] mt-0.5', isExpired ? 'text-destructive' : 'text-muted-foreground')}>
            {format(dueDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant} className="text-[10px]">
            {statusLabel}
          </Badge>
          {!isDone && onMarkDone && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onMarkDone(item.id)}
              title="Marcar como concluído"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setDeleteOpen(true)}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O compromisso "{item.titulo}" será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => { onDelete(item.id); setDeleteOpen(false); }}
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CommitmentItemRow;
