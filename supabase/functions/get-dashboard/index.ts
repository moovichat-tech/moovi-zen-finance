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
    const { dataInicio, dataFim } = body;

    if (!dataInicio || !dataFim) {
      throw new Error("dataInicio e dataFim são obrigatórios");
    }

    // Calculate diff in days for grouping logic
    const startDate = new Date(dataInicio);
    const endDate = new Date(dataFim);
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const groupByDay = diffDays <= 31;

    // 1. Saldo total das contas (always full)
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

    // 2. Receitas detalhadas do período
    const receitasDetalhadas = await sql`
      SELECT descricao, valor, categoria, data_transacao
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'receita' AND status = 'PAGO'
        AND COALESCE(categoria, '') != 'Transferência'
        AND data_transacao >= ${dataInicio}::date
        AND data_transacao <= ${dataFim}::date
      ORDER BY data_transacao DESC
    `;
    const receitaMes = receitasDetalhadas.reduce((sum: number, r: any) => sum + parseFloat(r.valor || '0'), 0);

    // 3. Despesas detalhadas do período
    const despesasDetalhadas = await sql`
      SELECT descricao, valor, categoria, data_transacao
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'despesa' AND status = 'PAGO'
        AND COALESCE(categoria, '') != 'Transferência'
        AND data_transacao >= ${dataInicio}::date
        AND data_transacao <= ${dataFim}::date
      ORDER BY data_transacao DESC
    `;
    const despesaMes = despesasDetalhadas.reduce((sum: number, r: any) => sum + parseFloat(r.valor || '0'), 0);

    // 4. Evolução dinâmica (por dia ou por mês)
    let evolucaoTempo: { label: string; receitas: number; despesas: number }[] = [];

    if (groupByDay) {
      const evoRows = await sql`
        SELECT
          TO_CHAR(data_transacao, 'DD/MM') as label,
          data_transacao::date as dt,
          tipo,
          COALESCE(SUM(valor), 0) as total
        FROM transacoes
        WHERE telefone_usuario = ${telefone}
          AND status = 'PAGO'
          AND COALESCE(categoria, '') != 'Transferência'
          AND data_transacao >= ${dataInicio}::date
          AND data_transacao <= ${dataFim}::date
        GROUP BY label, dt, tipo
        ORDER BY dt
      `;
      const dayMap: Record<string, { label: string; receitas: number; despesas: number; dt: string }> = {};
      for (const row of evoRows) {
        const key = row.dt;
        if (!dayMap[key]) dayMap[key] = { label: row.label, receitas: 0, despesas: 0, dt: key };
        if (row.tipo === 'receita') dayMap[key].receitas = parseFloat(row.total);
        else if (row.tipo === 'despesa') dayMap[key].despesas = parseFloat(row.total);
      }
      evolucaoTempo = Object.values(dayMap).sort((a, b) => a.dt.localeCompare(b.dt)).map(({ label, receitas, despesas }) => ({ label, receitas, despesas }));
    } else {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const evoRows = await sql`
        SELECT
          TO_CHAR(data_transacao, 'YYYY-MM') as mes,
          tipo,
          COALESCE(SUM(valor), 0) as total
        FROM transacoes
        WHERE telefone_usuario = ${telefone}
          AND status = 'PAGO'
          AND COALESCE(categoria, '') != 'Transferência'
          AND data_transacao >= ${dataInicio}::date
          AND data_transacao <= ${dataFim}::date
        GROUP BY mes, tipo
        ORDER BY mes
      `;
      const monthMap: Record<string, { receitas: number; despesas: number }> = {};
      for (const row of evoRows) {
        if (!monthMap[row.mes]) monthMap[row.mes] = { receitas: 0, despesas: 0 };
        if (row.tipo === 'receita') monthMap[row.mes].receitas = parseFloat(row.total);
        else if (row.tipo === 'despesa') monthMap[row.mes].despesas = parseFloat(row.total);
      }
      evolucaoTempo = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, data]) => {
          const m = parseInt(mes.split('-')[1]) - 1;
          return { label: monthNames[m], ...data };
        });
    }

    // 5. Gastos por categoria
    const categRows = await sql`
      SELECT categoria as name, COALESCE(SUM(valor), 0) as value
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'despesa' AND status = 'PAGO'
        AND COALESCE(categoria, '') != 'Transferência'
        AND data_transacao >= ${dataInicio}::date
        AND data_transacao <= ${dataFim}::date
      GROUP BY categoria
      ORDER BY value DESC
    `;
    const gastosCategoria = categRows.map((r: any) => ({ name: r.name, value: parseFloat(r.value) }));

    // 6. Comparação (período atual vs período anterior de mesma duração)
    const diffMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1000 * 60 * 60 * 24);
    const prevStart = new Date(prevEnd.getTime() - diffMs);
    const prevStartStr = `${prevStart.getFullYear()}-${String(prevStart.getMonth() + 1).padStart(2, '0')}-${String(prevStart.getDate()).padStart(2, '0')}`;
    const prevEndStr = `${prevEnd.getFullYear()}-${String(prevEnd.getMonth() + 1).padStart(2, '0')}-${String(prevEnd.getDate()).padStart(2, '0')}`;

    const compRows = await sql`
      SELECT
        categoria as category,
        SUM(CASE WHEN data_transacao >= ${dataInicio}::date AND data_transacao <= ${dataFim}::date THEN valor ELSE 0 END) as current,
        SUM(CASE WHEN data_transacao >= ${prevStartStr}::date AND data_transacao <= ${prevEndStr}::date THEN valor ELSE 0 END) as previous
      FROM transacoes
      WHERE telefone_usuario = ${telefone} AND tipo = 'despesa' AND status = 'PAGO'
        AND COALESCE(categoria, '') != 'Transferência'
        AND data_transacao >= ${prevStartStr}::date
        AND data_transacao <= ${dataFim}::date
      GROUP BY categoria
      ORDER BY current DESC
    `;
    const comparacaoMensal = compRows.map((r: any) => ({
      category: r.category,
      current: parseFloat(r.current),
      previous: parseFloat(r.previous),
    }));

    // 7. Saldo por conta
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

    // 8. Alertas de orçamento (based on current month from dataFim)
    const mesNum = endDate.getMonth() + 1;
    const anoNum = endDate.getFullYear();
    const orcRows = await sql`
      SELECT
        c.nome as category,
        c.icone as icon,
        c.orcamento_mensal as limit_amount,
        COALESCE((
          SELECT SUM(t.valor)
          FROM transacoes t
          WHERE t.telefone_usuario = ${telefone}
            AND t.categoria = c.nome
            AND t.tipo = 'despesa'
            AND COALESCE(t.categoria, '') != 'Transferência'
            AND EXTRACT(MONTH FROM t.data_transacao) = ${mesNum}
            AND EXTRACT(YEAR FROM t.data_transacao) = ${anoNum}
        ), 0) AS spent
      FROM categorias c
      WHERE c.telefone_usuario = ${telefone}
        AND c.tipo = 'despesa'
        AND c.orcamento_mensal IS NOT NULL
        AND c.orcamento_mensal > 0
      ORDER BY c.nome
    `;
    const alertasOrcamento = orcRows
      .map((r: any) => {
        const limit = parseFloat(r.limit_amount);
        const spent = parseFloat(r.spent);
        const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
        return { category: r.category, icon: r.icon, spent, limit, percent };
      })
      .filter((a: any) => a.percent >= 50)
      .sort((a: any, b: any) => b.percent - a.percent);

    const result = {
      saldoTotal: saldoTotal || 0,
      receitaMes: receitaMes || 0,
      despesaMes: despesaMes || 0,
      resultadoLiquido: (receitaMes || 0) - (despesaMes || 0),
      receitasDetalhadas: (receitasDetalhadas || []).map((r: any) => ({
        descricao: r.descricao,
        valor: parseFloat(r.valor || '0'),
        categoria: r.categoria,
      })),
      despesasDetalhadas: (despesasDetalhadas || []).map((r: any) => ({
        descricao: r.descricao,
        valor: parseFloat(r.valor || '0'),
        categoria: r.categoria,
      })),
      evolucaoTempo,
      gastosCategoria: gastosCategoria || [],
      comparacaoMensal: comparacaoMensal || [],
      saldoContas: saldoContas || [],
      alertasOrcamento: alertasOrcamento || [],
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
