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

const FN = "compromissos-list";

Deno.test("list: responde ao preflight CORS", async () => {
  const { status, allowOrigin } = await preflight(FN);
  assert(status < 400, `preflight falhou: ${status}`);
  assert(allowOrigin, "sem header Access-Control-Allow-Origin");
});

Deno.test("list: exige token (401 sem Authorization)", async () => {
  const { status } = await callFn(FN);
  assertEquals(status, 401);
});

Deno.test("list: rejeita token inválido", async () => {
  const { status } = await callFn(FN, { token: "token.invalido.aqui" });
  assertEquals(status, 401);
});

Deno.test("list: SQL filtra por telefone_usuario e ordena por data_hora_limite ASC", async () => {
  const src = normalize(await readFunctionSource(FN));
  assert(
    src.includes("WHERE telefone_usuario = ${telefone}"),
    "SELECT sem filtro por telefone do token",
  );
  assert(
    src.includes("ORDER BY data_hora_limite ASC"),
    "SELECT sem ordenação por data_hora_limite ASC",
  );
});

Deno.test({
  name: "list (integração): retorna só o telefone do token, ordenado",
  ignore: !TEST_JWT,
  fn: async () => {
    const { status, json } = await callFn(FN, { token: TEST_JWT });
    assertEquals(status, 200);
    assert(Array.isArray(json), "resposta deveria ser um array");

    const datas = json.map((r: any) => new Date(r.data_hora_limite).getTime());
    const ordenado = [...datas].sort((a, b) => a - b);
    assertEquals(datas, ordenado, "lista não está ordenada por data_hora_limite ASC");

    const telefones = [...new Set(json.map((r: any) => r.telefone_usuario))];
    assert(
      telefones.length <= 1,
      `vazamento de dados: telefones distintos na resposta -> ${telefones.length}`,
    );

    if (TEST_JWT_OTHER) {
      const outro = await callFn(FN, { token: TEST_JWT_OTHER });
      assertEquals(outro.status, 200);
      const idsA = new Set(json.map((r: any) => r.id));
      const compartilhados = (outro.json ?? []).filter((r: any) => idsA.has(r.id));
      assertEquals(compartilhados.length, 0, "usuários diferentes veem os mesmos registros");
    }
  },
});
