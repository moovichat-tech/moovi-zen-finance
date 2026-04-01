import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { telefone } = await req.json();
    if (!telefone || typeof telefone !== "string") {
      return new Response(JSON.stringify({ error: "Telefone é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const n8nKey = Deno.env.get("N8N_AUTH_HEADER_KEY");
    if (!n8nKey) throw new Error("N8N_AUTH_HEADER_KEY not configured");

    const res = await fetch("https://n8n.fisherai.shop/webhook/auth/send-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": n8nKey,
      },
      body: JSON.stringify({ telefone }),
    });

    const body = await res.text();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Falha ao enviar código", details: body }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
