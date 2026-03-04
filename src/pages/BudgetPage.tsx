import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Edit2 } from 'lucide-react';

const BudgetPage = () => {
  const { t, formatCurrency } = useI18n();
  const { budgets, updateBudget } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const handleSave = (id: string) => {
    if (editValue) updateBudget(id, parseFloat(editValue));
    setEditing(null);
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div>
        <h2 className="text-xl font-semibold">{t.pages.budget.title}</h2>
        <p className="text-sm text-muted-foreground">{t.pages.budget.subtitle}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Orçamento Total</span>
          <div className="mt-1 text-xl font-semibold">{formatCurrency(totalLimit)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Gasto</span>
          <div className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(totalSpent)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Disponível</span>
          <div className="mt-1 text-xl font-semibold text-success">{formatCurrency(totalLimit - totalSpent)}</div>
        </Card>
      </div>

      {/* Budget Items */}
      <div className="space-y-3">
        {budgets.map(budget => {
          const percent = Math.min(Math.round((budget.spent / budget.limit) * 100), 100);
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setEditing(budget.id); setEditValue(String(budget.limit)); }}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  <span className={`text-sm font-mono font-medium ${isOver ? 'text-destructive' : isWarning ? 'text-warning' : ''}`}>
                    {percent}%
                  </span>
                </div>
              </div>
              <Progress value={percent} className="mt-3 h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(budget.spent)} gastos</span>
                <span>{formatCurrency(budget.limit)} limite</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetPage;
