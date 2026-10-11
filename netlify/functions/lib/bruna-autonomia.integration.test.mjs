import assert from "node:assert/strict";
import test from "node:test";
import { applyKnowledgeDecisionGuard, approvedPartialAnswer, normalizeKnowledgeContext } from "./knowledge-learning.mjs";
import { proposeKnowledgeCandidate, validateLearningCandidate } from "./knowledge-candidate.mjs";
import { recordHumanLearningAnswer } from "../ycloud-webhook.mjs";
import { runOpenAIShadow } from "./openai-shadow.mjs";
import { buildAdministrativeSideAnswer } from "./patient-replies.mjs";
import { replyStyleRevisionReason } from "./outbound-reply-gate.mjs";
import { approvedProcedureInformationFacts } from "./lifting-information.mjs";

// All examples and credentials below are synthetic. No request reaches a service.
const knowledge = { candidates: [{ id: "KB-INVOICE", subject: "Nota fiscal", mode: "Automática", risk: "Baixo",
  answer: "Emitimos nota fiscal da consulta.", boundaries: "Somente a consulta; não prometer cobertura ou reembolso.",
  source: "Revisão humana", version: "2", snapshotVersion: "kb-synthetic", validUntil: "2099-01-01T00:00:00Z" }] };
function decision(overrides = {}) {
  return { route: "standard_reply", confidence: "high", automaticAllowed: true, urgent: false, professional: "amanda", procedure: "",
    replyCode: "KB:KB-INVOICE", replyWording: "contextual", suggestedReply: "Sim, fornecemos nota fiscal da consulta.", reviewReason: "",
    conversationState: { activeTopic: "nota fiscal", patientAct: "question", refersToEventId: "", lastClinicQuestion: "", lastClinicOffer: "",
      unresolvedQuestions: [], factsAlreadyProvided: [], owner: "bruna", nextExpectedAction: "responder", ambiguity: "", contextConfidence: "high" }, ...overrides };
}

test("approved meaning can use natural wording while literal changes fall back to the source", () => {
  const result = applyKnowledgeDecisionGuard(decision(), knowledge);
  assert.equal(result.suggestedReply, "Sim, fornecemos nota fiscal da consulta.");
  assert.equal(applyKnowledgeDecisionGuard(decision({ suggestedReply: "Emitimos em 3 dias." }), knowledge).suggestedReply, knowledge.candidates[0].answer);
  assert.equal(applyKnowledgeDecisionGuard(decision({ suggestedReply: "Veja https://example.org." }), knowledge).suggestedReply, knowledge.candidates[0].answer);
  assert.equal(normalizeKnowledgeContext(knowledge).candidates[0].source, "Revisão humana");
});

test("a partial answer preserves a semantic veto and narrows the handoff to the remaining question", () => {
  const reviewed = applyKnowledgeDecisionGuard(decision({ route: "human_review", automaticAllowed: false, replyCode: "UNKNOWN-REVIEW-01",
    partialAnswer: { knowledgeIds: ["KB-INVOICE"], pendingQuestion: "A equipe emite o relatório solicitado pelo plano?" } }), knowledge);
  assert.equal(reviewed.route, "human_review");
  assert.equal(reviewed.automaticAllowed, false);
  assert.deepEqual(approvedPartialAnswer(reviewed, knowledge), { answer: "Emitimos nota fiscal da consulta.",
    knowledgeIds: ["KB-INVOICE"], pendingQuestion: "A equipe emite o relatório solicitado pelo plano?" });
  for (const override of [{ urgent: true }, { route: "ignore" }, { automaticAllowed: true }, { partialAnswer: { knowledgeIds: ["invented"], pendingQuestion: "Detalhe" } }]) {
    assert.equal(approvedPartialAnswer({ ...reviewed, ...override }, knowledge), null);
  }
  assert.equal(approvedPartialAnswer(reviewed, { candidates: [{ ...knowledge.candidates[0], risk: "Médio" }] }), null);
});

test("learning sends the canonical learning envelope with the exact pending question identity", async () => {
  const writes = [];
  const response = await recordHumanLearningAnswer({ phone: "+5511900000000", answer: "Emitimos nota fiscal.", eventId: "synthetic-human" }, {
    getBotKnowledgeContextImpl: async () => ({ pendingQuestion: { eventId: "synthetic-question", question: "Emitem nota?", risk: "Baixo" } }),
    proposeKnowledgeCandidateImpl: async ({ pendingQuestion }) => { assert.equal(pendingQuestion.id, "synthetic-question"); return { sourceQuestionId: pendingQuestion.id }; },
    deliverSheetsActionImpl: async (action, payload) => { writes.push({ action, payload }); return { ok: true }; },
  });
  assert.equal(response.ok, true);
  assert.equal(writes[0].action, "record_human_learning_answer");
  assert.equal(writes[0].payload.learning.answer, "Emitimos nota fiscal.");
  assert.equal(writes[0].payload.learning.proposal.sourceQuestionId, "synthetic-question");
  assert.equal(writes[0].payload.answer, undefined);
});

