import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) {
      return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = String(email).trim().toLowerCase();
    const rows = await sql`
      SELECT id, telefone, senha_hash, status
      FROM usuarios
      WHERE LOWER(email) = ${normalized}
      LIMIT 1
    `;

    if (rows.length === 0 || !rows[0].senha_hash) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = rows[0];
    if (String(user.status ?? "").trim().toLowerCase() !== "ativo") {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada ou inativa." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      { sub: String(user.id), telefone: user.telefone, exp: getNumericDate(60 * 60 * 24 * 7) },
      key
    );

    return new Response(
      JSON.stringify({ token, user_id: user.id, telefone: user.telefone }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
