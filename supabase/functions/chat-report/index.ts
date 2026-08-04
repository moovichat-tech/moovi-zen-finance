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
    ["sign", "verify"],
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

// Motor lógico puro: SELECT simples + somas em TypeScript. Nenhuma IA envolvida.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const telefone = await getTelefoneFromToken(req);
    const body = await req.json().catch(() => ({}));

    const now = new Date();
    const mes = Number.isFinite(Number(body?.mes)) && Number(body.mes) >= 1 && Number(body.mes) <= 12
      ? Math.floor(Number(body.mes))
      : now.getUTCMonth() + 1;
    const ano = Number.isFinite(Number(body?.ano)) && Number(body.ano) >= 2000 && Number(body.ano) <= 2100
      ? Math.floor(Number(body.ano))
      : now.getUTCFullYear();

    const rows = await sql`
      SELECT tipo, valor, descricao, categoria,
             TO_CHAR(data_transacao, 'YYYY-MM-DD') AS data_transacao, status
      FROM transacoes
      WHERE telefone_usuario = ${telefone}
        AND EXTRACT(YEAR FROM data_transacao) = ${ano}
        AND EXTRACT(MONTH FROM data_transacao) = ${mes}
      ORDER BY data_transacao DESC
    `;

    let totalReceitas = 0;
    let totalDespesas = 0;
    const catMap: Record<string, number> = {};

    for (const r of rows) {
      const valor = parseFloat(String(r.valor)) || 0;
      const tipo = String(r.tipo ?? "").toLowerCase();
      const isReceita = tipo.startsWith("receita") || tipo === "income";
      if (isReceita) {
        totalReceitas += valor;
      } else {
        totalDespesas += valor;
        const cat = String(r.categoria ?? "Gastos Gerais") || "Gastos Gerais";
        catMap[cat] = (catMap[cat] ?? 0) + valor;
      }
    }

    const porCategoria = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return new Response(
      JSON.stringify({
        mes,
        ano,
        totalTransacoes: rows.length,
        totalReceitas,
        totalDespesas,
        resultado: totalReceitas - totalDespesas,
        porCategoria,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno";
    const status = message.includes("Token") ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
