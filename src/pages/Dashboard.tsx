import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Sparkles, Send, Bot, User } from 'lucide-react';
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

// Natural language parser (from AIPage)
function parseNaturalLanguage(text: string, accountNames: { id: string; name: string }[]) {
  const lower = text.toLowerCase();
  let type: 'income' | 'expense' = 'expense';
  if (lower.includes('recebi') || lower.includes('salário') || lower.includes('freelance') || lower.includes('receita') || lower.includes('ganhei')) type = 'income';
  const amountMatch = lower.match(/(\d+[.,]?\d*)\s*(reais|real|r\$|brl|dólares|usd|euros|eur)/i) || lower.match(/r\$\s*(\d+[.,]?\d*)/i) || lower.match(/(\d+[.,]?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
  const installMatch = lower.match(/(\d+)\s*x|(\d+)\s*parcela|em\s*(\d+)\s*vez/);
  const installments = installMatch ? parseInt(installMatch[1] || installMatch[2] || installMatch[3]) : undefined;
  let accountId = '';
  for (const acc of accountNames) {
    if (lower.includes(acc.name.toLowerCase())) { accountId = acc.id; break; }
  }
  let category = 'Outros';
  const categoryMap: Record<string, string[]> = {
    'Alimentação': ['mercado', 'supermercado', 'restaurante', 'ifood', 'lanche', 'padaria', 'café', 'comida', 'almoço', 'jantar'],
    'Transporte': ['uber', 'taxi', '99', 'gasolina', 'combustível', 'estacionamento'],
    'Moradia': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'iptu'],
    'Saúde': ['farmácia', 'médico', 'hospital', 'consulta', 'remédio'],
    'Lazer': ['netflix', 'cinema', 'spotify', 'jogo', 'bar', 'show', 'viagem'],
    'Educação': ['curso', 'livro', 'escola', 'faculdade', 'udemy'],
    'Salário': ['salário', 'pagamento'],
    'Freelance': ['freelance', 'projeto', 'cliente'],
    'Investimentos': ['dividendo', 'rendimento', 'investimento'],
  };
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => lower.includes(k))) { category = cat; break; }
  }
  const description = text.replace(/\d+[.,]?\d*\s*(reais|real|r\$|brl|dólares|usd|euros|eur|x|parcela|vez)/gi, '').replace(/r\$\s*\d+[.,]?\d*/gi, '').replace(/(no|na|em|hoje|ontem)\s+\w+/gi, '').trim().slice(0, 40) || text.slice(0, 30);
  return { type, amount, installments, category, description: description || category, accountId };
}

interface Message { id: string; role: 'user' | 'assistant'; content: string; }

