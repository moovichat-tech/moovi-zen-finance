import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { redirectUri, ensureTokenColumn } from "../_shared/auth.ts";

function html(message: string, target: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Moovi</title></head>
     <body style="font-family:sans-serif;background:#0b0f0d;color:#e9f5ef;display:flex;align-items:center;justify-content:center;height:100vh">
     <div style="text-align:center"><p>${message}</p><p><a style="color:#4ade80" href="${target}">Voltar ao painel</a></p></div>
     <script>setTimeout(function(){location.href=${JSON.stringify(target)}},1500)</script>
     </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });
  let target = "https://moovi-zen-finance.lovable.app/compromissos";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    let telefone = "";
    if (stateRaw) {
      try {
        const parsed = JSON.parse(atob(stateRaw));
        telefone = String(parsed.telefone || "");
        if (parsed.origin) target = `${parsed.origin}/compromissos`;
      } catch {
        telefone = stateRaw;
      }
    }

    if (errorParam) return html(`Conexão cancelada (${errorParam}).`, target);
    if (!code || !telefone) return html("Requisição inválida do Google.", target);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });

    const tokenBody = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error(`Google token exchange failed [${tokenRes.status}]: ${tokenBody}`);
      return html("Não foi possível conectar ao Google Agenda.", target);
    }

    const { refresh_token } = JSON.parse(tokenBody);
    if (!refresh_token) return html("O Google não retornou um refresh_token. Tente novamente.", target);

    await ensureTokenColumn(sql);
    const rows = await sql`
      UPDATE usuarios SET google_refresh_token = ${refresh_token}
      WHERE telefone = ${telefone} RETURNING telefone
    `;
    if (rows.length === 0) return html("Usuário não encontrado.", target);

    return html("Google Agenda conectado com sucesso!", `${target}?google=connected`);
  } catch (e) {
    console.error("google-callback error:", e);
    return html("Erro inesperado ao conectar o Google Agenda.", target);
  } finally {
    await sql.end();
  }
});
