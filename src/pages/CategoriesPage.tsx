import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Tag } from 'lucide-react';

const CategoriesPage = () => {
  const { t } = useI18n();
  const { categories, addCategory, deleteCategory, updateCategory } = useData();
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ type: 'income' | 'expense'; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', type: 'expense' as 'income' | 'expense' });
  const [activeTab, setActiveTab] = useState('expense');

  const openAdd = (type: 'income' | 'expense') => {
    setEditingCategory(null);
    setForm({ name: '', type });
    setOpen(true);
  };

  const openEdit = (type: 'income' | 'expense', name: string) => {
    setEditingCategory({ type, name });
    setForm({ name, type });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingCategory) {
      updateCategory(editingCategory.type, editingCategory.name, form.name.trim());
    } else {
      addCategory(form.type, form.name.trim());
    }
    setOpen(false);
  };

  const renderCategoryList = (type: 'income' | 'expense') => {
    const list = type === 'income' ? categories.income : categories.expense;
    return (
      <div className="space-y-2">
        {list.map(cat => (
          <div key={cat} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{cat}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(type, cat)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCategory(type, cat)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma categoria cadastrada</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Categorias</h2>
          <p className="text-sm text-muted-foreground">Gerencie suas categorias de receitas e despesas</p>
        </div>
      </div>

      <Card className="p-3 sm:p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <TabsList className="h-auto flex-wrap gap-1">
              <TabsTrigger value="expense" className="text-xs sm:text-sm">Despesas ({categories.expense.length})</TabsTrigger>
              <TabsTrigger value="income" className="text-xs sm:text-sm">Receitas ({categories.income.length})</TabsTrigger>
            </TabsList>
            <Button size="sm" className="gap-1.5 self-start sm:self-auto" onClick={() => openAdd(activeTab as 'income' | 'expense')}>
              <Plus className="h-4 w-4" /> {t.common.add}
            </Button>
          </div>
          <TabsContent value="expense">{renderCategoryList('expense')}</TabsContent>
          <TabsContent value="income">{renderCategoryList('income')}</TabsContent>
        </Tabs>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar' : 'Adicionar'} Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da categoria</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Alimentação" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {form.type === 'income' ? 'Receita' : 'Despesa'}
            </Badge>
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

export default CategoriesPage;
