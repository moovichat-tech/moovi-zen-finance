import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { connect } from "https://deno.land/x/redis@v0.32.4/mod.ts";

const JWT_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getKey() {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
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

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    hostname: u.hostname,
    port: parseInt(u.port || "6379"),
    password: u.password || undefined,
  };
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\*/g, "")
    .replace("⏰ Lembrete de Pagamento: ", "")
    .replace(" Se já pagou, lembre-se de dar baixa no painel: 🔗 https://dash.moovi.chat", "")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const telefone = await getTelefoneFromToken(req);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Fonte A: PostgreSQL - lembretes_recorrentes
    // Colunas: id, telefone_usuario, mensagem_aviso, dia_vencimento, hora_alerta, valor, status
    const pgRows = await sql`
      SELECT id, mensagem_aviso, dia_vencimento, hora_alerta, valor, status
      FROM lembretes_recorrentes
      WHERE telefone_usuario = ${telefone}
    `;

    const pgNormalized = pgRows.map((r: any) => {
      const dia = Number(r.dia_vencimento) || 1;
      let hora = 0, minuto = 0;
      if (r.hora_alerta && typeof r.hora_alerta === "string") {
        const parts = r.hora_alerta.split(":");
        hora = Number(parts[0]) || 0;
        minuto = Number(parts[1]) || 0;
      }
      const dataObj = new Date(currentYear, currentMonth, dia, hora, minuto, 0);

      return {
        id: String(r.id),
        titulo: r.mensagem_aviso || "Lembrete recorrente",
        data: dataObj.toISOString(),
        tipo: "recorrente" as const,
        valor: r.valor ? Number(r.valor) : 0,
        status: r.status || "ativo",
      };
    });

    // Fonte B: Redis - lembretes temporários
    let redisNormalized: any[] = [];
    const redisUrl = Deno.env.get("REDIS_URL");

    if (redisUrl) {
      let redis;
      try {
        const config = parseRedisUrl(redisUrl);
        redis = await connect(config);

        const pattern = `lembrete:*:${telefone}:*`;
        const allKeys: string[] = [];
        let cursor = "0";

        do {
          const result = await redis.scan(cursor, { pattern, count: 100 });
          cursor = result[0];
          allKeys.push(...result[1]);
        } while (cursor !== "0");

        for (const key of allKeys) {
          try {
            const raw = await redis.get(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);

            // timestampAviso em segundos
            const ts = Number(parsed.timestampAviso);
            const dataISO = new Date(ts * 1000).toISOString();

            redisNormalized.push({
              id: key,
              titulo: parsed.mensagemAviso || "Lembrete temporário",
              data: dataISO,
              tipo: "temporario" as const,
              valor: 0,
              status: "PENDENTE",
            });
          } catch {
            // skip malformed
          }
        }

        redis.close();
      } catch (redisErr) {
        console.error("Redis error (non-fatal):", redisErr);
      }
    }

    const unified = [...pgNormalized, ...redisNormalized].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    return new Response(JSON.stringify(unified), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e.message.includes("Token") ? 401 : 500;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
