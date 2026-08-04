import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const JWT_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getKey() {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function getTelefoneFromToken(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Token não fornecido");
  const key = await getKey();
  const payload = await verify(auth.replace("Bearer ", ""), key);
  if (!payload.telefone) throw new Error("Token inválido");
  return payload.telefone as string;
}

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

    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_refresh_token TEXT`;
    const rows = await sql`
      SELECT google_refresh_token FROM usuarios WHERE telefone = ${telefone} LIMIT 1
    `;
    const refreshToken = rows[0]?.google_refresh_token;
    if (!refreshToken) {
      return new Response(JSON.stringify({ synced: false, reason: "google_nao_conectado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error(`google refresh failed [${tokenRes.status}]: ${tokenBody}`);
      return new Response(
        JSON.stringify({ synced: false, reason: "token_invalido", details: tokenBody }),
        { status: tokenRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const accessToken = JSON.parse(tokenBody).access_token;

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
          description: descricao || undefined,
          start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
          end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
        }),
      },
    );
    const eventBody = await eventRes.text();
    if (!eventRes.ok) {
      console.error(`google calendar insert failed [${eventRes.status}]: ${eventBody}`);
      return new Response(
        JSON.stringify({ synced: false, reason: "erro_google", details: eventBody }),
        { status: eventRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = JSON.parse(eventBody);
    return new Response(JSON.stringify({ synced: true, event_id: event.id, link: event.htmlLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-google-event error:", e);
    const status = String(e.message).includes("Token") ? 401 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
