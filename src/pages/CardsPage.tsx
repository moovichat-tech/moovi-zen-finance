import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Plus, Trash2, CreditCard, Pencil, X, Eye } from 'lucide-react';
import type { CreditCard as CreditCardType } from '@/store/DataContext';

const CardsPage = () => {
  const { t, formatCurrency, formatDate } = useI18n();
  const { cards, transactions, addCard, deleteCard, updateCard } = useData();
  const [open, setOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [txFilterMonth, setTxFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [txFilterAll, setTxFilterAll] = useState(true);
  const [form, setForm] = useState({ name: '', lastDigits: '', limit: '', closingDay: '3', dueDay: '10', color: 'hsl(234, 62%, 52%)' });

  const openAdd = () => {
    setEditingCard(null);
    setForm({ name: '', lastDigits: '', limit: '', closingDay: '3', dueDay: '10', color: 'hsl(234, 62%, 52%)' });
    setOpen(true);
  };

  const openEdit = (card: CreditCardType) => {
    setEditingCard(card);
    setForm({ name: card.name, lastDigits: card.lastDigits, limit: String(card.limit), closingDay: String(card.closingDay), dueDay: String(card.dueDay), color: card.color });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.limit) return;
    if (editingCard) {
      updateCard(editingCard.id, { name: form.name, lastDigits: form.lastDigits, limit: parseFloat(form.limit), closingDay: parseInt(form.closingDay), dueDay: parseInt(form.dueDay), color: form.color });
    } else {
      addCard({ name: form.name, lastDigits: form.lastDigits, limit: parseFloat(form.limit), usedLimit: 0, closingDay: parseInt(form.closingDay), dueDay: parseInt(form.dueDay), color: form.color });
    }
    setOpen(false);
  };

  const cardUsedLimits = useMemo(() => {
    const limits: Record<string, number> = {};
    cards.forEach(card => {
      const used = transactions
        .filter(tr => tr.cardId === card.id && tr.type === 'expense')
        .reduce((sum, tr) => sum + tr.amount, 0);
      limits[card.id] = used;
    });
    return limits;
  }, [cards, transactions]);

  const selectedCardData = selectedCard ? cards.find(c => c.id === selectedCard) : null;

  const selectedCardTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions
      .filter(tr => tr.cardId === selectedCard)
      .filter(tr => txFilterAll || tr.date.startsWith(txFilterMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedCard, txFilterMonth, txFilterAll]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.cards.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.cards.subtitle}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start" onClick={openAdd}>
          <Plus className="h-4 w-4" /> {t.common.add}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(card => {
          const usedLimit = cardUsedLimits[card.id] || 0;
          const usagePercent = card.limit > 0 ? Math.round((usedLimit / card.limit) * 100) : 0;
          return (
            <Card key={card.id} className={`p-4 sm:p-5 card-hover ${selectedCard === card.id ? 'border-primary' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: card.color + '20' }}>
                    <CreditCard className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{card.name}</h3>
                    {card.lastDigits && <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(card)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCard(card.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Limite usado</span>
                  <span className={`font-medium ${usagePercent > 80 ? 'text-destructive' : ''}`}>{usagePercent}%</span>
                </div>
                <Progress value={Math.min(usagePercent, 100)} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(usedLimit)}</span>
                  <span>{formatCurrency(card.limit)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Disponível: <span className="font-medium text-foreground">{formatCurrency(Math.max(card.limit - usedLimit, 0))}</span>
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

              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5 text-xs"
                onClick={() => { setSelectedCard(selectedCard === card.id ? null : card.id); setTxFilterAll(true); }}
              >
                <Eye className="h-3.5 w-3.5" /> Ver lançamentos
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Selected Card Transactions */}
      {selectedCardData && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold">Lançamentos — {selectedCardData.name}</h3>
            <div className="flex items-center gap-2">
              <Button
                variant={txFilterAll ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTxFilterAll(true)}
              >
                Todos
              </Button>
              <Button
                variant={!txFilterAll ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTxFilterAll(false)}
              >
                Por mês
              </Button>
              {!txFilterAll && (
                <MonthYearPicker value={txFilterMonth} onChange={setTxFilterMonth} triggerClassName="h-7 w-24 text-xs" />
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedCard(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {selectedCardTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento neste cartão</p>
          ) : (
            <div className="space-y-2">
              {selectedCardTransactions.map(tr => {
                const isRefund = tr.type === 'income';
                return (
                  <div key={tr.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0 gap-2">
                    <div className="truncate">
                      <span className="font-medium">{tr.description}</span>
                      <span className="ml-2 text-muted-foreground">{formatDate(tr.date)}</span>
                    </div>
                    <span className={`font-medium shrink-0 ${isRefund ? 'text-success' : 'text-destructive'}`}>
                      {isRefund ? '+' : '-'}{formatCurrency(tr.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCard ? 'Editar' : t.common.add} Cartão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank Gold" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Últimos 4 dígitos <span className="text-muted-foreground font-normal">(opcional)</span></Label><Input maxLength={4} value={form.lastDigits} onChange={e => setForm({ ...form, lastDigits: e.target.value })} placeholder="Ex: 4521" /></div>
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
