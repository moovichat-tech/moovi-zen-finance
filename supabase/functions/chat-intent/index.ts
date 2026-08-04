import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FALLBACK_CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Gastos Gerais'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Data de hoje no fuso America/Sao_Paulo (evita virada de dia prematura em UTC)
const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const buildSystemPrompt = (dataAtualISO: string, categoriesStr: string) =>
  `Você é um extrator de dados financeiros. NÃO faça cálculos matemáticos. DATA DE REFERÊNCIA (HOJE): ${dataAtualISO}.

REGRAS MATEMÁTICAS TEMPORAIS (OBRIGATÓRIO):
- "hoje", "agora" ou sem menção de data = ${dataAtualISO}
- "ontem" = Subtraia exatamente 1 dia da DATA DE REFERÊNCIA.
- "anteontem", "antes de ontem", "ante ontem" = Subtraia exatamente 2 dias da DATA DE REFERÊNCIA.
- "amanhã" = Adicione exatamente 1 dia à DATA DE REFERÊNCIA.

REGRAS DE CATEGORIA (OBRIGATÓRIO): Você DEVE classificar a transação ESCOLHENDO APENAS UMA das categorias desta lista exata do usuário: [ ${categoriesStr} ]. Exemplo: Se o gasto for "perfume", categorize como "Compras Pessoais" (se existir na lista). Nunca invente categorias. Se nenhuma se encaixar, use a mais genérica (como "Gastos Gerais").

CHAVES DO JSON:
- 'intent': 'expense', 'income', 'support', 'report'.
- 'amount': Número decimal (total). Se o usuário disser "2000 em 10x", retorne 2000. NÃO divida.
- 'installments': Número inteiro (padrão 1).
- 'payment_method': Nome do banco/cartão ou null.
- 'description': Nome do item comprado.
- 'category': Nome EXATO extraído da lista de categorias fornecida.
- 'date': String YYYY-MM-DD calculada com a regra de datas.
- 'support_message': Apenas se 'intent' for 'support'. Ensine qual menu do painel usar. Caso contrário, null.`;

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

    const rawUserCategories = Array.isArray(body?.userCategories) ? body.userCategories : [];
    const userCategories = rawUserCategories
      .filter((c: unknown): c is string => typeof c === 'string' && !!c.trim())
      .map((c: string) => c.trim())
      .slice(0, 100);
    const availableCategories = userCategories.length ? userCategories : FALLBACK_CATEGORIES;
    const categoriesStr = availableCategories.join(', ');

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

    const intent = ['expense', 'income', 'support', 'report'].includes(String(parsed.intent))
      ? String(parsed.intent)
      : 'support';
    const amountNum = Number(parsed.amount);
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null;
    const description =
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : null;

    const instNum = Math.floor(Number(parsed.installments));
    const installments = Number.isFinite(instNum) && instNum >= 1 ? Math.min(instNum, 72) : 1;

    const paymentMethod =
      typeof parsed.payment_method === 'string' && parsed.payment_method.trim()
        ? parsed.payment_method.trim()
        : null;

    const supportMessage =
      typeof parsed.support_message === 'string' && parsed.support_message.trim()
        ? parsed.support_message.trim()
        : null;

    const rawCategory = typeof parsed.category === 'string' ? parsed.category.trim() : '';
    const category = CATEGORIES.find(c => c.toLowerCase() === rawCategory.toLowerCase()) ?? 'Gastos Gerais';

    const rawDate = typeof parsed.date === 'string' ? parsed.date.trim() : '';
    const date = DATE_RE.test(rawDate) && !Number.isNaN(new Date(`${rawDate}T00:00:00`).getTime())
      ? rawDate
      : today;

    return json({
      intent,
      amount,
      installments,
      payment_method: paymentMethod,
      description,
      category,
      date,
      support_message: intent === 'support'
        ? (supportMessage ?? 'Posso te ajudar! Navegue pelo menu lateral esquerdo para acessar as abas de **Despesas**, **Receitas**, **Categorias**, **Contas** e **Cartões**.')
        : null,
    });
  } catch (err) {
    console.error('chat-intent error', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
