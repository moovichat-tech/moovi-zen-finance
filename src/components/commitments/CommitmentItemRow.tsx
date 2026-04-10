import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, Bell, Pencil, Trash2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface CommitmentItem {
  id: string;
  titulo: string;
  data: string;
  dateStr: string;
  tipo: 'recorrente' | 'temporario';
  valor?: number;
  status: string;
  recorrencia?: string | null;
  notas?: string | null;
}

interface CommitmentItemRowProps {
  item: CommitmentItem;
  variant: 'full' | 'compact';
  today: string;
  labels: Record<string, string>;
  formatCurrency: (v: number) => string;
  formatDate: (d: string) => string;
  getDaysDiff: (d: string) => number;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: EditFormData) => void;
  isDeleting?: boolean;
  isEditing?: boolean;
}

export interface EditFormData {
  mensagem: string;
  valor: number;
  dia_vencimento: number;
  hora_alerta: string;
}

const CommitmentItemRow = ({
  item, variant, today, labels: l, formatCurrency, formatDate, getDaysDiff,
  onDelete, onEdit, isDeleting, isEditing,
}: CommitmentItemRowProps) => {
  const { plano } = useAuth();
  const navigate = useNavigate();
  const isRecorrente = item.tipo === 'recorrente';
  const isBasico = plano === 'basico';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const dayFromDate = item.dateStr ? Number(item.dateStr.split('-')[2]) : 1;
  const [form, setForm] = useState<EditFormData>({
    mensagem: item.titulo,
    valor: item.valor ?? 0,
    dia_vencimento: dayFromDate,
    hora_alerta: '08:00',
  });

  const handleEditOpen = () => {
    setForm({
      mensagem: item.titulo,
      valor: item.valor ?? 0,
      dia_vencimento: dayFromDate,
      hora_alerta: '08:00',
    });
    setEditOpen(true);
  };

  return (
    <>
      <div className={`flex items-center py-2.5 px-3 rounded-lg group/row ${variant === 'full' ? 'bg-secondary/50' : 'border-b border-border last:border-0'}`}>
        {/* Left: Icon + Texts (flex-1) */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {item.valor ? (
            <ArrowDownRight className="h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <Bell className="h-4 w-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.titulo}</p>
            {variant === 'compact' && (
              <p className="text-[11px] text-muted-foreground">
                {formatDate(item.dateStr)}
                {item.recorrencia && ` • ${item.recorrencia}`}
                {item.dateStr >= today && (() => {
                  const diff = getDaysDiff(item.dateStr);
                  return ` • ${diff === 0 ? l.today : l.inDays.replace('{n}', String(diff))}`;
                })()}
              </p>
            )}
            {item.notas && <p className="text-[11px] text-muted-foreground truncate">{item.notas}</p>}
          </div>
        </div>

        {/* Right side: Action buttons + Value + Tag (fixed column) */}
        <div className="flex items-center shrink-0">
          {isRecorrente && (
            <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity mr-2">
              <button
                onClick={handleEditOpen}
                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          {item.valor != null && item.valor > 0 && (
            <span className="text-sm font-semibold text-destructive whitespace-nowrap mr-3">-{formatCurrency(item.valor)}</span>
          )}
          {/* Tag column: fixed width ensures vertical alignment across all rows */}
          <div className="w-[90px] flex justify-center shrink-0">
            <Badge variant={isRecorrente ? 'default' : 'outline'} className="text-[10px] whitespace-nowrap">
              {isRecorrente ? l.recorrente : l.temporario}
            </Badge>
          </div>
        </div>
      </div>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lembrete Recorrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lembrete? Essa ação cancelará as cobranças e avisos futuros e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => {
                onDelete(item.id);
                setDeleteOpen(false);
              }}
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Lembrete Recorrente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Mensagem / Descrição</Label>
              <Input
                value={form.mensagem}
                onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.valor}
                  onChange={e => setForm(p => ({ ...p, valor: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia do Vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dia_vencimento}
                  onChange={e => setForm(p => ({ ...p, dia_vencimento: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hora do Alerta</Label>
              <Input
                type="time"
                value={form.hora_alerta}
                onChange={e => setForm(p => ({ ...p, hora_alerta: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isEditing}
              onClick={() => {
                onEdit(item.id, form);
                setEditOpen(false);
              }}
            >
              {isEditing ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommitmentItemRow;
