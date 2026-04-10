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
    const { id, mensagem, valor, dia_vencimento, hora_alerta, categoria } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "ID é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE lembretes_recorrentes SET ... WHERE id = ${id} AND telefone_usuario = ${telefone}
    await sql`
      UPDATE lembretes_recorrentes
      SET
        mensagem_aviso = COALESCE(${mensagem ?? null}, mensagem_aviso),
        valor = COALESCE(${valor != null ? Number(valor) : null}, valor),
        dia_vencimento = COALESCE(${dia_vencimento != null ? Number(dia_vencimento) : null}, dia_vencimento),
        hora_alerta = COALESCE(${hora_alerta ?? null}, hora_alerta),
        categoria = COALESCE(${categoria ?? null}, categoria)
      WHERE id = ${Number(id)} AND telefone_usuario = ${telefone}
    `;

    return new Response(JSON.stringify({ success: true }), {
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
