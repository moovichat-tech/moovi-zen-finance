import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useData } from '@/store/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function parseNaturalLanguage(text: string, accountNames: { id: string; name: string }[]) {
  const lower = text.toLowerCase();
  let type: 'income' | 'expense' = 'expense';
  if (lower.includes('recebi') || lower.includes('salário') || lower.includes('freelance') || lower.includes('receita') || lower.includes('ganhei')) type = 'income';

  // Extract amount
  const amountMatch = lower.match(/(\d+[.,]?\d*)\s*(reais|real|r\$|brl|dólares|usd|euros|eur)/i) || lower.match(/r\$\s*(\d+[.,]?\d*)/i) || lower.match(/(\d+[.,]?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

  // Extract installments
  const installMatch = lower.match(/(\d+)\s*x|(\d+)\s*parcela|em\s*(\d+)\s*vez/);
  const installments = installMatch ? parseInt(installMatch[1] || installMatch[2] || installMatch[3]) : undefined;

  // Match account by name
  let accountId = '';
  for (const acc of accountNames) {
    if (lower.includes(acc.name.toLowerCase()) || lower.includes(`no ${acc.name.toLowerCase()}`) || lower.includes(`na ${acc.name.toLowerCase()}`)) {
      accountId = acc.id;
      break;
    }
  }

  // Guess category
  let category = 'Outros';
  const categoryMap: Record<string, string[]> = {
    'Alimentação': ['mercado', 'supermercado', 'restaurante', 'ifood', 'lanche', 'padaria', 'café', 'comida', 'almoço', 'jantar'],
    'Transporte': ['uber', 'taxi', '99', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô'],
    'Moradia': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'iptu'],
    'Saúde': ['farmácia', 'médico', 'hospital', 'plano de saúde', 'consulta', 'remédio'],
    'Lazer': ['netflix', 'cinema', 'spotify', 'jogo', 'bar', 'show', 'viagem', 'hotel'],
    'Educação': ['curso', 'livro', 'escola', 'faculdade', 'udemy', 'mensalidade'],
    'Vestuário': ['roupa', 'sapato', 'tênis', 'camisa', 'calça', 'loja'],
    'Salário': ['salário', 'pagamento'],
    'Freelance': ['freelance', 'projeto', 'cliente'],
    'Investimentos': ['dividendo', 'rendimento', 'investimento', 'ações'],
  };
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => lower.includes(k))) { category = cat; break; }
  }

  // Extract description
  const description = text
    .replace(/\d+[.,]?\d*\s*(reais|real|r\$|brl|dólares|usd|euros|eur|x|parcela|vez)/gi, '')
    .replace(/r\$\s*\d+[.,]?\d*/gi, '')
    .replace(/(no|na|em|hoje|ontem)\s+\w+/gi, '')
    .trim()
    .slice(0, 40) || text.slice(0, 30);

  return { type, amount, installments, category, description: description || category, accountId };
}

const AIPage = () => {
  const { t, formatCurrency } = useI18n();
  const { addTransaction, accounts, transactions } = useData();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Olá! Sou seu assistente financeiro. Você pode me enviar lançamentos em linguagem natural como:\n\n• "Mercado 320 reais no Nubank em 3x hoje"\n• "Recebi 8500 salário"\n• "Uber 45 reais débito"\n\nTambém posso te dar um resumo financeiro. Tente: "resumo do mês"' },
  ]);
  const [input, setInput] = useState('');

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);

    const lower = input.toLowerCase();
    let response: string;

    if (lower.includes('resumo') || lower.includes('summary') || lower.includes('relatório')) {
      const topExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((map, t) => { map[t.category] = (map[t.category] || 0) + t.amount; return map; }, {} as Record<string, number>);
      const topCats = Object.entries(topExpenses).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const topList = topCats.map(([cat, val]) => `  • ${cat}: ${formatCurrency(val)}`).join('\n');

      response = `📊 **Resumo Financeiro**\n\n💰 Receitas: ${formatCurrency(totalIncome)}\n💸 Despesas: ${formatCurrency(totalExpenses)}\n📈 Resultado: ${formatCurrency(totalIncome - totalExpenses)}\n\n📋 Maiores categorias de gasto:\n${topList}\n\n${totalIncome > totalExpenses ? '✅ Você está no positivo! Continue assim.' : '⚠️ Suas despesas estão superando as receitas. Revise seus gastos.'}`;
    } else {
      const accountNames = accounts.map(a => ({ id: a.id, name: a.name }));
      const parsed = parseNaturalLanguage(input, accountNames);
      if (parsed.amount > 0) {
        const finalAccountId = parsed.accountId || accounts[0]?.id || '';
        const accountName = accounts.find(a => a.id === finalAccountId)?.name || 'padrão';

        if (parsed.installments && parsed.installments > 1) {
          const instAmount = parsed.amount / parsed.installments;
          for (let i = 0; i < parsed.installments; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() + i);
            addTransaction({
              type: parsed.type,
              description: parsed.description,
              amount: instAmount,
              category: parsed.category,
              date: date.toISOString().split('T')[0],
              status: i === 0 ? (parsed.type === 'income' ? 'received' : 'paid') : 'planned',
              recurrence: 'once',
              accountId: finalAccountId,
              installments: parsed.installments,
              currentInstallment: i + 1,
              tags: [],
            });
          }
        } else {
          addTransaction({
            type: parsed.type,
            description: parsed.description,
            amount: parsed.amount,
            category: parsed.category,
            date: new Date().toISOString().split('T')[0],
            status: parsed.type === 'income' ? 'received' : 'paid',
            recurrence: 'once',
            accountId: finalAccountId,
            tags: [],
          });
        }

        response = `✅ Lançamento registrado!\n\n• **Tipo:** ${parsed.type === 'income' ? 'Receita' : 'Despesa'}\n• **Descrição:** ${parsed.description}\n• **Valor:** ${formatCurrency(parsed.amount)}\n• **Categoria:** ${parsed.category}\n• **Conta:** ${accountName}${parsed.installments ? `\n• **Parcelas:** ${parsed.installments}x de ${formatCurrency(parsed.amount / parsed.installments)}` : ''}`;
      } else {
        response = 'Não consegui interpretar o lançamento. Tente algo como:\n"Mercado 320 reais no Nubank" ou "Recebi 5000 freelance"';
      }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: response }]);
    }, 300);

    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] flex-col animate-in-up">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{t.pages.ai.title}</h2>
        <p className="text-sm text-muted-foreground">{t.pages.ai.subtitle}</p>
      </div>

      {/* Messages */}
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

      {/* Input */}
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
