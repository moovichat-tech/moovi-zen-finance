import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT =
  "Você é um classificador de intenções financeiras. Leia a mensagem do usuário e extraia os dados em um JSON estrito. Chaves obrigatórias: 'intent' ('expense', 'income' ou 'general'), 'amount' (número ou null), 'description' (string ou null). Exemplo: Se 'gastei 20 no almoço', retorne {\"intent\": \"expense\", \"amount\": 20, \"description\": \"almoço\"}.";

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

    return json({ intent, amount, description });
  } catch (err) {
    console.error('chat-intent error', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
