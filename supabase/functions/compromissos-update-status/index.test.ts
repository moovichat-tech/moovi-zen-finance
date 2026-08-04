import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  callFn,
  normalize,
  preflight,
  readFunctionSource,
  TEST_JWT,
  TEST_JWT_OTHER,
} from "../_shared/test-utils.ts";

const FN = "compromissos-update-status";

Deno.test("update-status: responde ao preflight CORS", async () => {
  const { status, allowOrigin } = await preflight(FN);
  assert(status < 400, `preflight falhou: ${status}`);
  assert(allowOrigin, "sem header Access-Control-Allow-Origin");
});

Deno.test("update-status: exige token (401 sem Authorization)", async () => {
  const { status } = await callFn(FN, { body: { id: 1, status: "concluido" } });
  assertEquals(status, 401);
});

Deno.test("update-status: UPDATE restrito ao telefone do token e status whitelistado", async () => {
  const src = normalize(await readFunctionSource(FN));
  assert(
    src.includes("WHERE id = ${Number(id)} AND telefone_usuario = ${telefone}"),
    "UPDATE deve filtrar por id + telefone do token",
  );
  assert(
    src.includes(`["pendente", "concluido"]`),
    "status deve ser validado contra uma whitelist",
  );
});

Deno.test({
  name: "update-status (integração): rejeita status inválido",
  ignore: !TEST_JWT,
  fn: async () => {
    const { status } = await callFn(FN, {
      token: TEST_JWT,
      body: { id: 1, status: "qualquer_coisa" },
    });
    assertEquals(status, 400);
  },
});

Deno.test({
  name: "update-status (integração): alterna status do próprio compromisso",
  ignore: !TEST_JWT,
  fn: async () => {
    const criado = await callFn("compromissos-create", {
      token: TEST_JWT,
      body: {
        titulo: `Status ${crypto.randomUUID().slice(0, 8)}`,
        data_hora_limite: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    assertEquals(criado.status, 200);
    const id = criado.json.id;

    const concluir = await callFn(FN, {
      token: TEST_JWT,
      body: { id, status: "concluido" },
    });
    assertEquals(concluir.status, 200);

    const lista = await callFn("compromissos-list", { token: TEST_JWT });
    const item = (lista.json ?? []).find((r: any) => r.id === id);
    assertEquals(item?.status, "concluido");

    if (TEST_JWT_OTHER) {
      const alheio = await callFn(FN, {
        token: TEST_JWT_OTHER,
        body: { id, status: "pendente" },
      });
      assertEquals(alheio.status, 404, "outro usuário não pode alterar este registro");
    }

    await callFn("compromissos-delete", { token: TEST_JWT, body: { id } });
  },
});
