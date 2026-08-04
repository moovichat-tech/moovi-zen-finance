import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Gastos Gerais'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const buildSystemPrompt = (today: string) =>
  `A DATA DE HOJE É: ${today}. Você é um classificador de intenções financeiras. Leia a mensagem do usuário e extraia os dados em um JSON estrito. Chaves obrigatórias: 'intent' ('expense', 'income' ou 'general'), 'amount' (número ou null), 'description' (string da compra/ganho em si, ex: 'pizza'), 'category' (string) e 'date' (string no formato 'YYYY-MM-DD'). Para a chave 'category', você DEVE classificar OBRIGATORIAMENTE em uma destas macro-categorias: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer' ou 'Gastos Gerais'. Sempre calcule a data da transação baseando-se na DATA DE HOJE. Se o usuário disser 'ontem', subtraia um dia. Se disser 'amanhã', adicione um dia. Se mencionar apenas um dia (ex: 'dia 15'), use o mês e ano atuais. Se não mencionar nenhuma data, utilize a DATA DE HOJE. Exemplo: Se 'gastei 40 com pizza ontem', retorne {"intent": "expense", "amount": 40, "description": "pizza", "category": "Alimentação", "date": "<data de ontem>"}.`;

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
          { role: 'system', content: SYSTEM_PROMPT },
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

    return json({ intent, amount, description, category });
  } catch (err) {
    console.error('chat-intent error', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
