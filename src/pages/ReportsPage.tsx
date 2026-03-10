import { useMemo, useState, useRef } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, FileSpreadsheet, Download, ArrowUpDown } from 'lucide-react';

const COLORS = ['hsl(145, 63%, 32%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(170, 50%, 40%)', 'hsl(200, 70%, 50%)', 'hsl(120, 40%, 55%)'];

type DetailSortKey = 'description' | 'category' | 'date' | 'amount' | 'type';

const ReportsPage = () => {
  const { t, formatCurrency, formatDate, translatePeriod } = useI18n();
  const { transactions, accounts } = useData();
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [detailSort, setDetailSort] = useState<DetailSortKey>('date');
  const [detailSortAsc, setDetailSortAsc] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleDetailSort = (key: DetailSortKey) => {
    if (detailSort === key) setDetailSortAsc(!detailSortAsc);
    else { setDetailSort(key); setDetailSortAsc(false); }
  };

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

  const accountBreakdown = useMemo(() => {
    const map: Record<string, { income: number; expense: number; name: string }> = {};
    filteredTransactions.forEach(tr => {
      const acc = accounts.find(a => a.id === tr.accountId);
      const name = acc?.name || 'Desconhecida';
      const key = acc?.id || '__unknown__';
      if (!map[key]) map[key] = { income: 0, expense: 0, name };
      if (tr.type === 'income') map[key].income += tr.amount;
      else map[key].expense += tr.amount;
    });
    return Object.values(map);
  }, [filteredTransactions, accounts]);

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

  const detailTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (detailSort === 'description') cmp = a.description.localeCompare(b.description);
      else if (detailSort === 'category') cmp = a.category.localeCompare(b.category);
      else if (detailSort === 'date') cmp = a.date.localeCompare(b.date);
      else if (detailSort === 'amount') cmp = a.amount - b.amount;
      else if (detailSort === 'type') cmp = a.type.localeCompare(b.type);
      return detailSortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [filteredTransactions, detailSort, detailSortAsc]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tr => set.add(tr.category));
    return Array.from(set).sort();
  }, [transactions]);

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

  const exportCSV = () => {
    const BOM = '\uFEFF';
    const sep = ';';
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const headers = ['Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Status', 'Conta'].map(esc).join(sep) + '\r\n';
    const rows = filteredTransactions.map(tr => {
      const acc = accounts.find(a => a.id === tr.accountId)?.name || '';
      return [
        tr.type === 'income' ? 'Receita' : 'Despesa',
        tr.description,
        tr.amount.toFixed(2).replace('.', ','),
        tr.category,
        tr.date,
        tr.status,
        acc,
      ].map(esc).join(sep);
    }).join('\r\n');
    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'moovi-relatorio.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const BOM = '\uFEFF';
    const sep = '\t';
    const esc = (s: string) => s.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const headers = ['Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Status', 'Conta'].map(esc).join(sep) + '\r\n';
    const rows = filteredTransactions.map(tr => {
      const acc = accounts.find(a => a.id === tr.accountId)?.name || '';
      return [
        tr.type === 'income' ? 'Receita' : 'Despesa',
        esc(tr.description),
        tr.amount.toFixed(2).replace('.', ','),
        esc(tr.category),
        tr.date,
        tr.status,
        esc(acc),
      ].join(sep);
    }).join('\r\n');
    const blob = new Blob([BOM + headers + rows], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'moovi-relatorio.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = filteredTransactions.map(tr => {
      const acc = accounts.find(a => a.id === tr.accountId)?.name || '';
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${tr.type === 'income' ? 'Receita' : 'Despesa'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${tr.description}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(tr.amount)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${tr.category}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${formatDate(tr.date)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${acc}</td>
      </tr>`;
    }).join('');
    printWindow.document.write(`<!DOCTYPE html>
      <html><head><title>Relatório Moovi</title>
      <meta charset="utf-8">
      <style>body{font-family:'DM Sans',sans-serif;padding:40px;color:#1a1a2e}
      h1{font-size:20px;margin-bottom:4px}p{color:#666;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{text-align:left;padding:8px 10px;border-bottom:2px solid #ddd;font-weight:600}
      .summary{display:flex;gap:24px;margin-bottom:24px}
      .summary div{padding:12px 16px;border-radius:8px;background:#f5f5f7}
      .summary .val{font-size:18px;font-weight:600;margin-top:4px}
      .green{color:#2ba35d}.red{color:#d32f2f}
      @media print{body{padding:20px}}</style></head><body>
      <h1>Relatório Financeiro — Moovi</h1>
      <p>Período: ${period === 'month' ? selectedMonth : period === 'year' ? selectedYear : `${customStart} a ${customEnd}`}</p>
      <div class="summary">
        <div><span>Total Receitas</span><div class="val green">${formatCurrency(totalIncome)}</div></div>
        <div><span>Total Despesas</span><div class="val red">${formatCurrency(totalExpenses)}</div></div>
        <div><span>Resultado</span><div class="val ${totalIncome - totalExpenses >= 0 ? 'green' : 'red'}">${formatCurrency(totalIncome - totalExpenses)}</div></div>
      </div>
      <table><thead><tr><th>Tipo</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Categoria</th><th>Data</th><th>Conta</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>setTimeout(()=>window.print(),300)<\/script></body></html>
    `);
    printWindow.document.close();
  };

  const SortHead = ({ label, field }: { label: string; field: DetailSortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleDetailSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${detailSort === field ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.pages.reports.title}</h2>
          <p className="text-sm text-muted-foreground">{t.pages.reports.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-28 sm:w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{translatePeriod('month')}</SelectItem>
              <SelectItem value="year">{translatePeriod('year')}</SelectItem>
              <SelectItem value="custom">{translatePeriod('custom')}</SelectItem>
            </SelectContent>
          </Select>
          {period === 'month' && (
            <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} availableMonths={availableMonths} />
          )}
          {period === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {period === 'custom' && (
            <>
              <DatePicker value={customStart} onChange={setCustomStart} placeholder="Data início" className="w-36 sm:w-44" />
              <DatePicker value={customEnd} onChange={setCustomEnd} placeholder="Data fim" className="w-36 sm:w-44" />
            </>
          )}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-28 sm:w-36 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="h-8 w-28 sm:w-36 text-xs"><SelectValue placeholder="Conta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas contas</SelectItem>
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
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportExcel}>
          <Download className="h-3.5 w-3.5" /> Excel
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportPDF}>
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Receitas</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-success">{formatCurrency(totalIncome)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Total Despesas</span>
          <div className="mt-1 text-lg sm:text-xl font-semibold text-destructive">{formatCurrency(totalExpenses)}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Resultado</span>
          <div className={`mt-1 text-lg sm:text-xl font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </Card>
      </div>

      {/* Tabs for different report views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="category">Por Categoria</TabsTrigger>
          <TabsTrigger value="account">Por Conta</TabsTrigger>
          <TabsTrigger value="detail">Detalhado</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2 p-5">
              <h3 className="mb-4 text-sm font-semibold">Receitas vs Despesas</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="income" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} barSize={20} name="Receitas" />
                  <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} barSize={20} name="Despesas" />
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
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
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

        <TabsContent value="category">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Despesas por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="hsl(145, 63%, 32%)" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Detalhamento</h3>
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => {
                  const pct = totalExpenses > 0 ? Math.round((cat.value / totalExpenses) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">{pct}% — {formatCurrency(cat.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="grid grid-cols-2 gap-4">
            {accountBreakdown.map((acc, i) => (
              <Card key={i} className="p-5">
                <h3 className="text-sm font-semibold mb-3">{acc.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Receitas</span>
                    <div className="text-lg font-semibold text-success">{formatCurrency(acc.income)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Despesas</span>
                    <div className="text-lg font-semibold text-destructive">{formatCurrency(acc.expense)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Resultado</span>
                  <div className={`text-lg font-semibold ${acc.income - acc.expense >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(acc.income - acc.expense)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead label="Tipo" field="type" />
                  <SortHead label={t.common.description} field="description" />
                  <SortHead label={t.common.category} field="category" />
                  <SortHead label={t.common.date} field="date" />
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleDetailSort('amount')}>
                    <div className="flex items-center justify-end gap-1">
                      {t.common.amount}
                      <ArrowUpDown className={`h-3 w-3 ${detailSort === 'amount' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                    </div>
                  </TableHead>
                  <TableHead>Conta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailTransactions.map(tr => (
                  <TableRow key={tr.id}>
                    <TableCell>
                      <Badge variant={tr.type === 'income' ? 'default' : 'secondary'} className="text-[10px]">
                        {tr.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tr.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tr.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(tr.date)}</TableCell>
                    <TableCell className={`text-right font-medium ${tr.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {accounts.find(a => a.id === tr.accountId)?.name || '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {detailTransactions.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma transação encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
