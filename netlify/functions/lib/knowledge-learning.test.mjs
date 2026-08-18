import assert from "node:assert/strict";
import test from "node:test";
import {
  UNKNOWN_CLARIFICATION_CODE,
  UNKNOWN_REVIEW_CODE,
  applyKnowledgeDecisionGuard,
  buildUnknownHoldingReply,
  classifyLearningRisk,
  shouldDigestLearningDecision,
} from "./knowledge-learning.mjs";

function decision(overrides = {}) {
  return {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    professional: "amanda",
    procedure: "",
    replyCode: "",
    suggestedReply: "Resposta inventada",
    reviewReason: "",
    ...overrides,
  };
}

test("approved automatic knowledge is sent verbatim", () => {
  const guarded = applyKnowledgeDecisionGuard(
    decision({ replyCode: "KB:KB-001" }),
    {
      candidates: [
        {
          id: "KB-001",
          mode: "Automática",
          risk: "Baixo",
          answer: "Resposta exatamente aprovada pela equipe.",
        },
      ],
    },
  );

  assert.equal(guarded.route, "standard_reply");
  assert.equal(guarded.suggestedReply, "Resposta exatamente aprovada pela equipe.");
});

test("an invalid or non-automatic knowledge rule is held for review", () => {
  const guarded = applyKnowledgeDecisionGuard(
    decision({ replyCode: "KB:KB-002" }),
    {
      candidates: [
        {
          id: "KB-002",
          mode: "Sugestão interna",
          risk: "Médio",
          answer: "Apenas para a equipe.",
        },
      ],
    },
  );

  assert.equal(guarded.replyCode, UNKNOWN_REVIEW_CODE);
  assert.equal(guarded.automaticAllowed, false);
  assert.equal(guarded.suggestedReply, "");
  assert.equal(shouldDigestLearningDecision(guarded), true);
});

test("medium-risk knowledge can never be sent automatically", () => {
  const decision = {
    route: "standard_reply",
    confidence: "high",
    automaticAllowed: true,
    urgent: false,
    professional: "amanda",
    procedure: "lifting facial",
    replyCode: "KB:kb-medium",
    suggestedReply: "Texto gerado",
    reviewReason: "",
  };
  const guarded = applyKnowledgeDecisionGuard(decision, {
    candidates: [
      {
        id: "kb-medium",
        answer: "Resposta aprovada",
        mode: "Automática",
        risk: "Médio",
      },
    ],
  });
  assert.equal(guarded.route, "human_review");
  assert.equal(guarded.automaticAllowed, false);
});

test("the bot can ask only one clarification for the same pending question", () => {
  const first = applyKnowledgeDecisionGuard(
    decision({
      replyCode: UNKNOWN_CLARIFICATION_CODE,
      suggestedReply: "Você se refere à consulta ou à cirurgia?",
      reviewReason: "unknown_clarification:preco",
    }),
    {},
  );
  const repeated = applyKnowledgeDecisionGuard(first, {
    pendingQuestion: { clarificationCount: 1 },
  });

  assert.equal(first.route, "standard_reply");
  assert.equal(repeated.route, "human_review");
  assert.equal(repeated.replyCode, UNKNOWN_REVIEW_CODE);
});

test("clinical and negotiated unknowns receive high risk", () => {
  assert.equal(
    classifyLearningRisk({ text: "Pode interpretar esta foto do pós-operatório?" }),
    "Alto",
  );
  assert.equal(
    classifyLearningRisk({ text: "Tem estacionamento perto da clínica?" }),
    "Baixo",
  );
});

test("the holding reply is transparent without exposing automation", () => {
  const reply = buildUnknownHoldingReply({
    patientName: "Maria Silva",
    introduceBruna: true,
    currentText: "Qual é a quantidade de parcelas?",
  });

  assert.match(reply, /^Olá, Maria!/);
  assert.match(reply, /confirmar as condições de pagamento/i);
  assert.doesNotMatch(reply, /\b(?:bot|inteligência artificial|fila|regra)\b/i);
});

test("an unmapped unknown stays silent instead of producing a generic holding reply", () => {
  assert.equal(
    buildUnknownHoldingReply({
      patientName: "Maria Silva",
      currentText: "Tenho uma questão.",
    }),
    "",
  );
});
