import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  approvedLiftingFacialFacts,
  buildLiftingFacialInformationReply,
  liftingFacialInformationTopics,
} from "./lifting-information.mjs";

const REAL_REGRESSION_MESSAGE =
  "Boa tarde, Bruna, tudo bem? Quanto tempo leva a cirurgia, se tem um longo período de recuperação, indicações para realização (talvez eu ainda não precise)";

test("the real lifting question receives one complete safe response instead of a holding reply", () => {
  const reply = buildLiftingFacialInformationReply({
    text: REAL_REGRESSION_MESSAGE,
    procedure: "lifting_facial",
    patientName: "Dani",
  });

  assert.match(reply, /^Olá, Dani!/);
  assert.match(reply, /duração da cirurgia varia conforme o planejamento/i);
  assert.match(reply, /primeira semana/i);
  assert.match(reply, /10 a 14 dias/i);
  assert.match(reply, /3 e 4 semanas/i);
  assert.match(reply, /não existe uma idade única/i);
  assert.match(reply, /queda das bochechas/i);
  assert.match(reply, /outro caminho.*ainda não seja o momento de operar/is);
  assert.match(reply, /sem compromisso de operar/i);
  assert.match(reply, /como funciona essa avaliação\?/i);
  assert.doesNotMatch(reply, /vou confirmar|com a equipe|aguarde/i);
  assert.doesNotMatch(reply, /\b3\s*(?:a|–|-)\s*6\s*horas\b/i);
  assert.doesNotMatch(reply, /no seu caso.*(?:indicado|precisa)/i);
  assert.equal((reply.match(/\?/g) || []).length, 1);
  assert.ok(Array.from(reply).length <= 1_200);
});

test("approved lifting facts decompose all three topics from the real message", () => {
  const topics = liftingFacialInformationTopics({
    text: REAL_REGRESSION_MESSAGE,
    procedure: "lifting_facial",
  });
  const approved = approvedLiftingFacialFacts({
    text: REAL_REGRESSION_MESSAGE,
    procedure: "lifting_facial",
  });

  assert.deepEqual(topics, ["duration", "recovery", "indication"]);
  assert.deepEqual(
    approved.facts.map((fact) => fact.topic),
    topics,
  );
  assert.match(approved.boundaries.join(" "), /não concluir indicação individual/i);
});

test("lifting facial facts do not leak into another procedure", () => {
  assert.equal(
    buildLiftingFacialInformationReply({
      text: REAL_REGRESSION_MESSAGE,
      procedure: "otoplastia",
      patientName: "Dani",
    }),
    "",
  );
});

test("a generic expression such as preciso saber does not invent an indication question", () => {
  assert.deepEqual(
    liftingFacialInformationTopics({
      procedure: "lifting_facial",
      text: "Preciso saber quanto custa o lifting facial.",
    }),
    [],
  );
});

test("approved recovery and indication facts remain aligned with the canonical site page", () => {
  const page = readFileSync(
    new URL("../../../lifting-facial/index.html", import.meta.url),
    "utf8",
  );

  assert.match(page, /Primeira semana/);
  assert.match(page, /10 a 14 dias/);
  assert.match(page, /3 a 4 semanas/);
  assert.match(page, /queda das bochechas/);
  assert.match(page, /perda da linha da mandíbula/);
  assert.match(page, /pode haver outro caminho/i);
});
