import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData, type Transaction } from '@/store/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';

export interface TransactionFormData {
  description: string;
  amount: string;
  category: string;
  date: string;
  status: 'paid' | 'received' | 'planned';
  recurrence: Transaction['recurrence'];
  accountId: string;
  cardId: string;
  installments: string;
  fixed: boolean;
  tags: string;
}

const emptyForm = (type: 'income' | 'expense', defaultCategory: string): TransactionFormData => ({
  description: '',
  amount: '',
  category: defaultCategory,
  date: new Date().toISOString().split('T')[0],
  status: type === 'income' ? 'received' : 'paid',
  recurrence: 'once',
  accountId: '',
  cardId: '',
  installments: '',
  fixed: false,
  tags: '',
});

interface TransactionFormDialogProps {
  type: 'income' | 'expense';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  initialData?: TransactionFormData;
}

export function TransactionFormDialog({ type, open, onOpenChange, editingId, initialData }: TransactionFormDialogProps) {
  const { t, locale, translateRecurrence } = useI18n();
  const { accounts, cards, categories, addTransaction, updateTransaction } = useData();

  const defaultCategory = type === 'income' ? categories.income[0] || '' : categories.expense[0] || '';
  const [form, setForm] = useState<TransactionFormData>(initialData || emptyForm(type, defaultCategory));

  // Reset form when dialog opens with new data
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && initialData) setForm(initialData);
    else if (isOpen) setForm(emptyForm(type, defaultCategory));
    onOpenChange(isOpen);
  };

  // Labels
  const labels = {
    pt: { account: 'Conta', card: 'Cartão (opcional)', installments: 'Parcelas', fixedExpense: 'Despesa fixa', fixedIncome: 'Receita fixa', tags: 'Tags', tagsPlaceholder: 'ex: tech, assinatura', recurrence: 'Recorrência', noCard: 'Nenhum', selectAccount: 'Selecionar' },
    en: { account: 'Account', card: 'Card (optional)', installments: 'Installments', fixedExpense: 'Fixed expense', fixedIncome: 'Fixed income', tags: 'Tags', tagsPlaceholder: 'e.g.: tech, subscription', recurrence: 'Recurrence', noCard: 'None', selectAccount: 'Select' },
    es: { account: 'Cuenta', card: 'Tarjeta (opcional)', installments: 'Cuotas', fixedExpense: 'Gasto fijo', fixedIncome: 'Ingreso fijo', tags: 'Tags', tagsPlaceholder: 'ej: tech, suscripción', recurrence: 'Recurrencia', noCard: 'Ninguna', selectAccount: 'Seleccionar' },
    fr: { account: 'Compte', card: 'Carte (optionnel)', installments: 'Versements', fixedExpense: 'Dépense fixe', fixedIncome: 'Revenu fixe', tags: 'Tags', tagsPlaceholder: 'ex: tech, abonnement', recurrence: 'Récurrence', noCard: 'Aucune', selectAccount: 'Sélectionner' },
    de: { account: 'Konto', card: 'Karte (optional)', installments: 'Raten', fixedExpense: 'Fixe Ausgabe', fixedIncome: 'Fixes Einkommen', tags: 'Tags', tagsPlaceholder: 'z.B.: Tech, Abo', recurrence: 'Wiederholung', noCard: 'Keine', selectAccount: 'Auswählen' },
  };
  const l = labels[locale];

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.accountId) return;

    if (editingId) {
      updateTransaction(editingId, {
        type,
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
        status: form.status,
        recurrence: form.recurrence,
        accountId: form.accountId,
        cardId: form.cardId || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        fixed: form.fixed,
      });
    } else {
      const inst = form.installments ? parseInt(form.installments) : undefined;
      if (inst && inst > 1) {
        const amount = Math.round((parseFloat(form.amount) / inst) * 100) / 100;
        for (let i = 0; i < inst; i++) {
          const date = new Date(form.date);
          date.setMonth(date.getMonth() + i);
          addTransaction({
            type,
            description: form.description,
            amount,
            category: form.category,
            date: date.toISOString().split('T')[0],
            status: i === 0 ? (type === 'income' ? 'received' : 'paid') : 'planned',
            recurrence: 'once',
            accountId: form.accountId,
            cardId: form.cardId || undefined,
            installments: inst,
            currentInstallment: i + 1,
            tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
            fixed: form.fixed,
          });
        }
      } else {
        addTransaction({
          type,
          description: form.description,
          amount: parseFloat(form.amount),
          category: form.category,
          date: form.date,
          status: form.status,
          recurrence: form.recurrence,
          accountId: form.accountId,
          cardId: form.cardId || undefined,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
          fixed: form.fixed,
        });
      }
    }
    onOpenChange(false);
  };

  const categoryList = type === 'income' ? categories.income : categories.expense;
  const statusCompleted = type === 'income' ? 'received' : 'paid';
  const statusCompletedLabel = type === 'income' ? t.common.received : t.common.paid;
  const title = `${editingId ? t.common.edit : t.common.add} ${type === 'income' ? t.common.income : t.common.expense}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t.common.description}</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{locale === 'pt' ? 'Valor Total' : locale === 'en' ? 'Total Amount' : locale === 'es' ? 'Valor Total' : locale === 'fr' ? 'Montant Total' : 'Gesamtbetrag'}</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.date}</Label>
              <DatePicker value={form.date} onChange={v => setForm({ ...form, date: v })} />
            </div>
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.common.category}</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.status}</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={statusCompleted}>{statusCompletedLabel}</SelectItem>
                  <SelectItem value="planned">{t.common.planned}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{l.recurrence}</Label>
              <Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{translateRecurrence('once')}</SelectItem>
                  <SelectItem value="monthly">{translateRecurrence('monthly')}</SelectItem>
                  <SelectItem value="weekly">{translateRecurrence('weekly')}</SelectItem>
                  <SelectItem value="yearly">{translateRecurrence('yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{l.account}</Label>
              <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                <SelectTrigger><SelectValue placeholder={l.selectAccount} /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Card + Installments (both available for income and expense) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{l.card}</Label>
              <Select value={form.cardId || 'none'} onValueChange={v => setForm({ ...form, cardId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={l.noCard} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{l.noCard}</SelectItem>
                  {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!editingId && (
              <div className="space-y-1.5">
                <Label>{l.installments}</Label>
                <Input type="number" min="1" placeholder="1" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} />
              </div>
            )}
          </div>

          {/* Fixed toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={form.fixed} onCheckedChange={v => setForm({ ...form, fixed: v })} />
            <Label>{type === 'income' ? l.fixedIncome : l.fixedExpense}</Label>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>{l.tags}</Label>
            <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder={l.tagsPlaceholder} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={handleSubmit}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useTransactionForm(type: 'income' | 'expense') {
  const { categories } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<TransactionFormData | undefined>();

  const defaultCategory = type === 'income' ? categories.income[0] || '' : categories.expense[0] || '';

  const openAdd = () => {
    setEditingId(null);
    setInitialData(emptyForm(type, defaultCategory));
    setOpen(true);
  };

  const openEdit = (tr: Transaction) => {
    setEditingId(tr.id);
    setInitialData({
      description: tr.description,
      amount: String(tr.amount),
      category: tr.category,
      date: tr.date,
      status: tr.status as any,
      recurrence: tr.recurrence,
      accountId: tr.accountId,
      cardId: tr.cardId || '',
      installments: '',
      fixed: tr.fixed || false,
      tags: tr.tags?.join(', ') || '',
    });
    setOpen(true);
  };

  return { open, setOpen, editingId, initialData, openAdd, openEdit };
}
