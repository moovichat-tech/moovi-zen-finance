import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "E-mail é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = email.trim().toLowerCase();
    const rows = await sql`
      SELECT id, telefone, senha_hash, status
      FROM usuarios
      WHERE LOWER(email) = ${normalized}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ exists: false, active: false, has_password: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = rows[0];
    const status = String(user.status ?? "").trim();
    const active = status.toLowerCase() === "ativo";

    return new Response(
      JSON.stringify({
        exists: true,
        active,
        status,
        has_password: !!user.senha_hash,
        user_id: user.id,
        telefone: user.telefone,
      }),
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
