import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, FileSpreadsheet } from 'lucide-react';

const COLORS = ['hsl(234, 62%, 52%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)'];

const ReportsPage = () => {
  const { t, formatCurrency } = useI18n();
  const { transactions } = useData();
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tr => {
      if (period === 'month') {
        return tr.date.startsWith(selectedMonth);
      } else if (period === 'year') {
        return tr.date.startsWith(selectedYear);
      } else if (period === 'custom' && customStart && customEnd) {
        return tr.date >= customStart && tr.date <= customEnd;
      }
      return true;
    });
  }, [transactions, period, selectedMonth, selectedYear, customStart, customEnd]);

  const income = filteredTransactions.filter(tr => tr.type === 'income');
  const expenses = filteredTransactions.filter(tr => tr.type === 'expense');
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const year = period === 'year' ? selectedYear : selectedMonth.split('-')[0];
    return months.map((month, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const prefix = `${year}-${monthStr}`;
      const inc = transactions.filter(tr => tr.type === 'income' && tr.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
      const exp = transactions.filter(tr => tr.type === 'expense' && tr.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
      return { month, income: inc, expense: exp };
    }).filter(d => d.income > 0 || d.expense > 0);
  }, [transactions, period, selectedMonth, selectedYear]);

  const exportCSV = () => {
    const headers = 'Tipo,Descrição,Valor,Categoria,Data,Status\n';
    const rows = filteredTransactions.map(tr => `${tr.type},${tr.description},${tr.amount},${tr.category},${tr.date},${tr.status}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'moovi-relatorio.csv'; a.click();
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tr => { set.add(tr.date.substring(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tr => { set.add(tr.date.substring(0, 4)); });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.reports.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.reports.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {period === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {period === 'custom' && (
            <>
              <Input type="date" className="h-8 w-36 text-xs" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <Input type="date" className="h-8 w-36 text-xs" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportCSV}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Receitas</span>
          <div className="mt-1 text-xl font-semibold text-success">{formatCurrency(totalIncome)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Despesas</span>
          <div className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(totalExpenses)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">Resultado</span>
          <div className={`mt-1 text-xl font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <h3 className="mb-4 text-sm font-semibold">Receitas vs Despesas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 92%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
              <Bar dataKey="income" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {categoryBreakdown.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{cat.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
