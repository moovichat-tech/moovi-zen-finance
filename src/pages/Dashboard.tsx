import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Sparkles, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

const COLORS = ['hsl(145, 63%, 32%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(170, 50%, 40%)', 'hsl(200, 70%, 50%)', 'hsl(120, 40%, 55%)'];

const Dashboard = () => {
  const { t, formatCurrency } = useI18n();
  const { transactions, accounts, budgets } = useData();
  const [quickEntry, setQuickEntry] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tr => set.add(tr.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => transactions.filter(tr => tr.date.startsWith(selectedMonth)), [transactions, selectedMonth]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const monthIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const year = selectedMonth.split('-')[0];
    return months.map((month, i) => {
      const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
      const inc = transactions.filter(tr => tr.type === 'income' && tr.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
      const exp = transactions.filter(tr => tr.type === 'expense' && tr.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
      return { month, income: inc, expense: exp };
    }).filter(d => d.income > 0 || d.expense > 0);
  }, [transactions, selectedMonth]);

  const comparisonData = useMemo(() => {
    const curMonth = selectedMonth;
    const [y, m] = curMonth.split('-').map(Number);
    const prevMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
    const map: Record<string, { current: number; previous: number }> = {};
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(curMonth)).forEach(t => {
      if (!map[t.category]) map[t.category] = { current: 0, previous: 0 };
      map[t.category].current += t.amount;
    });
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).forEach(t => {
      if (!map[t.category]) map[t.category] = { current: 0, previous: 0 };
      map[t.category].previous += t.amount;
    });
    return Object.entries(map).map(([category, data]) => ({ category, ...data }));
  }, [transactions, selectedMonth]);

  // Budget alerts from real budgets, computing spent from transactions
  const budgetAlerts = useMemo(() => {
    return budgets.map(b => {
      const spent = filtered.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0);
      const percent = b.limit > 0 ? Math.min(Math.round((spent / b.limit) * 100), 100) : 0;
      return { category: b.category, used: spent, limit: b.limit, percent };
    }).filter(b => b.percent > 50).sort((a, b) => b.percent - a.percent).slice(0, 4);
  }, [budgets, filtered]);

  const statCards = [
    { label: t.dashboard.totalBalance, value: totalBalance, icon: Wallet, trend: null },
    { label: t.dashboard.monthIncome, value: monthIncome, icon: ArrowUpRight, trend: null, positive: true },
    { label: t.dashboard.monthExpense, value: monthExpense, icon: ArrowDownRight, trend: null, positive: false },
    { label: t.dashboard.netResult, value: monthIncome - monthExpense, icon: TrendingUp, trend: null, positive: monthIncome - monthExpense >= 0 },
  ];

  return (
    <div className="space-y-6 animate-in-up">
      {/* Quick Entry + Period Filter */}
      <div className="flex gap-3">
        <Card className="flex flex-1 items-center gap-3 p-4 card-hover">
          <Sparkles className="h-5 w-5 text-primary" />
          <Input
            placeholder={t.dashboard.quickEntryPlaceholder}
            value={quickEntry}
            onChange={(e) => setQuickEntry(e.target.value)}
            className="border-none bg-transparent text-sm shadow-none focus-visible:ring-0"
          />
          <Button size="sm" className="h-8 gap-1.5 px-3 text-xs">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </Card>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-auto w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-5 card-hover" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${i === 0 ? 'text-primary' : i === 1 ? 'text-success' : i === 2 ? 'text-destructive' : (stat.positive ? 'text-success' : 'text-destructive')}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {formatCurrency(stat.value)}
            </div>
          </Card>
        ))}
      </div>

      {/* Full-width Evolution Chart */}
      <Card className="p-5 card-hover">
        <h3 className="mb-4 text-sm font-semibold">{t.dashboard.monthlyEvolution}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 92%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="hsl(240, 4%, 46%)" />
            <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="hsl(240, 4%, 46%)" />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} formatter={(value: number) => formatCurrency(value)} />
            <Area type="monotone" dataKey="income" stroke="hsl(152, 60%, 42%)" fill="url(#incomeGrad)" strokeWidth={2} name={t.dashboard.monthIncome} />
            <Area type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)" fill="url(#expenseGrad)" strokeWidth={2} name={t.dashboard.monthExpense} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Second Row: Pie + Comparison + Budget + Accounts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.spendingByCategory}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {categoryData.slice(0, 4).map((cat, i) => (
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

        <Card className="p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.comparison}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 92%)" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fontFamily: 'var(--font-sans)' }} stroke="hsl(240, 4%, 46%)" />
              <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-sans)' }} stroke="hsl(240, 4%, 46%)" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
              <Bar dataKey="previous" fill="hsl(240, 5%, 88%)" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey="current" fill="hsl(234, 62%, 52%)" radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 card-hover">
            <h3 className="mb-4 text-sm font-semibold">{t.dashboard.budgetAlerts}</h3>
            <div className="space-y-4">
              {budgetAlerts.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum alerta</p>}
              {budgetAlerts.map((alert, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{alert.category}</span>
                    <span className={`${alert.percent >= 100 ? 'text-destructive' : alert.percent >= 80 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {alert.percent}%
                    </span>
                  </div>
                  <Progress value={alert.percent} className="h-1.5" />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatCurrency(alert.used)}</span>
                    <span>{formatCurrency(alert.limit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 card-hover">
            <h3 className="mb-3 text-sm font-semibold">{t.dashboard.balanceByAccount}</h3>
            <div className="space-y-2.5">
              {accounts.map((acc, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: acc.color }} />
                    <span className="text-xs text-muted-foreground">{acc.name}</span>
                  </div>
                  <span className="text-xs font-medium">{formatCurrency(acc.balance)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
