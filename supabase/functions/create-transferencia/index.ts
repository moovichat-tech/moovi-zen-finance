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
    ["sign", "verify"]
  );
}

async function getTelefoneFromToken(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Token não fornecido");
  const token = auth.replace("Bearer ", "");
  const key = await getKey();
  const payload = await verify(token, key);
  if (!payload.telefone) throw new Error("Token inválido");
  return payload.telefone as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sql = postgres(Deno.env.get("EXTERNAL_DATABASE_URL")!, { max: 1 });

  try {
    const telefone = await getTelefoneFromToken(req);
    const { conta_origem, conta_destino, valor } = await req.json();

    if (!conta_origem || !conta_destino || !valor) {
      throw new Error("conta_origem, conta_destino e valor são obrigatórios");
    }
    if (conta_origem === conta_destino) {
      throw new Error("Conta de origem e destino devem ser diferentes");
    }
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      throw new Error("Valor deve ser um número positivo");
    }

    const now = new Date().toISOString();

    await sql.begin(async (tx) => {
      // Insert 1: Saída da conta de origem
      await tx`
        INSERT INTO transacoes (telefone_usuario, tipo, valor, descricao, categoria, cartao, data_transacao, conta, status, criado_em)
        VALUES (
          ${telefone}, 'despesa', ${valorNum},
          ${'Transferência para ' + conta_destino},
          'Transferência', '', ${now}, ${conta_origem}, 'PAGO', ${now}
        )
      `;
      // Insert 2: Entrada na conta de destino
      await tx`
        INSERT INTO transacoes (telefone_usuario, tipo, valor, descricao, categoria, cartao, data_transacao, conta, status, criado_em)
        VALUES (
          ${telefone}, 'receita', ${valorNum},
          ${'Transferência de ' + conta_origem},
          'Transferência', '', ${now}, ${conta_destino}, 'PAGO', ${now}
        )
      `;
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e.message.includes("Token") ? 401 : 400;
    return new Response(JSON.stringify({ error: e.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
