import { useState, useRef, useEffect, useCallback } from 'react';
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}


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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const pushAssistant = useCallback((content: string) => {
    setMessages(prev => [...prev, { id: `a-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: 'assistant', content }]);
  }, []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setInput('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-intent', {
        body: { message: content },
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
      if (rawIntent !== 'expense' && rawIntent !== 'income' && rawIntent !== 'general') {
        pushAssistant('Não consegui entender sua mensagem. Tente algo como: "Gastei 50 no posto".');
        return;
      }

      if (rawIntent === 'general') {
        pushAssistant(
          "Ainda estou aprendendo a responder perguntas complexas, mas já consigo anotar seus gastos! Tente dizer: 'Gastei 50 no posto'."
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

      setTransactionType(rawIntent);
      setTransactionInitialData({
        amount: String(amount).replace('.', ','),
        description,
        category,
      });
      setIsTransactionModalOpen(true);
    } catch (err) {
      console.error(err);
      pushAssistant('Não consegui processar sua mensagem agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, [loading, pushAssistant]);



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
      />
    </div>
  );
};

export default AIPage;
