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
    const body = await req.json();
    const { mes, ano, categoria, conta, tipoPeriodo } = body;

    // Build dynamic query conditions
    const conditions: string[] = [`telefone_usuario = '${telefone}'`];

    if (tipoPeriodo === "Anual" && ano) {
      conditions.push(`EXTRACT(YEAR FROM data_transacao) = ${parseInt(ano)}`);
    } else if (mes && ano) {
      conditions.push(`EXTRACT(YEAR FROM data_transacao) = ${parseInt(ano)}`);
      conditions.push(`EXTRACT(MONTH FROM data_transacao) = ${parseInt(mes)}`);
    }

    if (categoria && categoria !== "Todas" && categoria !== "all") {
      conditions.push(`categoria = '${categoria.replace(/'/g, "''")}'`);
    }
    if (conta && conta !== "Todas" && conta !== "all") {
      conditions.push(`conta = '${conta.replace(/'/g, "''")}'`);
    }

    const where = conditions.join(" AND ");

    const rows = await sql.unsafe(
      `SELECT id, tipo, valor, descricao, categoria, cartao, data_transacao, conta, status
       FROM transacoes
       WHERE ${where}
       ORDER BY data_transacao DESC`
    );

    // Aggregate in memory
    let totalReceitas = 0;
    let totalDespesas = 0;
    const catMap: Record<string, number> = {};
    const contaMap: Record<string, { receitas: number; despesas: number }> = {};
    const monthMap: Record<string, { receitas: number; despesas: number }> = {};

    for (const r of rows) {
      const val = parseFloat(r.valor) || 0;
      const tipo = (r.tipo || "").toLowerCase();
      const isReceita = tipo === "receita" || tipo === "income";

      if (isReceita) totalReceitas += val;
      else totalDespesas += val;

      // Category breakdown (expenses only)
      if (!isReceita) {
        const cat = r.categoria || "Sem categoria";
        catMap[cat] = (catMap[cat] || 0) + val;
      }

      // Account breakdown
      const contaName = r.conta || "Sem conta";
      if (!contaMap[contaName]) contaMap[contaName] = { receitas: 0, despesas: 0 };
      if (isReceita) contaMap[contaName].receitas += val;
      else contaMap[contaName].despesas += val;

      // Monthly breakdown
      if (r.data_transacao) {
        const d = new Date(r.data_transacao);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap[mKey]) monthMap[mKey] = { receitas: 0, despesas: 0 };
        if (isReceita) monthMap[mKey].receitas += val;
        else monthMap[mKey].despesas += val;
      }
    }

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Daily grouping for monthly view
    const dayMap: Record<string, { receitas: number; despesas: number }> = {};
    if (tipoPeriodo !== "Anual") {
      for (const r of rows) {
        if (!r.data_transacao) continue;
        const d = new Date(r.data_transacao);
        const dayKey = String(d.getDate()).padStart(2, "0");
        if (!dayMap[dayKey]) dayMap[dayKey] = { receitas: 0, despesas: 0 };
        const val = parseFloat(r.valor) || 0;
        const tipo = (r.tipo || "").toLowerCase();
        const isReceita = tipo === "receita" || tipo === "income";
        if (isReceita) dayMap[dayKey].receitas += val;
        else dayMap[dayKey].despesas += val;
      }
    }

    const visaoGeral = tipoPeriodo === "Anual"
      ? Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, v]) => {
            const [, m] = key.split("-");
            return { month: monthNames[parseInt(m) - 1], income: v.receitas, expense: v.despesas };
          })
      : Object.entries(dayMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, v]) => ({
            month: day,
            income: v.receitas,
            expense: v.despesas,
          }));

    const porCategoria = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const porConta = Object.entries(contaMap).map(([name, v]) => ({
      name,
      income: v.receitas,
      expense: v.despesas,
    }));

    const transacoesRaw = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      tipo: r.tipo,
      valor: parseFloat(r.valor as string) || 0,
      descricao: r.descricao,
      categoria: r.categoria,
      cartao: r.cartao,
      data_transacao: r.data_transacao,
      conta: r.conta,
      status: r.status,
    }));

    const result = {
      resumo: { totalReceitas, totalDespesas, resultado: totalReceitas - totalDespesas },
      visaoGeral,
      porCategoria,
      porConta,
      transacoesRaw,
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
