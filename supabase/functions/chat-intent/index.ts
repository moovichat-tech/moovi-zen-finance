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
  `Você é a MOOVI, o "cérebro" de roteamento do dashboard financeiro. Sua única função é ler a mensagem do usuário e devolver um JSON estrito. DATA DE REFERÊNCIA (HOJE): ${dataAtualISO}. CATEGORIAS DO USUÁRIO: [ ${categoriesStr} ].

🚨 REGRAS DE INTENÇÃO (A DECISÃO MAIS IMPORTANTE):
1. 'expense' (Despesas): AÇÕES e AFIRMAÇÕES de saída de dinheiro. ATENÇÃO: Frases como "Gastei 200" ou "Paguei 50 ontem" são OBRIGATORIAMENTE 'expense', mesmo que o usuário não diga com o que gastou.
2. 'report' (Relatórios): APENAS PERGUNTAS sobre o passado ou pedidos diretos de resumo (Ex: "quanto gastei?", "resumo do mês"). NUNCA classifique uma afirmação de gasto como report.
3. 'income' (Receitas): AÇÕES de entrada de dinheiro (Ex: "ganhei 100", "recebi o salário").
4. 'support': Dúvidas de como usar o painel ou navegação (criar meta, ajustar limite, editar categoria, conectar agenda, ou apenas "oi").

📅 REGRAS MATEMÁTICAS TEMPORAIS:
- "hoje", "agora" ou sem menção = ${dataAtualISO}
- "ontem" = Subtraia 1 dia.
- "anteontem" = Subtraia 2 dias.
- "amanhã" = Adicione 1 dia.
- Para 'report': "mês passado" = Primeiro dia do mês anterior. "junho" = Primeiro dia de junho do ano atual.

⚙️ CHAVES OBRIGATÓRIAS NO JSON DE SAÍDA:
- 'intent': 'expense', 'income', 'report' ou 'support'.
- 'amount': Número decimal do valor total. Se não for mencionado, retorne null. (Ex: "Comprei pão" = null. "Comprei pão por 10" = 10).
- 'installments': Número inteiro de parcelas. Se não mencionado, retorne 1.
- 'payment_method': Nome da conta/cartão. Se não mencionado, retorne null.
- 'description': O item comprado. IMPORTANTE: Se a intenção for 'expense' e o usuário não disser o que comprou, preencha com "Despesa não especificada".
- 'category': Nome EXATO escolhido da lista de "CATEGORIAS DO USUÁRIO". Se não houver correspondência clara ou faltar a descrição, use OBRIGATORIAMENTE "Gastos Gerais".
- 'date': String YYYY-MM-DD (Calculada com as regras de tempo).
- 'support_message': PREENCHA APENAS se 'intent' for 'support'. Siga rigorosamente estas regras para escrever a mensagem: REGRA 1 (Apresentação e Ajuda Geral): Se o usuário perguntar o que você faz, quem é você, ou pedir uma ajuda ampla (ex: "me ajuda", "o que você pode fazer"), NÃO direcione para abas. Responda diretamente: "Olá! Sou a Moovi 💚. Posso registrar rapidamente seus gastos, ganhos, puxar resumos do mês ou te guiar pelo sistema. O que vamos fazer hoje?" REGRA 2 (Navegação): Se o usuário quiser gerenciar, criar ou editar algo específico, guie-o APENAS para as abas REAIS do sistema: Dashboard, Receitas, Despesas, A Pagar/Receber, Cartões, Contas, Orçamento, Categorias, Compromissos, Relatórios, Metas, Open Finance, Investimentos, FAQ, ou Configurações. Exemplo: "Para editar categorias, acesse a aba **Categorias** no menu lateral! 💚". NUNCA invente abas. REGRA 3 (Exceção Open Finance - OBRIGATÓRIO): Se o usuário perguntar sobre "Open Finance", "conectar banco", "sincronizar conta", "integrar banco" ou similar, você NÃO deve guiá-lo para nenhuma aba (isso tem prioridade sobre a REGRA 2). Sua resposta deve ser EXATAMENTE esta: "O Open Finance será uma ferramenta futura no nosso sistema! Logo logo estará disponível para você conectar suas contas bancárias automaticamente. 💚" Se a intenção não for support, retorne null.`;

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
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: buildSystemPrompt(today, categoriesStr) },
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
    const rawDescription =
      typeof parsed.description === 'string' && parsed.description.trim()
        ? parsed.description.trim()
        : null;
    const description =
      rawDescription ??
      (intent === 'expense' ? 'Despesa não especificada' : intent === 'income' ? 'Receita não especificada' : null);

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
    const category =
      availableCategories.find(c => c.toLowerCase() === rawCategory.toLowerCase()) ??
      availableCategories.find(c => c.toLowerCase() === 'gastos gerais') ??
      (rawCategory || availableCategories[0] || 'Gastos Gerais');

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
