import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, CreditCard } from 'lucide-react';

const CardsPage = () => {
  const { t, formatCurrency } = useI18n();
  const { cards, transactions, addCard, deleteCard } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', lastDigits: '', limit: '', closingDay: '3', dueDay: '10', color: 'hsl(234, 62%, 52%)' });

  const handleSubmit = () => {
    if (!form.name || !form.limit) return;
    addCard({ name: form.name, lastDigits: form.lastDigits, limit: parseFloat(form.limit), usedLimit: 0, closingDay: parseInt(form.closingDay), dueDay: parseInt(form.dueDay), color: form.color });
    setOpen(false);
    setForm({ name: '', lastDigits: '', limit: '', closingDay: '3', dueDay: '10', color: 'hsl(234, 62%, 52%)' });
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.cards.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.cards.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map(card => {
          const usagePercent = Math.round((card.usedLimit / card.limit) * 100);
          const cardTransactions = transactions.filter(tr => tr.cardId === card.id).slice(0, 5);
          return (
            <Card key={card.id} className="p-5 card-hover">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: card.color + '20' }}>
                    <CreditCard className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{card.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">•••• {card.lastDigits}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCard(card.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Limite usado</span>
                  <span className={`font-mono font-medium ${usagePercent > 80 ? 'text-destructive' : ''}`}>{usagePercent}%</span>
                </div>
                <Progress value={usagePercent} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(card.usedLimit)}</span>
                  <span>{formatCurrency(card.limit)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-secondary p-2.5">
                  <span className="text-muted-foreground">Fechamento</span>
                  <div className="mt-0.5 font-semibold">Dia {card.closingDay}</div>
                </div>
                <div className="rounded-lg bg-secondary p-2.5">
                  <span className="text-muted-foreground">Vencimento</span>
                  <div className="mt-0.5 font-semibold">Dia {card.dueDay}</div>
                </div>
              </div>

              {cardTransactions.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Últimos lançamentos</span>
                  {cardTransactions.map(tr => (
                    <div key={tr.id} className="flex items-center justify-between text-xs">
                      <span>{tr.description}</span>
                      <span className="font-mono text-destructive">-{formatCurrency(tr.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t.common.add} Cartão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank Gold" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Últimos 4 dígitos</Label><Input maxLength={4} value={form.lastDigits} onChange={e => setForm({ ...form, lastDigits: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Limite</Label><Input type="number" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Dia fechamento</Label><Input type="number" min={1} max={31} value={form.closingDay} onChange={e => setForm({ ...form, closingDay: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Dia vencimento</Label><Input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></div>
            </div>
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

export default CardsPage;
