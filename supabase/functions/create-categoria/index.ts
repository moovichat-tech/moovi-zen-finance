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
    const { nome, tipo, icone, orcamento_mensal } = await req.json();

    if (!nome || !tipo) {
      return new Response(JSON.stringify({ error: "Nome e tipo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["despesa", "receita"].includes(tipo)) {
      return new Response(JSON.stringify({ error: "Tipo deve ser 'despesa' ou 'receita'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = await sql`
      INSERT INTO categorias (telefone_usuario, nome, tipo, icone, orcamento_mensal)
      VALUES (${telefone}, ${nome}, ${tipo}, ${icone || null}, ${orcamento_mensal || null})
      RETURNING id, nome, icone, tipo, orcamento_mensal, criado_em
    `;

    return new Response(JSON.stringify(rows[0]), {
      status: 201,
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
