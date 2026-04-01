import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const JWT_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getKey() {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const { telefone, senha } = await req.json();
    if (!telefone || !senha) {
      return new Response(JSON.stringify({ error: "Telefone e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = await sql`SELECT id, senha_hash FROM usuarios WHERE telefone = ${telefone} LIMIT 1`;

    if (rows.length === 0 || !rows[0].senha_hash) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = rows[0];
    const valid = bcrypt.compareSync(senha, user.senha_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sql`UPDATE usuarios SET ultimo_login = now() WHERE id = ${user.id}`;

    const key = await getKey();
    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: user.id,
        telefone,
        exp: getNumericDate(60 * 60 * 24 * 7),
      },
      key
    );

    return new Response(
      JSON.stringify({ token, user_id: user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
