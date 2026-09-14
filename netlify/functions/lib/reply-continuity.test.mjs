import assert from "node:assert/strict";
import test from "node:test";
import { assessReplyContinuity, buildReplyContinuityContext } from "./reply-continuity.mjs";

const previous = [{ role: "assistant", source: "equipe_humana", text: "Na consulta, a Dra. Amanda examina a região e conversa sobre possibilidades e limites. O que você gostaria de entender primeiro?" }];

test("tracks multiple earlier turns rather than only the last reply", () => {
  const recentConversation = [...previous, { role: "user", text: "Onde fica?" }, { role: "assistant", text: "A clínica fica na Rua Pais Leme." }];
  const result = assessReplyContinuity({ body: "Na avaliação, a Dra. Amanda observa a região e explica possibilidades e limites. Você não precisa escolher uma técnica antes da consulta.", currentMessage: "Ainda não sei a técnica", recentConversation });
  assert.equal(result.body, "Você não precisa escolher uma técnica antes da consulta.");
  assert.equal(result.needsRevision, false);
});

test("new concrete details and practical amounts are never deleted as generic boilerplate", () => {
  for (const body of ["Na consulta, a Dra. Amanda avalia também a função respiratória.", "A consulta custa R$ 500.", "A avaliação dura cerca de 60 minutos.", "A recuperação precisa de retorno presencial.", "Procure atendimento urgente se houver sangramento."]) {
    assert.equal(assessReplyContinuity({ body, currentMessage: "Pode explicar?", recentConversation: previous }).body, body);
  }
});

test("unknown patient history does not invent facts already provided", () => {
  const body = "Na avaliação, a Dra. Amanda explica possibilidades e limites.";
  for (const recentConversation of [null, {}, [], [{ role: "user", text: body }]]) {
    const result = assessReplyContinuity({ body, recentConversation, currentMessage: "Como funciona?" });
    assert.equal(result.body, body);
    assert.deepEqual(result.context.previouslyExplained, []);
  }
});

test("keeps a repeated explanation when the patient explicitly asks to understand it again", () => {
  const body = previous[0].text.split(" O que")[0];
  assert.equal(assessReplyContinuity({ body, currentMessage: "Não entendi, explique de novo", recentConversation: previous }).body, body);
});

test("removes a repeated optional invitation rather than asking permission again", () => {
  const offer = "Se quiser, posso verificar opções de horário.";
  const result = assessReplyContinuity({ body: "O pagamento pode ser por Pix. " + offer, currentMessage: "Aceita Pix?", recentConversation: [{ role: "assistant", text: "A consulta custa R$ 500. " + offer }] });
  assert.equal(result.body, "O pagamento pode ser por Pix.");
});

test("a genuine new question about a different detail is preserved", () => {
  const body = "Você fala das pálpebras superiores ou inferiores?";
  assert.equal(assessReplyContinuity({ body, currentMessage: "Minhas pálpebras", recentConversation: previous }).body, body);
});

test("the recent patient block stops at the latest clinic reply", () => {
  const context = buildReplyContinuityContext({ currentMessage: "No pescoço", recentConversation: [{ role: "user", text: "Quanto custa?" }, ...previous, { role: "user", text: "Algumas linhas me incomodam." }] });
  assert.equal(context.patientAnswer, "Algumas linhas me incomodam.\nNo pescoço");
  assert.equal(context.patientAnswer.includes("custa"), false);
});

test("a repeated reassurance with only a bare acknowledgement needs a new draft", () => {
  const result = assessReplyContinuity({ body: "Claro. Na avaliação, a Dra. Amanda observa a região e explica possibilidades e limites.", currentMessage: "Tenho essa preocupação", recentConversation: previous });
  assert.equal(result.needsRevision, true);
});
