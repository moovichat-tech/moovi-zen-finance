import "https://deno.land/std@0.224.0/dotenv/load.ts";

export const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;

export const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

/**
 * Optional integration tokens.
 * TEST_JWT       -> token de um usuário (payload { telefone })
 * TEST_JWT_OTHER -> token de OUTRO usuário, usado para provar o isolamento por telefone
 */
export const TEST_JWT = Deno.env.get("TEST_JWT") ?? "";
export const TEST_JWT_OTHER = Deno.env.get("TEST_JWT_OTHER") ?? "";

export function fnUrl(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

export async function callFn(
  name: string,
  opts: { token?: string; body?: unknown; method?: string } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(fnUrl(name), {
    method: opts.method ?? "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : "{}",
  });

  const text = await res.text(); // sempre consumir o body (evita resource leak no Deno)
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

export async function preflight(name: string) {
  const res = await fetch(fnUrl(name), {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:8080",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, content-type",
    },
  });
  const allowOrigin = res.headers.get("access-control-allow-origin");
  await res.text();
  return { status: res.status, allowOrigin };
}

/** Lê o código-fonte de uma Edge Function (asserções estáticas de segurança/ordenação). */
export async function readFunctionSource(name: string) {
  const url = new URL(`../${name}/index.ts`, import.meta.url);
  return await Deno.readTextFile(url);
}

export function normalize(sql: string) {
  return sql.replace(/\s+/g, " ");
}
