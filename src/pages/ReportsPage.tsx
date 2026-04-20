import { useMemo, useState } from 'react';
import PlanGuard from '@/components/PlanGuard';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, FileSpreadsheet, Download, ArrowUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = ['hsl(145, 63%, 32%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(170, 50%, 40%)', 'hsl(200, 70%, 50%)', 'hsl(120, 40%, 55%)'];

function groupSmallCategories(data: { name: string; value: number }[], threshold = 0.05) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length <= 6) return data;
  const main: typeof data = [];
  let othersValue = 0;
  for (const d of data) {
    if (d.value / total < threshold && main.length >= 6) {
      othersValue += d.value;
    } else {
      main.push(d);
    }
  }
  if (othersValue > 0) main.push({ name: 'Outros', value: othersValue });
  return main;
}

type DetailSortKey = 'descricao' | 'categoria' | 'data_transacao' | 'valor' | 'tipo';

interface TransacaoRaw {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  categoria: string;
  cartao: string;
  data_transacao: string;
  conta: string;
  status: string;
}

interface RelatorioData {
  resumo: { totalReceitas: number; totalDespesas: number; resultado: number };
  visaoGeral: { month: string; income: number; expense: number }[];
  porCategoria: { name: string; value: number }[];
  porConta: { name: string; income: number; expense: number }[];
  transacoesRaw: TransacaoRaw[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const callApi = async (token: string, body: Record<string, unknown>): Promise<RelatorioData> => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/get-relatorios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Erro ao buscar relatórios');
  return res.json();
};

const ReportsPage = () => {
  const { t, formatCurrency, formatDate, translatePeriod } = useI18n();
  const { token } = useAuth();
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(() => String(now.getFullYear()));
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [detailSort, setDetailSort] = useState<DetailSortKey>('data_transacao');
  const [detailSortAsc, setDetailSortAsc] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'category' | 'account' | 'detail'>('overview');
  const isMobile = useIsMobile();

  const toggleDetailSort = (key: DetailSortKey) => {
    if (detailSort === key) setDetailSortAsc(!detailSortAsc);
    else { setDetailSort(key); setDetailSortAsc(false); }
  };

  const queryPayload = useMemo(() => ({
    mes: period === 'month' ? selectedMonth : undefined,
    ano: selectedYear,
    categoria: filterCategory === 'all' ? 'Todas' : filterCategory,
    conta: filterAccount === 'all' ? 'Todas' : filterAccount,
    tipoPeriodo: period === 'year' ? 'Anual' : 'Mensal',
  }), [period, selectedMonth, selectedYear, filterCategory, filterAccount]);

  const { data, isLoading } = useQuery<RelatorioData>({
    queryKey: ['relatorios', queryPayload],
    queryFn: () => callApi(token!, queryPayload),
    enabled: !!token,
  });

  const resumo = data?.resumo ?? { totalReceitas: 0, totalDespesas: 0, resultado: 0 };
  const visaoGeral = data?.visaoGeral ?? [];
  const porCategoria = data?.porCategoria ?? [];
  const porConta = data?.porConta ?? [];
  const transacoesRaw = data?.transacoesRaw ?? [];

  // All categories from data for filter
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    transacoesRaw.forEach(tr => { if (tr.categoria) set.add(tr.categoria); });
    return Array.from(set).sort();
  }, [transacoesRaw]);

  // All accounts from data for filter
  const allAccounts = useMemo(() => {
    const set = new Set<string>();
    transacoesRaw.forEach(tr => { if (tr.conta) set.add(tr.conta); });
    return Array.from(set).sort();
  }, [transacoesRaw]);

  // Sort detail transactions
  const detailTransactions = useMemo(() => {
    const sorted = [...transacoesRaw];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (detailSort === 'descricao') cmp = (a.descricao || '').localeCompare(b.descricao || '');
      else if (detailSort === 'categoria') cmp = (a.categoria || '').localeCompare(b.categoria || '');
      else if (detailSort === 'data_transacao') cmp = (a.data_transacao || '').localeCompare(b.data_transacao || '');
      else if (detailSort === 'valor') cmp = a.valor - b.valor;
      else if (detailSort === 'tipo') cmp = (a.tipo || '').localeCompare(b.tipo || '');
      return detailSortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [transacoesRaw, detailSort, detailSortAsc]);

  // Available years for the year picker
  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(cur - i));
  }, []);

  const months = [
    { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' }, { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ];

  // ---------- Export functions ----------
  const tipoLabel = (t: string) => {
    const lower = (t || '').toLowerCase();
    return lower === 'receita' || lower === 'income' ? 'Receita' : 'Despesa';
  };

  const exportCSV = () => {
    if (!transacoesRaw.length) { toast.error('Nenhuma transação para exportar'); return; }
    const BOM = '\uFEFF';
    const sep = ';';
    const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    const headers = ['Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Status', 'Conta'].map(esc).join(sep) + '\r\n';
    const rows = transacoesRaw.map(tr =>
      [tipoLabel(tr.tipo), tr.descricao, tr.valor.toFixed(2).replace('.', ','), tr.categoria, tr.data_transacao, tr.status, tr.conta].map(v => esc(String(v ?? ''))).join(sep)
    ).join('\r\n');
    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'moovi-relatorio.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  const exportExcel = async () => {
    if (!transacoesRaw.length) { toast.error('Nenhuma transação para exportar'); return; }
    const XLSX = await import('xlsx');
    const wsData = [
      ['Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Status', 'Conta'],
      ...transacoesRaw.map(tr => [tipoLabel(tr.tipo), tr.descricao, tr.valor, tr.categoria, tr.data_transacao, tr.status, tr.conta]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'moovi-relatorio.xlsx');
    toast.success('Excel exportado!');
  };

  const exportPDF = async () => {
    if (!transacoesRaw.length) { toast.error('Nenhuma transação para exportar'); return; }
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(26, 26, 46);
    doc.text('Relatório Financeiro — Moovi', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const periodLabel = period === 'month' ? `${months.find(m => m.value === selectedMonth)?.label || ''} ${selectedYear}` : period === 'year' ? selectedYear : `${customStart} a ${customEnd}`;
    doc.text(`Período: ${periodLabel}`, 14, 28);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Receitas: ${formatCurrency(resumo.totalReceitas)}   |   Despesas: ${formatCurrency(resumo.totalDespesas)}   |   Resultado: ${formatCurrency(resumo.resultado)}`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Tipo', 'Descrição', 'Valor', 'Categoria', 'Data', 'Conta']],
      body: transacoesRaw.map(tr => [
        tipoLabel(tr.tipo),
        tr.descricao,
        formatCurrency(tr.valor),
        tr.categoria,
        tr.data_transacao ? formatDate(tr.data_transacao) : '',
        tr.conta || '',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [43, 163, 93] },
    });

    doc.save('moovi-relatorio.pdf');
    toast.success('PDF exportado!');
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
    <>
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
            <>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
          {period === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
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
              {allAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <PlanGuard requiredPlan="pro" featureName="Exportação" variant="compact">
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
        </PlanGuard>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <span className="text-xs font-medium text-muted-foreground">Total Receitas</span>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-success">{formatCurrency(resumo.totalReceitas)}</div>
            </Card>
            <Card className="p-3 sm:p-4">
              <span className="text-xs font-medium text-muted-foreground">Total Despesas</span>
              <div className="mt-1 text-lg sm:text-xl font-semibold text-destructive">{formatCurrency(resumo.totalDespesas)}</div>
            </Card>
            <Card className="p-3 sm:p-4">
              <span className="text-xs font-medium text-muted-foreground">Resultado</span>
              <div className={`mt-1 text-lg sm:text-xl font-semibold ${resumo.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(resumo.resultado)}
              </div>
            </Card>
          </div>

          {/* Tabs for different report views */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="category" className="text-xs sm:text-sm">Por Categoria</TabsTrigger>
              <TabsTrigger value="account" className="text-xs sm:text-sm">Por Conta</TabsTrigger>
              <TabsTrigger value="detail" className="text-xs sm:text-sm">Detalhado</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 p-3 sm:p-5">
                  <h3 className="mb-4 text-sm font-semibold">Receitas vs Despesas</h3>
                  {visaoGeral.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={visaoGeral} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorReceita)" name="Receitas" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorDespesa)" name="Despesas" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados para o período</p>
                  )}
                </Card>
                <Card className="p-3 sm:p-5">
                  <h3 className="mb-4 text-sm font-semibold">Despesas por Categoria</h3>
                  {(() => {
                    const chartData = groupSmallCategories(porCategoria);
                    return chartData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={isMobile ? 220 : 180}>
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={isMobile ? 35 : 45} outerRadius={isMobile ? 60 : 70} paddingAngle={3} dataKey="value" label={isMobile ? false : undefined}>
                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                          {isMobile && <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(value: string) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>} />}
                        </PieChart>
                      </ResponsiveContainer>
                      {!isMobile && (
                      <div className="mt-2 space-y-1.5">
                        {chartData.map((cat, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-muted-foreground">{cat.name}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(cat.value)}</span>
                          </div>
                        ))}
                      </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem despesas</p>
                  );
                  })()}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="category">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-3 sm:p-5">
                  <h3 className="mb-4 text-sm font-semibold">Despesas por Categoria</h3>
                  {porCategoria.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={porCategoria} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value" fill="hsl(145, 63%, 32%)" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
                  )}
                </Card>
                <Card className="p-3 sm:p-5">
                  <h3 className="mb-4 text-sm font-semibold">Detalhamento</h3>
                  <div className="space-y-3">
                    {porCategoria.map((cat, i) => {
                      const pct = resumo.totalDespesas > 0 ? Math.round((cat.value / resumo.totalDespesas) * 100) : 0;
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
                    {porCategoria.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="account">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {porConta.length > 0 ? porConta.map((acc, i) => (
                  <Card key={i} className="p-3 sm:p-5">
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
                )) : (
                  <Card className="p-5 col-span-full"><p className="text-sm text-muted-foreground text-center">Sem dados de contas</p></Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="detail">
              <Card className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Tipo" field="tipo" />
                      <SortHead label={t.common.description} field="descricao" />
                      <SortHead label={t.common.category} field="categoria" />
                      <SortHead label={t.common.date} field="data_transacao" />
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleDetailSort('valor')}>
                        <div className="flex items-center justify-end gap-1">
                          {t.common.amount}
                          <ArrowUpDown className={`h-3 w-3 ${detailSort === 'valor' ? 'text-primary' : 'text-muted-foreground/40'}`} />
                        </div>
                      </TableHead>
                      <TableHead>Conta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailTransactions.map(tr => {
                      const isIncome = (tr.tipo || '').toLowerCase() === 'receita' || (tr.tipo || '').toLowerCase() === 'income';
                      return (
                        <TableRow key={tr.id}>
                          <TableCell>
                            <Badge variant={isIncome ? 'default' : 'secondary'} className="text-[10px]">
                              {isIncome ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tr.descricao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tr.categoria}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tr.data_transacao ? formatDate(tr.data_transacao) : '—'}</TableCell>
                          <TableCell className={`text-right font-medium ${isIncome ? 'text-success' : 'text-destructive'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(tr.valor)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tr.conta || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {detailTransactions.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma transação encontrada</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
    </>
  );
};

export default ReportsPage;
