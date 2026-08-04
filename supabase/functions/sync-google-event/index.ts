import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { getTelefoneFromToken, getAccessToken, ensureTokenColumn } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const telefone = await getTelefoneFromToken(req);
    const { titulo, descricao, data_hora_limite, duracao_minutos } = await req.json();

    if (!titulo || !data_hora_limite) {
      return new Response(JSON.stringify({ error: "titulo e data_hora_limite são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ensureTokenColumn(sql);
    const rows = await sql`
      SELECT google_refresh_token FROM usuarios WHERE telefone = ${telefone} LIMIT 1
    `;
    const refreshToken = rows[0]?.google_refresh_token;

    if (!refreshToken) {
      return new Response(JSON.stringify({ synced: false, reason: "not_connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken(refreshToken);

    const start = new Date(data_hora_limite);
    const end = new Date(start.getTime() + (Number(duracao_minutos) || 60) * 60_000);

    const eventRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: titulo,
          description: descricao || "",
          start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
          end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
          reminders: { useDefault: true },
        }),
      },
    );

    const eventBody = await eventRes.text();
    if (!eventRes.ok) {
      console.error(`Google Calendar insert failed [${eventRes.status}]: ${eventBody}`);
      return new Response(
        JSON.stringify({ synced: false, status: eventRes.status, details: eventBody }),
        { status: eventRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = JSON.parse(eventBody);
    return new Response(JSON.stringify({ synced: true, eventId: event.id, htmlLink: event.htmlLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-google-event error:", e);
    const status = String(e.message).includes("Token não") || String(e.message).includes("Token inválido") ? 401 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
