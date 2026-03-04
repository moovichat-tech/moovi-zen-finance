import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function parseNaturalLanguage(text: string, accountNames: { id: string; name: string }[]) {
  const lower = text.toLowerCase();
  let type: 'income' | 'expense' = 'expense';
  if (lower.includes('recebi') || lower.includes('salário') || lower.includes('freelance') || lower.includes('receita') || lower.includes('renda') || lower.includes('ganhei')) type = 'income';

  // Extract amount
  const amountMatch = lower.match(/(\d+[.,]?\d*)\s*(reais|real|r\$|brl|dólares|usd|euros|eur)/i) || lower.match(/r\$\s*(\d+[.,]?\d*)/i) || lower.match(/(\d+[.,]?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

  // Extract installments
  const installMatch = lower.match(/(\d+)\s*x|(\d+)\s*parcela|em\s*(\d+)\s*vez/);
  const installments = installMatch ? parseInt(installMatch[1] || installMatch[2] || installMatch[3]) : undefined;

  // Extract date
  let date = new Date().toISOString().split('T')[0];
  if (lower.includes('ontem')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  }
  const dateMatch = lower.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3] ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : String(new Date().getFullYear());
    date = `${year}-${month}-${day}`;
  }

  // Guess category
  let category = 'Outros';
  const categoryMap: Record<string, string[]> = {
    'Alimentação': ['mercado', 'supermercado', 'restaurante', 'ifood', 'lanche', 'padaria', 'café', 'almoço', 'jantar', 'pizza'],
    'Transporte': ['uber', 'taxi', '99', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô'],
    'Moradia': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'energia', 'iptu'],
    'Saúde': ['farmácia', 'médico', 'hospital', 'plano de saúde', 'consulta', 'academia', 'dentista'],
    'Lazer': ['netflix', 'cinema', 'spotify', 'jogo', 'bar', 'show', 'disney', 'hbo', 'prime'],
    'Educação': ['curso', 'livro', 'escola', 'faculdade', 'udemy', 'alura'],
    'Vestuário': ['roupa', 'sapato', 'tênis', 'camisa', 'calça', 'zara', 'nike'],
    'Salário': ['salário', 'pagamento'],
    'Freelance': ['freelance', 'projeto', 'job'],
    'Investimentos': ['dividendo', 'rendimento', 'ação', 'fundo'],
  };
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => lower.includes(k))) { category = cat; break; }
  }

  // Try to find account
  let accountId = '';
  for (const acc of accountNames) {
    if (lower.includes(acc.name.toLowerCase())) {
      accountId = acc.id;
      break;
    }
  }

  // Extract description
  const description = text
    .replace(/\d+[.,]?\d*\s*(reais|real|r\$|brl)/gi, '')
    .replace(/r\$\s*\d+[.,]?\d*/gi, '')
    .replace(/\d+[.,]?\d*/g, '')
    .replace(/\s*(em|no|na|do|da|de|hoje|ontem|x|parcela|parcelas|vezes)\s*/gi, ' ')
    .trim()
    .split(/\s+/).slice(0, 4).join(' ') || text.slice(0, 30);

  return { type, amount, installments, category, description, accountId, date };
}

const AIPage = () => {
  const { t, formatCurrency } = useI18n();
  const { addTransaction, accounts, transactions, categories } = useData();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Olá! Sou seu assistente financeiro. Você pode me enviar lançamentos em linguagem natural como:\n\n• "Mercado 320 reais no Nubank em 3x hoje"\n• "Recebi 8500 salário"\n• "Uber 45 reais débito"\n• "Aluguel 2800 ontem"\n\nTambém posso te dar um resumo financeiro. Tente: "resumo do mês"' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);

    const lower = input.toLowerCase();
    let response: string;

    if (lower.includes('resumo') || lower.includes('summary') || lower.includes('balanço')) {
      const now = new Date();
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthTx = transactions.filter(tr => tr.date.startsWith(curMonth));
      const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const totalExpenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      // Category breakdown
      const catMap: Record<string, number> = {};
      monthTx.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
      const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      
      response = `📊 **Resumo do Mês (${curMonth})**\n\n💰 Receitas: ${formatCurrency(totalIncome)}\n💸 Despesas: ${formatCurrency(totalExpenses)}\n📈 Resultado: ${formatCurrency(totalIncome - totalExpenses)}\n\n📋 **Top Categorias de Despesa:**\n${topCats.map(([cat, val]) => `• ${cat}: ${formatCurrency(val)}`).join('\n')}\n\n${totalIncome > totalExpenses ? '✅ Você está no positivo!' : '⚠️ Suas despesas superaram as receitas.'}`;
    } else if (lower.includes('categorias') || lower.includes('categoria')) {
      response = `📁 **Categorias configuradas:**\n\n💰 **Receitas:** ${categories.income.join(', ')}\n\n💸 **Despesas:** ${categories.expense.join(', ')}`;
    } else if (lower.includes('contas') || lower.includes('saldo')) {
      const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
      response = `🏦 **Saldos por Conta:**\n\n${accounts.map(a => `• ${a.name}: ${formatCurrency(a.balance)}`).join('\n')}\n\n💰 **Total:** ${formatCurrency(totalBalance)}`;
    } else {
      const accountNames = accounts.map(a => ({ id: a.id, name: a.name }));
      const parsed = parseNaturalLanguage(input, accountNames);
      if (parsed.amount > 0) {
        const defaultAccount = parsed.accountId || accounts[0]?.id || '';
        const accName = accounts.find(a => a.id === defaultAccount)?.name || 'Padrão';
        addTransaction({
          type: parsed.type,
          description: parsed.description,
          amount: parsed.amount,
          category: parsed.category,
          date: parsed.date,
          status: parsed.type === 'income' ? 'received' : 'paid',
          recurrence: 'once',
          accountId: defaultAccount,
          installments: parsed.installments,
          currentInstallment: parsed.installments ? 1 : undefined,
          tags: [],
        });
        response = `✅ Lançamento registrado!\n\n• **Tipo:** ${parsed.type === 'income' ? 'Receita' : 'Despesa'}\n• **Descrição:** ${parsed.description}\n• **Valor:** ${formatCurrency(parsed.amount)}\n• **Categoria:** ${parsed.category}\n• **Conta:** ${accName}\n• **Data:** ${parsed.date}${parsed.installments ? `\n• **Parcelas:** ${parsed.installments}x de ${formatCurrency(parsed.amount / parsed.installments)}` : ''}`;
      } else {
        response = 'Não consegui interpretar. Tente algo como:\n• "Mercado 320 reais"\n• "Recebi 5000 freelance"\n• "Resumo do mês"\n• "Saldo das contas"';
      }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: response }]);
    }, 300);

    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col animate-in-up">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{t.pages.ai.title}</h2>
        <p className="text-sm text-muted-foreground">{t.pages.ai.subtitle}</p>
      </div>

      <Card className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
            }`}>
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
      </Card>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Ex: Mercado 320 reais no Nubank em 3x hoje"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} className="gap-1.5">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AIPage;
