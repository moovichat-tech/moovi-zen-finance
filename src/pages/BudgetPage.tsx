import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Edit2, Plus, Trash2, Lock } from 'lucide-react';
import { MonthYearPicker } from '@/components/MonthYearPicker';

const BudgetPage = () => {
  const { t, formatCurrency } = useI18n();
  const { budgets, categories, transactions, updateBudget, addBudget, deleteBudget } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const isPastMonth = selectedMonth < currentMonth;

  // Available months from transactions
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonth);
    transactions.forEach(tr => set.add(tr.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions, currentMonth]);

  // Only show budgets whose category exists in categories.expense
  const validBudgets = useMemo(() =>
    budgets.filter(b => categories.expense.includes(b.category)),
    [budgets, categories.expense]
  );

  // Categories that don't have a budget yet
  const availableCategories = useMemo(() =>
    categories.expense.filter(c => !budgets.some(b => b.category === c)),
    [categories.expense, budgets]
  );

  // Compute spent from real transactions for selected month
  const budgetsWithSpent = useMemo(() => {
    return validBudgets.map(b => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === b.category && t.date.startsWith(selectedMonth))
        .reduce((s, t) => s + t.amount, 0);
      return { ...b, spent };
    });
  }, [validBudgets, transactions, selectedMonth]);

  const totalLimit = budgetsWithSpent.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0);

  const handleSave = (id: string) => {
    if (editValue) updateBudget(id, parseFloat(editValue));
    setEditing(null);
  };

  const handleAdd = () => {
    if (!newCategory || !newLimit) return;
    addBudget(newCategory, parseFloat(newLimit));
    setOpenAdd(false);
    setNewCategory('');
    setNewLimit('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.budget.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.budget.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} availableMonths={availableMonths} />
          {!isPastMonth && availableCategories.length > 0 && (
            <Button size="sm" className="gap-1.5" onClick={() => { setNewCategory(availableCategories[0]); setOpenAdd(true); }}>
              <Plus className="h-4 w-4" /> {t.common.add}
            </Button>
          )}
        </div>
      </div>

      {isPastMonth && (
        <Card className="p-3 flex items-center gap-2 bg-muted/50 border-muted">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Visualização de histórico — os valores deste mês não podem ser alterados.</span>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Orçamento Total</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold">{formatCurrency(totalLimit)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Gasto</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-destructive">{formatCurrency(totalSpent)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Disponível</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-success">{formatCurrency(totalLimit - totalSpent)}</div>
        </Card>
      </div>

      {/* Budget Items */}
      <div className="space-y-3">
        {budgetsWithSpent.map(budget => {
          const percent = budget.limit > 0 ? Math.min(Math.round((budget.spent / budget.limit) * 100), 100) : 0;
          const isOver = percent >= 100;
          const isWarning = percent >= 80 && percent < 100;

          return (
            <Card key={budget.id} className="p-5 card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOver ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : isWarning ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  )}
                  <span className="text-sm font-semibold">{budget.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  {!isPastMonth && (
                    <>
                      {editing === budget.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="h-7 w-28 text-xs"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSave(budget.id)}
                          />
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleSave(budget.id)}>{t.common.save}</Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditing(budget.id); setEditValue(String(budget.limit)); }}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteBudget(budget.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  <span className={`text-sm font-medium ${isOver ? 'text-destructive' : isWarning ? 'text-warning' : ''}`}>
                    {percent}%
                  </span>
                </div>
              </div>
              <Progress value={percent} className="mt-3 h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(budget.spent)} {t.common.paid?.toLowerCase() || 'gastos'}</span>
                <span>{formatCurrency(budget.limit)} limite</span>
              </div>
            </Card>
          );
        })}
        {budgetsWithSpent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum orçamento configurado. Adicione categorias de despesas primeiro.</p>
        )}
      </div>

      {/* Add Budget Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t.common.add} Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.category}</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Limite mensal</Label>
              <Input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAdd}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
