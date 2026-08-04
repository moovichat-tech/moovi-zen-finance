import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const APP_URL = "https://dash.moovi.chat/commitments";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // telefone
  const err = url.searchParams.get("error");

  if (err || !code || !state) {
    return Response.redirect(`${APP_URL}?google=erro`, 302);
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });
  try {
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error(`google token exchange failed [${tokenRes.status}]: ${tokenBody}`);
      return Response.redirect(`${APP_URL}?google=erro`, 302);
    }

    const tokens = JSON.parse(tokenBody);
    if (!tokens.refresh_token) {
      console.error("no refresh_token returned:", tokenBody);
      return Response.redirect(`${APP_URL}?google=erro`, 302);
    }

    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_refresh_token TEXT`;
    const rows = await sql`
      UPDATE usuarios SET google_refresh_token = ${tokens.refresh_token}
      WHERE telefone = ${state}
      RETURNING telefone
    `;
    if (rows.length === 0) {
      console.error("usuario não encontrado para telefone do state");
      return Response.redirect(`${APP_URL}?google=erro`, 302);
    }

    return Response.redirect(`${APP_URL}?google=ok`, 302);
  } catch (e) {
    console.error("google-callback error:", e);
    return Response.redirect(`${APP_URL}?google=erro`, 302);
  } finally {
    await sql.end();
  }
});
