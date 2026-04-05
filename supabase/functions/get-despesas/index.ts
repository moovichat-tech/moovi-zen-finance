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
    const { mes, ano, tipoPeriodo } = body;

    let whereClause = sql`telefone_usuario = ${telefone} AND tipo = 'despesa'`;

    if (tipoPeriodo === 'year' && ano) {
      whereClause = sql`${whereClause} AND EXTRACT(YEAR FROM data_transacao) = ${Number(ano)}`;
    } else if (mes && ano) {
      whereClause = sql`${whereClause} AND EXTRACT(YEAR FROM data_transacao) = ${Number(ano)} AND EXTRACT(MONTH FROM data_transacao) = ${Number(mes)}`;
    }

    const rows = await sql`
      SELECT id, tipo, valor, descricao, categoria, cartao, data_transacao, conta, status
      FROM transacoes
      WHERE ${whereClause}
      ORDER BY data_transacao DESC
    `;

    const result = rows.map((r: any) => ({
      ...r,
      valor: parseFloat(r.valor),
      data_transacao: r.data_transacao ? String(r.data_transacao).substring(0, 10) : null,
    }));

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