test("learning proposes a general draft without approval and refuses clinical or identifying output", async () => {
  const pendingQuestion = { id: "synthetic-question", question: "Tem nota fiscal?", risk: "Baixo" };
  const proposal = { reusable: true, subject: "Nota fiscal", question: "Emitem nota fiscal da consulta?", answer: "Emitimos nota fiscal da consulta.", boundaries: "Somente nota da consulta, sem garantia de reembolso." };
  let calls = 0;
  const options = { env: { OPENAI_API_KEY: "synthetic" }, fetchImpl: async (_url, request) => {
    calls++; const body = JSON.parse(request.body); assert.equal(body.store, false); assert.equal(body.model, "gpt-6.1-sol");
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(proposal) }] }] });
  } };
  const result = await proposeKnowledgeCandidate({ answer: "Emitimos nota fiscal da consulta.", pendingQuestion }, options);
  assert.equal(result.sourceQuestionId, pendingQuestion.id);
  assert.equal(result.approved, undefined);
  proposal.answer = "Entre em contato em paciente@example.org";
  assert.equal(await proposeKnowledgeCandidate({ answer: "Emitimos nota fiscal.", pendingQuestion }, options), null);
  assert.equal(await proposeKnowledgeCandidate({ answer: "Tome este medicamento", pendingQuestion }, options), null);
  assert.equal(calls, 2);
});

test("administrative help excludes clinical, combined, explicit human and unrelated professional requests", () => {
  for (const text of ["Onde vocês ficam?", "Pode me passar o endereço?", "Vocês emitem nota fiscal?", "Vocês trabalham com plano?"]) {
    assert.ok(buildAdministrativeSideAnswer({ text, professional: "amanda" }), text);
    assert.equal(buildAdministrativeSideAnswer({ text, professional: "daniel" }), null);
    assert.equal(buildAdministrativeSideAnswer({ text, professional: "amanda", relationship: { neverBotReply: true } }), null);
  }
  for (const text of ["Onde fica e posso tomar remédio?", "Quero aguardar a médica", "Quanto custa minha cirurgia?", "Não quero o endereço", "Onde fica o hospital?"]) {
    assert.equal(buildAdministrativeSideAnswer({ text, professional: "amanda" }), null, text);
  }
});

test("semantic consolidation reuses a reviewed candidate verbatim and refuses invented identifiers", () => {
  const existing = { id: "SYNTHETIC-EXISTING", subject: "Nota fiscal", answer: "Emitimos nota fiscal da consulta.", boundaries: "Somente emissão; não prometer reembolso." };
  const pending = { id: "SYNTHETIC-QUESTION", question: "Tem comprovante fiscal?", risk: "Baixo" };
  const proposal = { reusable: true, existingRuleId: existing.id, subject: "Comprovante", question: "Fornecem comprovante fiscal?", answer: "Nova redação", boundaries: "Mesma condição" };
  const consolidated = validateLearningCandidate(proposal, pending, [existing]);
  assert.equal(consolidated.answer, existing.answer);
  assert.equal(consolidated.boundaries, existing.boundaries);
  assert.equal(consolidated.question, proposal.question);
  assert.equal(validateLearningCandidate({ ...proposal, existingRuleId: "invented" }, pending, [existing]), null);
});

test("consultation preparation comes from the existing site and cannot prescribe tests or medication", () => {
  const facts = approvedProcedureInformationFacts({ text: "O que preciso levar para a consulta?" });
  assert.equal(facts.facts[0].source, "conteudos/consulta-cirurgia-plastica/index.html");
  assert.match(facts.facts[0].statement, /exames que já tiver/);
  assert.match(facts.boundaries.join(" "), /Não solicitar novos exames/);
});

test("style-only failures get one rewrite under the same deadline; medical claims do not", async () => {
  const replyContract = { version: "reply-contract-v2", stage: "information", risk: "green", owner: "bruna", allowedResponseKind: "direct_answer",
    unresolvedIntents: ["procedure_information"], silenceReason: "", maxQuestions: 1, maxLinks: 0, allowCta: false, allowAppointmentConfirmation: false };
  const calls = [];
  const signals = [];
  const outcome = await runOpenAIShadow({ phone: "+5511900000000", text: "Como posso me preparar para a consulta?",
    recentConversation: [{ role: "assistant", source: "bruna", text: "Pode me contar sua dúvida." }], replyContract }, {
    env: { OPENAI_API_KEY: "synthetic", BRUNA_CONVERSION_EXPERIENCE_V1: "enabled" },
    fetchImpl: async (_url, request) => { calls.push(JSON.parse(request.body)); signals.push(request.signal);
      return Response.json({ output_text: JSON.stringify(decision({ replyCode: "", suggestedReply: calls.length === 1
        ? "Você já tem exames? Usa algum medicamento?" : "Leve os exames que já tiver e suas dúvidas para a consulta." })) }); },
  });
  assert.equal(calls.length, 2, JSON.stringify(outcome));
  assert.equal(signals[0], signals[1]);
  assert.equal(outcome.decision.automaticAllowed, true);
  assert.match(JSON.parse(calls[1].input).continuityRevision.styleFailure, /questions/);
  assert.equal(replyStyleRevisionReason({ body: "O resultado é garantido. Tem dúvidas? Quer saber mais?", currentText: "Dúvidas", replyContract }), "");
});
