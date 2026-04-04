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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const telefone = await getTelefoneFromToken(req);

    // Busca A: PostgreSQL - lembretes recorrentes
    const pgRows = await sql`
      SELECT * FROM lembretes_recorrentes
      WHERE telefone_usuario = ${telefone}
      ORDER BY data_aviso ASC
    `;

    const pgNormalized = pgRows.map((r: any) => ({
      id: r.id?.toString() || `pg-${Date.now()}-${Math.random()}`,
      titulo: r.titulo || r.mensagem_aviso || r.descricao || 'Lembrete recorrente',
      data: r.data_aviso ? new Date(r.data_aviso).toISOString() : new Date().toISOString(),
      tipo: 'recorrente' as const,
      valor: r.valor ? Number(r.valor) : undefined,
      status: r.status || 'ativo',
      recorrencia: r.recorrencia || r.tipo_recorrencia || null,
      notas: r.notas || r.observacao || null,
    }));

    // Busca B: Redis - lembretes temporários
    let redisNormalized: any[] = [];
    const redisUrl = Deno.env.get("REDIS_URL");

    if (redisUrl) {
      let redis;
      try {
        const config = parseRedisUrl(redisUrl);
        redis = await connect(config);

        // SCAN for keys matching pattern
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

            // timestampAviso pode ser em segundos (UNIX) ou ms
            let dataISO: string;
            if (parsed.timestampAviso) {
              const ts = Number(parsed.timestampAviso);
              dataISO = new Date(ts < 1e12 ? ts * 1000 : ts).toISOString();
            } else if (parsed.data) {
              dataISO = new Date(parsed.data).toISOString();
            } else {
              dataISO = new Date().toISOString();
            }

            redisNormalized.push({
              id: parsed.id || key,
              titulo: parsed.mensagemAviso || parsed.titulo || parsed.descricao || 'Lembrete temporário',
              data: dataISO,
              tipo: 'temporario' as const,
              valor: parsed.valor ? Number(parsed.valor) : undefined,
              status: parsed.status || 'pendente',
              recorrencia: null,
              notas: parsed.notas || null,
            });
          } catch {
            // skip malformed entries
          }
        }

        redis.close();
      } catch (redisErr) {
        console.error("Redis error (non-fatal):", redisErr);
        // Continue with only PostgreSQL data
      }
    }

    // Merge & sort ascending by date
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
