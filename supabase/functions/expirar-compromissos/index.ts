import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

// Rotina agendada: marca compromissos pendentes vencidos como "expirado".
// Também roda via pg_cron a cada 15 minutos diretamente no banco.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("compromissos")
      .update({ status: "expirado" })
      .eq("status", "pendente")
      .lt("data_hora_limite", new Date().toISOString())
      .select("id");

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, expirados: data?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expirar-compromissos error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
