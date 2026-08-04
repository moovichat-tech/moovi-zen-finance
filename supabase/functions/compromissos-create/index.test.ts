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
} from "../_shared/test-utils.ts";

const FN = "compromissos-create";

Deno.test("create: responde ao preflight CORS", async () => {
  const { status, allowOrigin } = await preflight(FN);
  assert(status < 400, `preflight falhou: ${status}`);
  assert(allowOrigin, "sem header Access-Control-Allow-Origin");
});

Deno.test("create: exige token (401 sem Authorization)", async () => {
  const { status } = await callFn(FN, {
    body: { titulo: "Teste", data_hora_limite: new Date().toISOString() },
  });
  assertEquals(status, 401);
});

Deno.test("create: grava telefone do token, nunca do body", async () => {
  const src = normalize(await readFunctionSource(FN));
  assert(
    src.includes("VALUES (${telefone},"),
    "INSERT deve usar o telefone extraído do JWT",
  );
  assert(
    !/body\??\.\s*telefone/.test(src),
    "INSERT não pode aceitar telefone vindo do body",
  );
  assert(src.includes("RETURNING"), "INSERT sem cláusula RETURNING");
});

Deno.test({
  name: "create (integração): valida título e data",
  ignore: !TEST_JWT,
  fn: async () => {
    const semTitulo = await callFn(FN, {
      token: TEST_JWT,
      body: { titulo: "   ", data_hora_limite: new Date().toISOString() },
    });
    assertEquals(semTitulo.status, 400);

    const dataRuim = await callFn(FN, {
      token: TEST_JWT,
      body: { titulo: "Teste", data_hora_limite: "nao-e-data" },
    });
    assertEquals(dataRuim.status, 400);
  },
});

Deno.test({
  name: "create (integração): cria, aparece na lista e é removido",
  ignore: !TEST_JWT,
  fn: async () => {
    const titulo = `Teste automatizado ${crypto.randomUUID().slice(0, 8)}`;
    const data = new Date(Date.now() + 86_400_000).toISOString();

    const criado = await callFn(FN, {
      token: TEST_JWT,
      body: { titulo, descricao: "criado por teste", data_hora_limite: data },
    });
    assertEquals(criado.status, 200);
    assert(criado.json?.id, "create não retornou id");
    assertEquals(criado.json.titulo, titulo);
    assertEquals(criado.json.status, "pendente");

    const lista = await callFn("compromissos-list", { token: TEST_JWT });
    assert(
      (lista.json ?? []).some((r: any) => r.id === criado.json.id),
      "compromisso criado não apareceu na listagem do usuário",
    );

    // limpeza
    const del = await callFn("compromissos-delete", {
      token: TEST_JWT,
      body: { id: criado.json.id },
    });
    assertEquals(del.status, 200);
  },
});