const Dashboard = () => {
  const { t, formatCurrency } = useI18n();
  const { transactions, accounts, budgets, addTransaction } = useData();
  const [quickEntry, setQuickEntry] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Olá! Envie um comando como:\n• "Mercado 320 reais no Nubank em 3x"\n• "Recebi 8500 salário"\n• "resumo do mês"' },
  ]);
  const [aiInput, setAiInput] = useState('');

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    const lower = aiInput.toLowerCase();
    let response: string;

    if (lower.includes('resumo') || lower.includes('summary')) {
      const totalInc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const totalExp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const topExpenses = transactions.filter(t => t.type === 'expense').reduce((map, t) => { map[t.category] = (map[t.category] || 0) + t.amount; return map; }, {} as Record<string, number>);
      const topList = Object.entries(topExpenses).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, val]) => `  • ${cat}: ${formatCurrency(val)}`).join('\n');
      response = `📊 Resumo:\n💰 Receitas: ${formatCurrency(totalInc)}\n💸 Despesas: ${formatCurrency(totalExp)}\n📈 Resultado: ${formatCurrency(totalInc - totalExp)}\n\n${topList}`;
    } else {
      const accountNames = accounts.map(a => ({ id: a.id, name: a.name }));
      const parsed = parseNaturalLanguage(aiInput, accountNames);
      if (parsed.amount > 0) {
        const finalAccountId = parsed.accountId || accounts[0]?.id || '';
        const accountName = accounts.find(a => a.id === finalAccountId)?.name || 'padrão';
        if (parsed.installments && parsed.installments > 1) {
          const instAmount = parsed.amount / parsed.installments;
          for (let i = 0; i < parsed.installments; i++) {
            const date = new Date(); date.setMonth(date.getMonth() + i);
            addTransaction({ type: parsed.type, description: parsed.description, amount: instAmount, category: parsed.category, date: date.toISOString().split('T')[0], status: i === 0 ? (parsed.type === 'income' ? 'received' : 'paid') : 'planned', recurrence: 'once', accountId: finalAccountId, installments: parsed.installments, currentInstallment: i + 1, tags: [] });
          }
        } else {
          addTransaction({ type: parsed.type, description: parsed.description, amount: parsed.amount, category: parsed.category, date: new Date().toISOString().split('T')[0], status: parsed.type === 'income' ? 'received' : 'paid', recurrence: 'once', accountId: finalAccountId, tags: [] });
        }
        response = `✅ Registrado!\n• ${parsed.type === 'income' ? 'Receita' : 'Despesa'}: ${parsed.description}\n• ${formatCurrency(parsed.amount)} — ${accountName}${parsed.installments ? ` (${parsed.installments}x)` : ''}`;
      } else {
        response = 'Não entendi. Tente: "Mercado 320 reais" ou "resumo"';
      }
    }
    setTimeout(() => { setAiMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: response }]); }, 300);
    setAiInput('');
  };

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
      if (!map[t.category]) map[t.category] = { current: 0, previous: 0 }; map[t.category].current += t.amount;
    });
    transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).forEach(t => {
      if (!map[t.category]) map[t.category] = { current: 0, previous: 0 }; map[t.category].previous += t.amount;
    });
    return Object.entries(map).map(([category, data]) => ({ category, ...data }));
  }, [transactions, selectedMonth]);

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
    <div className="space-y-4 sm:space-y-6 animate-in-up">
      {/* AI Quick Command Bar */}
      <Card className="p-3 sm:p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Dê seu comando para o Moovi</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder='Ex: "Mercado 320 reais no Nubank" ou "resumo do mês"'
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiSend()}
            className="flex-1 text-xs h-9"
          />
          <Button size="sm" onClick={handleAiSend} className="gap-1.5 h-9 px-3">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        {aiMessages.length > 1 && (
          <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
            {aiMessages.slice(-4).map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[11px] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-auto w-full sm:w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="p-3 sm:p-5 card-hover" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${i === 0 ? 'text-primary' : i === 1 ? 'text-success' : i === 2 ? 'text-destructive' : (stat.positive ? 'text-success' : 'text-destructive')}`} />
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
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" width={60} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} formatter={(value: number) => formatCurrency(value)} />
            <Area type="monotone" dataKey="income" stroke="hsl(152, 60%, 42%)" fill="url(#incomeGrad)" strokeWidth={2} name={t.dashboard.monthIncome} />
            <Area type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)" fill="url(#expenseGrad)" strokeWidth={2} name={t.dashboard.monthExpense} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Second Row: Pie + Comparison + Budget + Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-3 sm:p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.spendingByCategory}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px', fontFamily: 'var(--font-sans)' }} formatter={(value: number) => formatCurrency(value)} />
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

        <Card className="p-3 sm:p-5 card-hover">
          <h3 className="mb-4 text-sm font-semibold">{t.dashboard.comparison}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
              <XAxis dataKey="category" tick={{ fontSize: 10, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-sans)' }} stroke="currentColor" className="text-muted-foreground" width={50} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '12px', fontFamily: 'var(--font-sans)' }} formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="previous" fill="hsl(140, 8%, 80%)" radius={[3, 3, 0, 0]} barSize={16} name={t.dashboard.comparison + ' (anterior)'} />
              <Bar dataKey="current" fill="hsl(145, 63%, 32%)" radius={[3, 3, 0, 0]} barSize={16} name={t.dashboard.comparison + ' (atual)'} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-4">
          <Card className="p-3 sm:p-5 card-hover">
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

          <Card className="p-3 sm:p-5 card-hover">
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
