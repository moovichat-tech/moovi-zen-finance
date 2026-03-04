import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';

const COLORS = ['hsl(234, 62%, 52%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(280, 60%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(160, 50%, 50%)', 'hsl(340, 60%, 50%)'];

const ReportsPage = () => {
  const { t, formatCurrency, formatDate } = useI18n();
  const { transactions, accounts, categories } = useData();
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [reportTab, setReportTab] = useState('overview');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (period === 'month') filtered = filtered.filter(tr => tr.date.startsWith(selectedMonth));
    else if (period === 'year') filtered = filtered.filter(tr => tr.date.startsWith(selectedYear));
    else if (period === 'custom' && customStart && customEnd) filtered = filtered.filter(tr => tr.date >= customStart && tr.date <= customEnd);

    if (filterCategory !== 'all') filtered = filtered.filter(tr => tr.category === filterCategory);
    if (filterAccount !== 'all') filtered = filtered.filter(tr => tr.accountId === filterAccount);

    return filtered;
  }, [transactions, period, selectedMonth, selectedYear, customStart, customEnd, filterCategory, filterAccount]);

  const income = filteredTransactions.filter(tr => tr.type === 'income');
  const expenses = filteredTransactions.filter(tr => tr.type === 'expense');
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const incomeCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    income.forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [income]);

  const accountBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach(tr => {
      const acc = accounts.find(a => a.id === tr.accountId);
      const name = acc?.name || 'Sem conta';
      if (!map[name]) map[name] = { income: 0, expense: 0 };
      if (tr.type === 'income') map[name].income += tr.amount;
      else map[name].expense += tr.amount;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [filteredTransactions, accounts]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const year = period === 'year' ? selectedYear : selectedMonth.split('-')[0];
    return months.map((month, i) => {
      const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
      const inc = transactions.filter(tr => tr.type === 'income' && tr.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
      const exp = transactions.filter(tr => tr.type === 'expense' && tr.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
      return { month, income: inc, expense: exp, result: inc - exp };
    }).filter(d => d.income > 0 || d.expense > 0);
  }, [transactions, period, selectedMonth, selectedYear]);

  const dailyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach(tr => {
      if (!map[tr.date]) map[tr.date] = { income: 0, expense: 0 };
      if (tr.type === 'income') map[tr.date].income += tr.amount;
      else map[tr.date].expense += tr.amount;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({
      date: date.substring(5),
      ...data,
    }));
  }, [filteredTransactions]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tr => set.add(tr.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tr => set.add(tr.date.substring(0, 4)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const allCategories = useMemo(() => [...new Set([...categories.expense, ...categories.income])], [categories]);

  const exportCSV = () => {
    const headers = 'Tipo,Descrição,Valor,Categoria,Data,Status,Conta\n';
    const rows = filteredTransactions.map(tr => {
      const accName = accounts.find(a => a.id === tr.accountId)?.name || 'Sem conta';
      return `${tr.type},${tr.description},${tr.amount},${tr.category},${tr.date},${tr.status},${accName}`;
    }).join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `moovi-relatorio-${selectedMonth || selectedYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const content = `
MOOVI - RELATÓRIO FINANCEIRO
========================================
Período: ${period === 'month' ? selectedMonth : period === 'year' ? selectedYear : `${customStart} a ${customEnd}`}

RESUMO
------
Total Receitas: ${formatCurrency(totalIncome)}
Total Despesas: ${formatCurrency(totalExpenses)}
Resultado: ${formatCurrency(totalIncome - totalExpenses)}

DESPESAS POR CATEGORIA
----------------------
${categoryBreakdown.map(c => `${c.name}: ${formatCurrency(c.value)}`).join('\n')}

RECEITAS POR CATEGORIA
-----------------------
${incomeCategoryBreakdown.map(c => `${c.name}: ${formatCurrency(c.value)}`).join('\n')}

LANÇAMENTOS
-----------
${filteredTransactions.map(tr => `${tr.date} | ${tr.type === 'income' ? 'Receita' : 'Despesa'} | ${tr.description} | ${formatCurrency(tr.amount)} | ${tr.category}`).join('\n')}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `moovi-relatorio-${selectedMonth || selectedYear}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.pages.reports.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.reports.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t.common.monthly_filter}</SelectItem>
              <SelectItem value="year">{t.common.yearly_filter}</SelectItem>
              <SelectItem value="custom">{t.common.custom}</SelectItem>
            </SelectContent>
          </Select>
          {period === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {period === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {period === 'custom' && (
            <>
              <Input type="date" className="h-8 w-36 text-xs" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              <Input type="date" className="h-8 w-36 text-xs" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </>
          )}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.category}: {t.common.all}</SelectItem>
              {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Conta: {t.common.all}</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportCSV}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportPDF}>
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.income}</span>
          <div className="mt-1 text-xl font-semibold text-success">{formatCurrency(totalIncome)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.common.expense}</span>
          <div className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(totalExpenses)}</div>
        </Card>
        <Card className="p-4">
          <span className="text-xs font-medium text-muted-foreground">{t.dashboard.netResult}</span>
          <div className={`mt-1 text-xl font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="categories">{t.common.category}</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="daily">Diário</TabsTrigger>
          <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2 p-5">
              <h3 className="mb-4 text-sm font-semibold">{t.dashboard.monthlyEvolution}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(240, 6%, 92%)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
                  <Bar dataKey="income" name={t.common.income} fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" name={t.common.expense} fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">{t.dashboard.spendingByCategory}</h3>
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
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Despesas por Categoria</h3>
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => {
                  const percent = totalExpenses > 0 ? Math.round((cat.value / totalExpenses) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(cat.value)} ({percent}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Receitas por Categoria</h3>
              <div className="space-y-3">
                {incomeCategoryBreakdown.map((cat, i) => {
                  const percent = totalIncome > 0 ? Math.round((cat.value / totalIncome) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(cat.value)} ({percent}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-success" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Movimentação por Conta</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={accountBreakdown} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 92%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
                <Bar dataKey="income" name={t.common.income} fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="expense" name={t.common.expense} fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Movimentação Diária</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'var(--font-sans)' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-sans)' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-sans)' }} />
                <Line type="monotone" dataKey="income" name={t.common.income} stroke="hsl(152, 60%, 42%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" name={t.common.expense} stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.common.description}</TableHead>
                  <TableHead>{t.common.category}</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">{t.common.amount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100).map(tr => {
                  const accName = accounts.find(a => a.id === tr.accountId)?.name || 'Sem conta';
                  return (
                    <TableRow key={tr.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(tr.date)}</TableCell>
                      <TableCell className="text-xs font-medium">{tr.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tr.category}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{accName}</TableCell>
                      <TableCell className={`text-xs text-right font-medium ${tr.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
