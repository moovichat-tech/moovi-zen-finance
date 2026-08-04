import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Gastos Gerais'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Data de hoje no fuso America/Sao_Paulo (evita virada de dia prematura em UTC)
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const buildSystemPrompt = (dataAtualISO: string) =>
  `Você é um classificador de intenções financeiras. Leia a mensagem e extraia os dados em JSON estrito. A DATA DE HOJE É: ${dataAtualISO} (Considere isso como o dia 0).

REGRAS MATEMÁTICAS TEMPORAIS (OBRIGATÓRIO): Sempre calcule a chave 'date' (formato YYYY-MM-DD) baseando-se na DATA DE HOJE e nestas regras exatas:
- "hoje", "agora" ou se não houver menção de data = DATA DE HOJE.
- "ontem" = DATA DE HOJE menos 1 dia.
- "anteontem" ou "antes de ontem" = DATA DE HOJE menos 2 dias.
- "amanhã" = DATA DE HOJE mais 1 dia.
- "semana passada" = DATA DE HOJE menos 7 dias.
- "mês passado" = DATA DE HOJE menos 30 dias (ou exatamente 1 mês atrás).
- Se mencionar apenas um dia (ex: "dia 15"), use o mês e ano atuais.

CHAVES DO JSON:
- 'intent': 'expense', 'income' ou 'general'.
- 'amount': Número decimal ou null.
- 'description': O nome do item/serviço (ex: 'caça niquel', 'janta').
- 'category': Classifique OBRIGATORIAMENTE em: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação' ou 'Gastos Gerais'.
- 'date': String YYYY-MM-DD calculada com as regras acima.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) return json({ error: 'GROQ_API_KEY não configurada' }, 500);

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 2000) {
      return json({ error: 'Mensagem inválida' }, 400);
    }

    const clientToday = typeof body?.today === 'string' && DATE_RE.test(body.today) ? body.today : null;
    const today = clientToday ?? todayInSaoPaulo();

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: buildSystemPrompt(today) },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Groq error', res.status, detail);
      if (res.status === 429) return json({ error: 'Muitas requisições. Tente novamente em instantes.' }, 429);
      return json({ error: 'Falha ao consultar a IA' }, 502);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const intent = ['expense', 'income', 'general'].includes(String(parsed.intent))
      ? String(parsed.intent)
      : 'general';
    const amountNum = Number(parsed.amount);
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null;
    const description =
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : null;

    const rawCategory = typeof parsed.category === 'string' ? parsed.category.trim() : '';
    const category = CATEGORIES.find(c => c.toLowerCase() === rawCategory.toLowerCase()) ?? 'Gastos Gerais';

    const rawDate = typeof parsed.date === 'string' ? parsed.date.trim() : '';
    const date = DATE_RE.test(rawDate) && !Number.isNaN(new Date(`${rawDate}T00:00:00`).getTime())
      ? rawDate
      : today;

    return json({ intent, amount, description, category, date });
  } catch (err) {
    console.error('chat-intent error', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
