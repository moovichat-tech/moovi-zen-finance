import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const { telefone } = await req.json();
    if (!telefone || typeof telefone !== "string") {
      return new Response(JSON.stringify({ error: "Telefone é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = await sql`SELECT id, senha_hash FROM usuarios WHERE telefone = ${telefone} LIMIT 1`;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ exists: false, has_password: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = rows[0];
    return new Response(
      JSON.stringify({
        exists: true,
        has_password: !!user.senha_hash,
        user_id: user.id,
      }),
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
