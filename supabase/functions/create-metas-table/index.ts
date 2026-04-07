import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS metas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telefone_usuario TEXT NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT,
        valor_meta NUMERIC NOT NULL DEFAULT 0,
        valor_guardado NUMERIC NOT NULL DEFAULT 0,
        prazo DATE,
        data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_metas_telefone ON metas(telefone_usuario)`;

    await sql.end();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await sql.end();
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
