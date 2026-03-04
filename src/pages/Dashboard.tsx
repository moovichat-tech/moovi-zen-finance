import { useI18n } from '@/i18n/context';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Sparkles, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useState } from 'react';

const monthlyData = [
  { month: 'Jan', income: 8500, expense: 5200 },
  { month: 'Fev', income: 9200, expense: 6100 },
  { month: 'Mar', income: 8800, expense: 5800 },
  { month: 'Abr', income: 10500, expense: 6400 },
  { month: 'Mai', income: 9800, expense: 7200 },
  { month: 'Jun', income: 11200, expense: 6800 },
];

const categoryData = [
  { name: 'Moradia', value: 2800, color: 'hsl(234, 62%, 52%)' },
  { name: 'Alimentação', value: 1200, color: 'hsl(152, 60%, 42%)' },
  { name: 'Transporte', value: 800, color: 'hsl(38, 92%, 50%)' },
  { name: 'Lazer', value: 600, color: 'hsl(280, 60%, 55%)' },
  { name: 'Saúde', value: 400, color: 'hsl(200, 70%, 50%)' },
  { name: 'Outros', value: 1000, color: 'hsl(0, 72%, 51%)' },
];

const comparisonData = [
  { category: 'Moradia', current: 2800, previous: 2800 },
  { category: 'Alimentação', current: 1200, previous: 1400 },
  { category: 'Transporte', current: 800, previous: 950 },
  { category: 'Lazer', current: 600, previous: 500 },
  { category: 'Saúde', current: 400, previous: 350 },
];

const accounts = [
  { name: 'Nubank', balance: 12450.8, color: 'hsl(280, 60%, 55%)' },
  { name: 'Itaú', balance: 8320.5, color: 'hsl(38, 92%, 50%)' },
  { name: 'Wise', balance: 3200.0, color: 'hsl(152, 60%, 42%)' },
];

const budgetAlerts = [
  { category: 'Alimentação', used: 1200, limit: 1500, percent: 80 },
  { category: 'Transporte', used: 800, limit: 900, percent: 89 },
  { category: 'Lazer', used: 600, limit: 600, percent: 100 },
];

const Dashboard = () => {
  const { t, formatCurrency } = useI18n();
  const [quickEntry, setQuickEntry] = useState('');

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const statCards = [
    { label: t.dashboard.totalBalance, value: totalBalance, icon: Wallet, trend: null },
    { label: t.dashboard.monthIncome, value: 11200, icon: ArrowUpRight, trend: '+14.3%', positive: true },
    { label: t.dashboard.monthExpense, value: 6800, icon: ArrowDownRight, trend: '-5.6%', positive: true },
    { label: t.dashboard.netResult, value: 4400, icon: TrendingUp, trend: '+38%', positive: true },
  ];

  return (
    <div className="space-y-6 animate-in-up">
      {/* Quick Entry */}
      <Card className="flex items-center gap-3 p-4 card-hover">
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

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-5 card-hover" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.trend ? (stat.positive ? 'text-success' : 'text-destructive') : 'text-primary'}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight animate-number">
              {formatCurrency(stat.value)}
            </div>
            {stat.trend && (
              <span className={`mt-1 text-xs font-medium ${stat.positive ? 'text-success' : 'text-destructive'}`}>
                {stat.trend} vs mês anterior
              </span>
            )}
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.monthlyEvolution}</h3>
          <ResponsiveContainer width="100%" height={240}>
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
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
              <Area type="monotone" dataKey="income" stroke="hsl(152, 60%, 42%)" fill="url(#incomeGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)" fill="url(#expenseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.spendingByCategory}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {categoryData.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-muted-foreground">{cat.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
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

        <Card className="p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.budgetAlerts}</h3>
          <div className="space-y-4">
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
  );
};

export default Dashboard;
