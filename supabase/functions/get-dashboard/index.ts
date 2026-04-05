import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const JWT_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getKey() {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function getTelefoneFromToken(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Token não fornecido");
  const key = await getKey();
  const payload = await verify(auth.replace("Bearer ", ""), key);
  if (!payload.telefone) throw new Error("Token inválido");
  return payload.telefone as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const telefone = await getTelefoneFromToken(req);
    const body = await req.json().catch(() => ({}));
    const { mes, ano } = body;

    const mesNum = Number(mes);
    const anoNum = Number(ano);

    // 1. Saldo total das contas
    const saldoRows = await sql`
      SELECT COALESCE(SUM(
        COALESCE(saldo_inicial, 0)
        + COALESCE((SELECT SUM(valor) FROM transacoes WHERE transacoes.conta = contas.nome AND transacoes.telefone_usuario = contas.telefone_usuario AND transacoes.tipo = 'receita' AND transacoes.status = 'PAGO'), 0)
        - COALESCE((SELECT SUM(valor) FROM transacoes WHERE transacoes.conta = contas.nome AND transacoes.telefone_usuario = contas.telefone_usuario AND transacoes.tipo = 'despesa' AND transacoes.status = 'PAGO'), 0)
      ), 0) as total
      FROM contas
      WHERE telefone_usuario = ${telefone}
    `;
    const saldoTotal = parseFloat(saldoRows[0]?.total || '0');

    // 2. Receita e Despesa do mês selecionado (PAGO)
    const receitaRows = await sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'receita' AND status = 'PAGO'
        AND EXTRACT(YEAR FROM data_transacao) = ${anoNum}
        AND EXTRACT(MONTH FROM data_transacao) = ${mesNum}
    `;
    const receitaMes = parseFloat(receitaRows[0]?.total || '0');

    const despesaRows = await sql`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'despesa' AND status = 'PAGO'
        AND EXTRACT(YEAR FROM data_transacao) = ${anoNum}
        AND EXTRACT(MONTH FROM data_transacao) = ${mesNum}
    `;
    const despesaMes = parseFloat(despesaRows[0]?.total || '0');

    // 3. Evolução mensal (últimos 6 meses)
    const evolucaoRows = await sql`
      SELECT
        TO_CHAR(data_transacao, 'YYYY-MM') as mes,
        tipo,
        COALESCE(SUM(valor), 0) as total
      FROM transacoes
      WHERE telefone_usuario = ${telefone}
        AND status = 'PAGO'
        AND data_transacao >= (DATE_TRUNC('month', MAKE_DATE(${anoNum}, ${mesNum}, 1)) - INTERVAL '5 months')
        AND data_transacao < (DATE_TRUNC('month', MAKE_DATE(${anoNum}, ${mesNum}, 1)) + INTERVAL '1 month')
      GROUP BY mes, tipo
      ORDER BY mes
    `;

    const evolucaoMap: Record<string, { income: number; expense: number }> = {};
    for (const row of evolucaoRows) {
      if (!evolucaoMap[row.mes]) evolucaoMap[row.mes] = { income: 0, expense: 0 };
      if (row.tipo === 'receita') evolucaoMap[row.mes].income = parseFloat(row.total);
      else if (row.tipo === 'despesa') evolucaoMap[row.mes].expense = parseFloat(row.total);
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const evolucaoMensal = Object.entries(evolucaoMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, data]) => {
        const m = parseInt(mes.split('-')[1]) - 1;
        return { month: monthNames[m], ...data };
      });

    // 4. Gastos por categoria (mês selecionado)
    const categRows = await sql`
      SELECT categoria as name, COALESCE(SUM(valor), 0) as value
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'despesa' AND status = 'PAGO'
        AND EXTRACT(YEAR FROM data_transacao) = ${anoNum}
        AND EXTRACT(MONTH FROM data_transacao) = ${mesNum}
      GROUP BY categoria
      ORDER BY value DESC
    `;
    const gastosCategoria = categRows.map((r: any) => ({ name: r.name, value: parseFloat(r.value) }));

    // 5. Comparação mensal (mês atual vs anterior)
    const prevDate = mesNum === 1 ? `${anoNum - 1}-12` : `${anoNum}-${String(mesNum - 1).padStart(2, '0')}`;
    const curDate = `${anoNum}-${String(mesNum).padStart(2, '0')}`;

    const compRows = await sql`
      SELECT
        categoria as category,
        SUM(CASE WHEN TO_CHAR(data_transacao, 'YYYY-MM') = ${curDate} THEN valor ELSE 0 END) as current,
        SUM(CASE WHEN TO_CHAR(data_transacao, 'YYYY-MM') = ${prevDate} THEN valor ELSE 0 END) as previous
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'despesa' AND status = 'PAGO'
        AND (TO_CHAR(data_transacao, 'YYYY-MM') = ${curDate} OR TO_CHAR(data_transacao, 'YYYY-MM') = ${prevDate})
      GROUP BY categoria
      ORDER BY current DESC
    `;
    const comparacaoMensal = compRows.map((r: any) => ({
      category: r.category,
      current: parseFloat(r.current),
      previous: parseFloat(r.previous),
    }));

    // 6. Saldo por conta
    const contasRows = await sql`
      SELECT nome, icone,
        COALESCE(saldo_inicial, 0)
        + COALESCE((SELECT SUM(valor) FROM transacoes WHERE transacoes.conta = contas.nome AND transacoes.telefone_usuario = contas.telefone_usuario AND transacoes.tipo = 'receita' AND transacoes.status = 'PAGO'), 0)
        - COALESCE((SELECT SUM(valor) FROM transacoes WHERE transacoes.conta = contas.nome AND transacoes.telefone_usuario = contas.telefone_usuario AND transacoes.tipo = 'despesa' AND transacoes.status = 'PAGO'), 0)
        as saldo
      FROM contas
      WHERE telefone_usuario = ${telefone}
      ORDER BY nome
    `;
    const saldoContas = contasRows.map((r: any) => ({
      name: r.nome,
      icon: r.icone,
      balance: parseFloat(r.saldo),
    }));

    const result = {
      saldoTotal,
      receitaMes,
      despesaMes,
      resultadoLiquido: receitaMes - despesaMes,
      evolucaoMensal,
      gastosCategoria,
      comparacaoMensal,
      saldoContas,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e.message.includes("Token") ? 401 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
