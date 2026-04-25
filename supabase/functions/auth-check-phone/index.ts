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
    const { telefone } = await req.json();
    if (!telefone || typeof telefone !== "string") {
      return new Response(JSON.stringify({ error: "Telefone é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normaliza: apenas dígitos
    const phone = telefone.replace(/\D/g, "");
    console.log("[auth-check-phone] Buscando telefone:", phone);

    // Query estrita: SELECT status FROM usuarios WHERE telefone = phone
    const rows = await sql`
      SELECT id, senha_hash, status
      FROM usuarios
      WHERE telefone = ${phone}
      LIMIT 1
    `;

    if (rows.length === 0) {
      console.log("[auth-check-phone] Usuário NÃO encontrado");
      return new Response(
        JSON.stringify({ exists: false, has_password: false, status: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = rows[0];
    const status = user.status ? String(user.status).trim() : "Ativo";
    console.log("[auth-check-phone] Usuário encontrado, status:", status);

    return new Response(
      JSON.stringify({
        exists: true,
        has_password: !!user.senha_hash,
        user_id: user.id,
        status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[auth-check-phone] Erro:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
