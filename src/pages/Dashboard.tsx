import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useAuth } from '@/hooks/useAuth';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Loader2, AlertTriangle, Info, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Rectangle, Legend,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
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
  evolucaoTempo: { label: string; receitas: number; despesas: number }[];
  gastosCategoria: { name: string; value: number }[];
  comparacaoMensal: { category: string; current: number; previous: number }[];
  saldoContas: { name: string; icon: string; balance: number }[];
  alertasOrcamento: { category: string; icon: string; spent: number; limit: number; percent: number }[];
}

type DatePreset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

function getPresetRange(preset: DatePreset): { dataInicio: string; dataFim: string } {
  const now = new Date();
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { dataInicio: fmt(start), dataFim: fmt(end) };
  }
  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dataInicio: fmt(start), dataFim: fmt(end) };
  }
  // thisYear
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { dataInicio: fmt(start), dataFim: fmt(end) };
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const [preset, setPreset] = useState<DatePreset>('thisMonth');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [hoveredTick, setHoveredTick] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const dateRange = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return { dataInicio: fmt(customFrom), dataFim: fmt(customTo) };
    }
    if (preset === 'custom') return null;
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard', dateRange],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dateRange),
      });
      if (!res.ok) throw new Error('Erro ao buscar dashboard');
      return res.json();
    },
    enabled: !!token && !!dateRange,
  });

  const d = {
    saldoTotal: data?.saldoTotal ?? 0,
    receitaMes: data?.receitaMes ?? 0,
    despesaMes: data?.despesaMes ?? 0,
    resultadoLiquido: data?.resultadoLiquido ?? 0,
    receitasDetalhadas: data?.receitasDetalhadas ?? [],
    despesasDetalhadas: data?.despesasDetalhadas ?? [],
    evolucaoTempo: data?.evolucaoTempo ?? [],
    gastosCategoria: data?.gastosCategoria ?? [],
    comparacaoMensal: data?.comparacaoMensal ?? [],
    saldoContas: data?.saldoContas ?? [],
    alertasOrcamento: data?.alertasOrcamento ?? [],
  };

  const presetLabels: Record<string, string> = {
    thisMonth: t.dashboard.thisMonth,
    lastMonth: t.dashboard.lastMonth2,
    thisYear: t.dashboard.thisYear,
    custom: t.dashboard.custom,
  };

  const statCards = [
    { label: t.dashboard.totalBalance, value: d.saldoTotal, icon: Wallet, positive: true },
    { label: t.dashboard.monthIncome, value: d.receitaMes, icon: ArrowUpRight, positive: true },
    { label: t.dashboard.monthExpense, value: d.despesaMes, icon: ArrowDownRight, positive: false },
    { label: t.dashboard.netResult, value: d.resultadoLiquido, icon: TrendingUp, positive: d.resultadoLiquido >= 0 },
  ];

  const getTooltipContent = (index: number) => {
    switch (index) {
      case 0:
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
      case 1:
        return d.receitasDetalhadas.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground mb-2">Receitas do período (excl. transferências):</p>
            {d.receitasDetalhadas.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-4">
                <span className="text-muted-foreground truncate">{r.descricao}</span>
                <span className="font-medium text-success whitespace-nowrap">{formatCurrency(r.valor)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Nenhuma receita neste período</p>;
      case 2:
        return d.despesasDetalhadas.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground mb-2">Despesas do período (excl. transferências):</p>
            {d.despesasDetalhadas.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-4">
                <span className="text-muted-foreground truncate">{r.descricao}</span>
                <span className="font-medium text-destructive whitespace-nowrap">{formatCurrency(r.valor)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Nenhuma despesa neste período</p>;
      case 3:
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{t.nav.dashboard}</h2>
          <p className="text-sm text-muted-foreground">{t.dashboard.totalBalance}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">{presetLabels.thisMonth}</SelectItem>
              <SelectItem value="lastMonth">{presetLabels.lastMonth}</SelectItem>
              <SelectItem value="thisYear">{presetLabels.thisYear}</SelectItem>
              <SelectItem value="custom">{presetLabels.custom}</SelectItem>
            </SelectContent>
          </Select>
          {preset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {customFrom ? format(customFrom, 'dd/MM/yy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {customTo ? format(customTo, 'dd/MM/yy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
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

          {/* Full-width Evolution Chart - BarChart */}
          <Card className="p-3 sm:p-5 card-hover">
            <h3 className="mb-3 sm:mb-4 text-sm font-semibold">{t.dashboard.monthlyEvolution}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={d.evolucaoTempo}
                barGap={2}
                onMouseMove={(state: any) => { if (state?.activeTooltipIndex !== undefined) setActiveIndex(state.activeTooltipIndex); }}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" width={60} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name={t.dashboard.monthIncome} activeBar={<Rectangle stroke="hsl(var(--foreground))" strokeWidth={2} strokeOpacity={0.8} />}>
                  {d.evolucaoTempo.map((_, index) => (
                    <Cell key={`cell-rec-${index}`} fill="#10b981" fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.3} style={{ transition: 'all 0.3s ease', cursor: 'pointer' }} />
                  ))}
                </Bar>
                <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name={t.dashboard.monthExpense} activeBar={<Rectangle stroke="hsl(var(--foreground))" strokeWidth={2} strokeOpacity={0.8} />}>
                  {d.evolucaoTempo.map((_, index) => (
                    <Cell key={`cell-desp-${index}`} fill="#ef4444" fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.3} style={{ transition: 'all 0.3s ease', cursor: 'pointer' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-3 sm:p-5 card-hover">
              <h3 className="mb-4 text-sm font-semibold">{t.dashboard.spendingByCategory}</h3>
              {(() => {
                const chartData = groupSmallCategories(d.gastosCategoria);
                return chartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 180}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 50} outerRadius={isMobile ? 65 : 75} paddingAngle={3} dataKey="value" label={isMobile ? false : undefined}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px', fontFamily: 'var(--font-sans)' }} itemStyle={{ color: 'hsl(var(--foreground))' }} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => formatCurrency(value)} />
                      {isMobile && <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(value: string) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>} />}
                    </PieChart>
                  </ResponsiveContainer>
                  {!isMobile && (
                  <div className="mt-2 space-y-1.5">
                    {chartData.slice(0, 4).map((cat, i) => (
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
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum gasto neste período</p>
              )}
            </Card>

            <Card className="p-3 sm:p-5 card-hover">
              <h3 className="mb-4 text-sm font-semibold">{t.dashboard.comparison}</h3>
              {d.comparacaoMensal.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.comparacaoMensal} barGap={4} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
                      <XAxis dataKey="category" tick={<CustomXAxisTick hoveredTick={hoveredTick} setHoveredTick={setHoveredTick} />} tickLine={false} axisLine={false} interval={0} />
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
