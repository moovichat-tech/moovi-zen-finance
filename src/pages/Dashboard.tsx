import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { useQuery } from '@tanstack/react-query';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const COLORS = ['hsl(145, 63%, 32%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(170, 50%, 40%)', 'hsl(200, 70%, 50%)', 'hsl(120, 40%, 55%)'];

interface TransacaoDetalhe {
  descricao: string;
  valor: number;
  categoria: string;
}

interface DashboardData {
  saldoTotal: number;
  receitaMes: number;
  despesaMes: number;
  resultadoLiquido: number;
  receitasDetalhadas: TransacaoDetalhe[];
  despesasDetalhadas: TransacaoDetalhe[];
  evolucaoMensal: { month: string; income: number; expense: number }[];
  gastosCategoria: { name: string; value: number }[];
  comparacaoMensal: { category: string; current: number; previous: number }[];
  saldoContas: { name: string; icon: string; balance: number }[];
  alertasOrcamento: { category: string; icon: string; spent: number; limit: number; percent: number }[];
}

const CustomXAxisTick = ({ x, y, payload, hoveredTick, setHoveredTick }: any) => {
  const isHovered = hoveredTick === payload.value;
  const isOtherHovered = hoveredTick !== null && hoveredTick !== payload.value;

  return (
    <text
      x={x}
      y={y + 15}
      textAnchor="middle"
      fontSize={isHovered ? 14 : isOtherHovered ? 10 : 11}
      fontWeight={isHovered ? 'bold' : 'normal'}
      fill={isHovered ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
      opacity={isOtherHovered ? 0.4 : 1}
      style={{ transition: 'all 0.2s ease', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
      onMouseEnter={() => setHoveredTick(payload.value)}
      onMouseLeave={() => setHoveredTick(null)}
    >
      {payload.value}
    </text>
  );
};

const Dashboard = () => {
  const { t, formatCurrency } = useI18n();
  const { token } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [ano, mes] = selectedMonth.split('-');

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mes: Number(mes), ano: Number(ano) }),
      });
      if (!res.ok) throw new Error('Erro ao buscar dashboard');
      return res.json();
    },
    enabled: !!token,
  });

  const d = {
    saldoTotal: data?.saldoTotal ?? 0,
    receitaMes: data?.receitaMes ?? 0,
    despesaMes: data?.despesaMes ?? 0,
    resultadoLiquido: data?.resultadoLiquido ?? 0,
    receitasDetalhadas: data?.receitasDetalhadas ?? [],
    despesasDetalhadas: data?.despesasDetalhadas ?? [],
    evolucaoMensal: data?.evolucaoMensal ?? [],
    gastosCategoria: data?.gastosCategoria ?? [],
    comparacaoMensal: data?.comparacaoMensal ?? [],
    saldoContas: data?.saldoContas ?? [],
    alertasOrcamento: data?.alertasOrcamento ?? [],
  };

  const availableMonths = useMemo(() => {
    const cur = new Date();
    const list: string[] = [];
    for (let i = 0; i < 24; i++) {
      const dt = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      list.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
  }, []);

  const statCards = [
    { label: t.dashboard.totalBalance, value: d.saldoTotal, icon: Wallet, positive: true },
    { label: t.dashboard.monthIncome, value: d.receitaMes, icon: ArrowUpRight, positive: true },
    { label: t.dashboard.monthExpense, value: d.despesaMes, icon: ArrowDownRight, positive: false },
    { label: t.dashboard.netResult, value: d.resultadoLiquido, icon: TrendingUp, positive: d.resultadoLiquido >= 0 },
  ];

  const getTooltipContent = (index: number) => {
    switch (index) {
      case 0: // Saldo Total
        return d.saldoContas.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground mb-2">Composição do saldo:</p>
            {d.saldoContas.map((acc, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-4">
                <span className="text-muted-foreground truncate">{acc.icon} {acc.name}</span>
                <span className="font-medium text-foreground whitespace-nowrap">{formatCurrency(acc.balance)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Nenhuma conta cadastrada</p>;

      case 1: // Receitas
        return d.receitasDetalhadas.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground mb-2">Receitas do mês (excl. transferências):</p>
            {d.receitasDetalhadas.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-4">
                <span className="text-muted-foreground truncate">{r.descricao}</span>
                <span className="font-medium text-success whitespace-nowrap">{formatCurrency(r.valor)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Nenhuma receita neste mês</p>;

      case 2: // Despesas
        return d.despesasDetalhadas.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground mb-2">Despesas do mês (excl. transferências):</p>
            {d.despesasDetalhadas.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-4">
                <span className="text-muted-foreground truncate">{r.descricao}</span>
                <span className="font-medium text-destructive whitespace-nowrap">{formatCurrency(r.valor)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Nenhuma despesa neste mês</p>;

      case 3: // Resultado Líquido
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Cálculo:</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Receitas</span>
                <span className="font-medium text-success">{formatCurrency(d.receitaMes)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">− Despesas</span>
                <span className="font-medium text-destructive">{formatCurrency(d.despesaMes)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between gap-4">
                <span className="font-semibold text-foreground">= Resultado</span>
                <span className={`font-semibold ${d.resultadoLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(d.resultadoLiquido)}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const accountColors = ['hsl(145, 63%, 32%)', 'hsl(200, 70%, 50%)', 'hsl(38, 92%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(170, 50%, 40%)'];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.nav.dashboard}</h2>
          <p className="text-sm text-muted-foreground">{t.dashboard.totalBalance}</p>
        </div>
        <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} availableMonths={availableMonths} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((stat, i) => (
              <Card key={i} className="p-3 sm:p-5 card-hover relative" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{stat.label}</span>
                  <div className="flex items-center gap-1.5">
                    <HoverCard openDelay={200} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-72 p-3" side="bottom" align="end">
                        <ScrollArea className="max-h-48">
                          {getTooltipContent(i)}
                        </ScrollArea>
                      </HoverCardContent>
                    </HoverCard>
                    <stat.icon className={`h-4 w-4 ${i === 0 ? 'text-primary' : i === 1 ? 'text-success' : i === 2 ? 'text-destructive' : (stat.positive ? 'text-success' : 'text-destructive')}`} />
                  </div>
                </div>
                <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold tracking-tight">
                  {formatCurrency(stat.value)}
                </div>
              </Card>
            ))}
          </div>

          {/* Full-width Evolution Chart */}
          <Card className="p-3 sm:p-5 card-hover">
            <h3 className="mb-3 sm:mb-4 text-sm font-semibold">{t.dashboard.monthlyEvolution}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={d.evolucaoMensal}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" width={60} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="income" stroke="hsl(152, 60%, 42%)" fill="url(#incomeGrad)" strokeWidth={2} name={t.dashboard.monthIncome} />
                <Area type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)" fill="url(#expenseGrad)" strokeWidth={2} name={t.dashboard.monthExpense} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-3 sm:p-5 card-hover">
              <h3 className="mb-4 text-sm font-semibold">{t.dashboard.spendingByCategory}</h3>
              {d.gastosCategoria.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={d.gastosCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {d.gastosCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px', fontFamily: 'var(--font-sans)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {d.gastosCategoria.slice(0, 4).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{cat.name}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum gasto neste mês</p>
              )}
            </Card>

            <Card className="p-3 sm:p-5 card-hover">
              <h3 className="mb-4 text-sm font-semibold">{t.dashboard.comparison}</h3>
              {d.comparacaoMensal.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.comparacaoMensal} barGap={4} margin={{ top: 20, right: 10, left: -10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
                      <XAxis dataKey="category" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-sans)' }} tickMargin={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-sans)' }} tickMargin={10} tickLine={false} axisLine={false} width={60} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px', fontFamily: 'var(--font-sans)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="previous" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} barSize={20} name={t.dashboard.comparison + ' (anterior)'} />
                      <Bar dataKey="current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} name={t.dashboard.comparison + ' (atual)'} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Sem dados para comparação</p>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="p-3 sm:p-5 card-hover">
                <h3 className="mb-4 text-sm font-semibold">{t.dashboard.budgetAlerts}</h3>
                {d.alertasOrcamento.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum alerta</p>
                ) : (
                  <div className="space-y-3">
                    {d.alertasOrcamento.map((alert, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${alert.percent >= 90 ? 'text-destructive' : 'text-amber-500'}`} />
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="text-xs font-medium truncate">{alert.category}</span>
                            <span className={`text-[11px] font-semibold ml-2 ${alert.percent >= 90 ? 'text-destructive' : 'text-amber-500'}`}>
                              {alert.percent}%
                            </span>
                          </div>
                        </div>
                        <Progress value={alert.percent} className="h-1.5" />
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{formatCurrency(alert.spent)}</span>
                          <span>{formatCurrency(alert.limit)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-3 sm:p-5 card-hover">
                <h3 className="mb-3 text-sm font-semibold">{t.dashboard.balanceByAccount}</h3>
                <div className="space-y-2.5">
                  {d.saldoContas.length > 0 ? d.saldoContas.map((acc, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accountColors[i % accountColors.length] }} />
                        <span className="text-xs text-muted-foreground">{acc.icon} {acc.name}</span>
                      </div>
                      <span className="text-xs font-medium">{formatCurrency(acc.balance)}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground text-center py-2">Nenhuma conta cadastrada</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
