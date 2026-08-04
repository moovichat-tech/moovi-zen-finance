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

const FN = "compromissos-delete";

Deno.test("delete: responde ao preflight CORS", async () => {
  const { status, allowOrigin } = await preflight(FN);
  assert(status < 400, `preflight falhou: ${status}`);
  assert(allowOrigin, "sem header Access-Control-Allow-Origin");
});

Deno.test("delete: exige token (401 sem Authorization)", async () => {
  const { status } = await callFn(FN, { body: { id: 1 } });
  assertEquals(status, 401);
});

Deno.test("delete: DELETE restrito ao telefone do token", async () => {
  const src = normalize(await readFunctionSource(FN));
  assert(
    src.includes("WHERE id = ${Number(id)} AND telefone_usuario = ${telefone}"),
    "DELETE deve filtrar por id + telefone do token",
  );
  assert(src.includes("RETURNING id"), "DELETE sem RETURNING id");
});

Deno.test({
  name: "delete (integração): exige id válido",
  ignore: !TEST_JWT,
  fn: async () => {
    const { status } = await callFn(FN, { token: TEST_JWT, body: {} });
    assertEquals(status, 400);
  },
});

Deno.test({
  name: "delete (integração): remove o próprio e protege o de outro usuário",
  ignore: !TEST_JWT,
  fn: async () => {
    const criado = await callFn("compromissos-create", {
      token: TEST_JWT,
      body: {
        titulo: `Delete ${crypto.randomUUID().slice(0, 8)}`,
        data_hora_limite: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    assertEquals(criado.status, 200);
    const id = criado.json.id;

    if (TEST_JWT_OTHER) {
      const alheio = await callFn(FN, { token: TEST_JWT_OTHER, body: { id } });
      assertEquals(alheio.status, 404, "outro usuário não pode deletar este registro");
    }

    const del = await callFn(FN, { token: TEST_JWT, body: { id } });
    assertEquals(del.status, 200);

    const denovo = await callFn(FN, { token: TEST_JWT, body: { id } });
    assertEquals(denovo.status, 404);

    const lista = await callFn("compromissos-list", { token: TEST_JWT });
    assert(
      !(lista.json ?? []).some((r: any) => r.id === id),
      "registro deletado ainda aparece na listagem",
    );
  },
});
