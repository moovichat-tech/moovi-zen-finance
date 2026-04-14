import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { telefone, motivo, detalhes } = await req.json();

    if (!telefone || !motivo) {
      return new Response(JSON.stringify({ error: "telefone e motivo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n8nUrl = Deno.env.get("N8N_AUTH_HEADER_KEY");
    // The webhook URL for cancellation - reuse the same n8n base
    const webhookUrl = "https://n8n.fisherai.shop/webhook/cancelamento";
    const authToken = "moovi-secreto-2026";

    // 1. Save feedback to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("feedbacks_cancelamento").insert({
      telefone,
      motivo_principal: motivo,
      detalhes: detalhes || null,
    });

    await supabase.from("usuarios").update({ renovacao_automatica: false }).eq("telefone", telefone);

    // 2. Notify n8n
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-moovi-token": authToken,
        },
        body: JSON.stringify({ telefone, motivo, detalhes }),
      });
    } catch {
      // Non-blocking: if n8n fails, cancellation still succeeds
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
