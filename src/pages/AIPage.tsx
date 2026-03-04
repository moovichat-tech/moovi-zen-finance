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

function parseNaturalLanguage(text: string) {
  const lower = text.toLowerCase();
  let type: 'income' | 'expense' = 'expense';
  if (lower.includes('recebi') || lower.includes('salário') || lower.includes('freelance') || lower.includes('receita')) type = 'income';

  // Extract amount
  const amountMatch = lower.match(/(\d+[.,]?\d*)\s*(reais|real|r\$|brl|dólares|usd|euros|eur)/i) || lower.match(/r\$\s*(\d+[.,]?\d*)/i) || lower.match(/(\d+[.,]?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

  // Extract installments
  const installMatch = lower.match(/(\d+)\s*x|(\d+)\s*parcela|em\s*(\d+)\s*vez/);
  const installments = installMatch ? parseInt(installMatch[1] || installMatch[2] || installMatch[3]) : undefined;

  // Guess category
  let category = 'Outros';
  const categoryMap: Record<string, string[]> = {
    'Alimentação': ['mercado', 'supermercado', 'restaurante', 'ifood', 'lanche', 'padaria', 'café'],
    'Transporte': ['uber', 'taxi', '99', 'gasolina', 'combustível', 'estacionamento', 'pedágio'],
    'Moradia': ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet'],
    'Saúde': ['farmácia', 'médico', 'hospital', 'plano de saúde', 'consulta'],
    'Lazer': ['netflix', 'cinema', 'spotify', 'jogo', 'bar', 'show'],
    'Educação': ['curso', 'livro', 'escola', 'faculdade', 'udemy'],
    'Vestuário': ['roupa', 'sapato', 'tênis', 'camisa'],
    'Salário': ['salário', 'pagamento'],
    'Freelance': ['freelance', 'projeto'],
  };
  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(k => lower.includes(k))) { category = cat; break; }
  }

  // Extract description (first meaningful words)
  const description = text.split(/\d/)[0].trim() || text.slice(0, 30);

  return { type, amount, installments, category, description };
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

    if (lower.includes('resumo') || lower.includes('summary')) {
      response = `📊 **Resumo Financeiro**\n\n💰 Receitas: ${formatCurrency(totalIncome)}\n💸 Despesas: ${formatCurrency(totalExpenses)}\n📈 Resultado: ${formatCurrency(totalIncome - totalExpenses)}\n\n${totalIncome > totalExpenses ? '✅ Você está no positivo este mês! Continue assim.' : '⚠️ Suas despesas estão superando as receitas. Considere revisar seus gastos.'}`;
    } else {
      const parsed = parseNaturalLanguage(input);
      if (parsed.amount > 0) {
        const defaultAccount = accounts[0]?.id || '';
        addTransaction({
          type: parsed.type,
          description: parsed.description,
          amount: parsed.amount,
          category: parsed.category,
          date: new Date().toISOString().split('T')[0],
          status: parsed.type === 'income' ? 'received' : 'paid',
          recurrence: 'once',
          accountId: defaultAccount,
          installments: parsed.installments,
          currentInstallment: parsed.installments ? 1 : undefined,
          tags: [],
        });
        response = `✅ Lançamento registrado!\n\n• **Tipo:** ${parsed.type === 'income' ? 'Receita' : 'Despesa'}\n• **Descrição:** ${parsed.description}\n• **Valor:** ${formatCurrency(parsed.amount)}\n• **Categoria:** ${parsed.category}${parsed.installments ? `\n• **Parcelas:** ${parsed.installments}x de ${formatCurrency(parsed.amount / parsed.installments)}` : ''}`;
      } else {
        response = 'Não consegui interpretar o lançamento. Tente algo como:\n"Mercado 320 reais" ou "Recebi 5000 freelance"';
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
