import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, TrendingDown, TrendingUp, CalendarRange } from 'lucide-react';
import mooviLogoAsset from '@/assets/moovi-logo-assistente.png.asset.json';

const mooviLogo = mooviLogoAsset.url;
import { TransactionFormDialog, type TransactionFormData } from '@/components/TransactionFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReportData {
  mes: number;
  ano: number;
  totalTransacoes: number;
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  porCategoria: { name: string; value: number }[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  report?: ReportData;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ReportCard = ({ report }: { report: ReportData }) => (
  <div className="mt-2 space-y-3 rounded-xl border border-border bg-card p-3">
    <p className="text-xs font-medium text-muted-foreground">
      {MONTHS[report.mes - 1]} de {report.ano} · {report.totalTransacoes} lançamento(s)
    </p>
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-lg bg-primary/5 p-2">
        <p className="text-[11px] text-muted-foreground">Receitas</p>
        <p className="text-sm font-semibold tabular-nums text-primary">{brl(report.totalReceitas)}</p>
      </div>
      <div className="rounded-lg bg-destructive/5 p-2">
        <p className="text-[11px] text-muted-foreground">Despesas</p>
        <p className="text-sm font-semibold tabular-nums text-destructive">{brl(report.totalDespesas)}</p>
      </div>
      <div className="rounded-lg bg-secondary p-2">
        <p className="text-[11px] text-muted-foreground">Resultado</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{brl(report.resultado)}</p>
      </div>
    </div>
    {report.porCategoria.length > 0 && (
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Maiores gastos por categoria</p>
        {report.porCategoria.map(c => (
          <div key={c.name} className="flex items-center justify-between text-xs">
            <span className="truncate pr-2">{c.name}</span>
            <span className="shrink-0 font-medium tabular-nums">{brl(c.value)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);


const QUICK_ACTIONS = [
  { label: 'Adicionar Despesa Rápida', icon: TrendingDown, prompt: 'Gastei ' },
  { label: 'Adicionar Receita', icon: TrendingUp, prompt: 'Recebi ' },
  { label: 'Resumo do Mês', icon: CalendarRange, prompt: 'Resumo do mês' },
];


const MooviAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: '#0E110F' }}>
    <img src={mooviLogo} alt="Moovi" className="h-8 w-8 object-contain" />
  </div>
);

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    {[0, 150, 300].map(delay => (
      <span
        key={delay}
        className="h-2 w-2 animate-bounce rounded-full bg-primary/60"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </div>
);

const AIPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [transactionInitialData, setTransactionInitialData] = useState<Partial<TransactionFormData>>({});
  const [transactionInstallments, setTransactionInstallments] = useState(1);
  const [transactionPaymentMethod, setTransactionPaymentMethod] = useState<string | null>(null);
  const { token, telefone } = useAuth();
  const historyKey = `moovi_chat_history_${telefone ?? 'anon'}`;
  const historyLoadedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: categorias = [] } = useQuery<{ nome: string; tipo: string }[]>({
    queryKey: ['categorias'],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const userCategories = useMemo(
    () => Array.from(new Set(categorias.map(c => c?.nome).filter((n): n is string => !!n && !!n.trim()))),
    [categorias],
  );



  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!isTransactionModalOpen) textareaRef.current?.focus();
  }, [loading, isTransactionModalOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const pushAssistant = useCallback((content: string, report?: ReportData) => {
    setMessages(prev => [...prev, { id: `a-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: 'assistant', content, report }]);
  }, []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setInput('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content }]);
    setLoading(true);

    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase.functions.invoke('chat-intent', {
        body: { message: content, today: todayStr, userCategories },
      });
      if (error) throw error;

      // Validação rigorosa do payload retornado
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        pushAssistant('Recebi uma resposta inesperada do servidor. Pode tentar novamente?');
        return;
      }

      if (typeof (data as any).error === 'string') {
        pushAssistant((data as any).error);
        return;
      }

      const rawIntent = (data as any).intent;
      if (rawIntent !== 'expense' && rawIntent !== 'income' && rawIntent !== 'support' && rawIntent !== 'report') {
        pushAssistant('Não consegui entender sua mensagem. Tente algo como: "Gastei 50 no posto".');
        return;
      }

      if (rawIntent === 'support') {
        const supportMessage = (data as any).support_message;
        pushAssistant(
          typeof supportMessage === 'string' && supportMessage.trim()
            ? supportMessage.trim()
            : 'Posso te ajudar! Use o menu lateral esquerdo para acessar **Despesas**, **Receitas**, **Categorias**, **Contas** e **Cartões**.'
        );
        return;
      }

      if (rawIntent === 'report') {
        if (!token) {
          pushAssistant('Preciso que você esteja autenticado para consultar seus lançamentos.');
          return;
        }
        const rawReportDate = (data as any).date;
        const refDate = typeof rawReportDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawReportDate)
          ? new Date(`${rawReportDate}T00:00:00`)
          : new Date();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mes: refDate.getMonth() + 1, ano: refDate.getFullYear() }),
        });
        if (!res.ok) {
          pushAssistant('Não consegui consultar seus lançamentos agora. Tente novamente em instantes.');
          return;
        }
        const report = (await res.json()) as ReportData;
        if (!report || typeof report.totalDespesas !== 'number') {
          pushAssistant('Não consegui calcular seu resumo agora. Tente novamente em instantes.');
          return;
        }
        pushAssistant(
          report.totalTransacoes === 0
            ? `Não encontrei lançamentos em ${MONTHS[report.mes - 1]} de ${report.ano}.`
            : `Aqui está o resumo de **${MONTHS[report.mes - 1]} de ${report.ano}**:`,
          report,
        );
        return;
      }

      const rawAmount = (data as any).amount;
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
      const rawDescription = (data as any).description;
      const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';

      if (!Number.isFinite(amount) || amount <= 0 || !description) {
        pushAssistant(
          'Entendi que é um lançamento, mas faltaram informações. Me diga o valor e a descrição, por exemplo: "Gastei 50 no posto".'
        );
        return;
      }

      const rawCategory = (data as any).category;
      const category =
        typeof rawCategory === 'string' && rawCategory.trim() ? rawCategory.trim() : 'Gastos Gerais';

      const rawInstallments = Math.floor(Number((data as any).installments));
      const installments =
        Number.isFinite(rawInstallments) && rawInstallments >= 1 ? Math.min(rawInstallments, 72) : 1;

      const rawPayment = (data as any).payment_method;
      const paymentMethod =
        typeof rawPayment === 'string' && rawPayment.trim() ? rawPayment.trim() : null;

      const rawDate = (data as any).date;
      const isValidDate =
        typeof rawDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
        !Number.isNaN(new Date(`${rawDate}T00:00:00`).getTime());
      const parsedDate = isValidDate ? new Date(`${rawDate}T00:00:00`) : new Date();
      const dateStr = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;

      setTransactionType(rawIntent);
      setTransactionInstallments(installments);
      setTransactionPaymentMethod(paymentMethod);
      setTransactionInitialData({
        amount: String(amount),
        description,
        category,
        date: dateStr,
        installments: String(installments),
      });
      setIsTransactionModalOpen(true);
    } catch (err) {
      console.error(err);
      pushAssistant('Não consegui processar sua mensagem agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, [loading, pushAssistant, token, userCategories]);



  const handleQuickAction = (prompt: string) => {
    if (prompt.trim().endsWith('mês')) {
      send(prompt);
      return;
    }
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col lg:h-[calc(100dvh-8rem)]">
      <ScrollArea className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-1 pb-6 sm:px-4">
          {isEmpty ? (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <img src={mooviLogo} alt="Moovi" className="mb-4 h-20 w-20 rounded-2xl object-contain" style={{ backgroundColor: '#0E110F' }} />
              <h2 className="text-lg font-semibold sm:text-xl">Olá! Sou a Moovi 💚</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Como posso ajudar com suas finanças hoje?
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map(msg =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-3">
                    <MooviAvatar />
                    <div className="max-w-[85%] rounded-2xl bg-primary/5 px-4 py-2.5 text-sm text-foreground">
                      <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:mt-2 prose-headings:mb-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.report && <ReportCard report={msg.report} />}
                    </div>
                  </div>
                )
              )}
              {loading && (
                <div className="flex gap-3">
                  <MooviAvatar />
                  <div className="rounded-2xl bg-primary/5 px-4 py-2.5">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-3xl px-1 pb-1 pt-2 sm:px-4">
        <div className="mb-2 flex flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
            <Button
              key={label}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs"
              onClick={() => handleQuickAction(prompt)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
        <div className="relative flex items-end rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={loading}
            placeholder="Pergunte algo ou registre: 'gastei 30 com almoço'"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            className="max-h-40 min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
            disabled={loading || !input.trim()}
            onClick={() => send(input)}
            aria-label="Enviar mensagem"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          A Moovi pode cometer erros. Confira informações importantes.
        </p>
      </div>

      <TransactionFormDialog
        type={transactionType}
        open={isTransactionModalOpen}
        onOpenChange={setIsTransactionModalOpen}
        initialData={transactionInitialData}
        installments={transactionInstallments}
        paymentMethod={transactionPaymentMethod}
      />
    </div>
  );
};

export default AIPage;
