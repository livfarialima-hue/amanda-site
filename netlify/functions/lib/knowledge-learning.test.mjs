import assert from "node:assert/strict";
import test from "node:test";
import {
  UNKNOWN_CLARIFICATION_CODE,
  UNKNOWN_REVIEW_CODE,
  applyKnowledgeDecisionGuard,
  buildPediatricReviewAcknowledgement,
  buildSafeInternalReviewSuggestion,
  buildUnknownHoldingReply,
  classifyLearningRisk,
  isMinorContext,
  normalizeKnowledgeContext,
  shouldDigestLearningDecision,
} from "./knowledge-learning.mjs";

test("pending knowledge preserves its exact binding and the complete clarified question", () => {
  const pending = { eventId: "synthetic-question", questionRevision: "a".repeat(64), conversationRevision: "b".repeat(64), opportunityId: "synthetic-opportunity",
    professional: "amanda", question: "Pergunta com esclarecimentos. ".repeat(40).trim(), risk: "Baixo" };
  const result = normalizeKnowledgeContext({ pendingQuestion: pending }).pendingQuestion;
  assert.equal(result.id, pending.eventId);
  for (const field of ["questionRevision", "conversationRevision", "opportunityId", "professional", "question"]) assert.equal(result[field], pending[field]);
});

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
  assert.equal(guarded.suggestedReply, "Apenas para a equipe.");
  assert.equal(shouldDigestLearningDecision(guarded), true);
});

for (const code of ["KB:KB-001", UNKNOWN_CLARIFICATION_CODE]) {
  for (const veto of [
    { route: "human_review", automaticAllowed: false, confidence: "low" },
    { route: "standard_reply", automaticAllowed: false },
    { route: "standard_reply", confidence: "low" },
    { route: "appointment_review", automaticAllowed: false },
    { route: "ignore", automaticAllowed: false },
    { route: "daniel_greeting_and_alert", automaticAllowed: false },
    { urgent: true },
  ]) {
    test(`knowledge cannot override a semantic veto: ${code} ${JSON.stringify(veto)}`, () => {
      const guarded = applyKnowledgeDecisionGuard(decision({
        replyCode: code, suggestedReply: "Você se refere à consulta ou à cirurgia?",
        reviewReason: "unknown_digest:equipamento_lifting", ...veto,
      }), { candidates: [{ id: "KB-001", mode: "Automática", risk: "Baixo", answer: "A clínica tem estacionamento." }] });
      assert.equal(guarded.automaticAllowed, false);
      assert.notEqual(guarded.route, "standard_reply");
      if (["appointment_review", "ignore", "daniel_greeting_and_alert"].includes(veto.route)) {
        assert.equal(guarded.route, veto.route);
        assert.equal(guarded.suggestedReply, "");
      } else if (!veto.urgent) {
        assert.equal(guarded.replyCode, UNKNOWN_REVIEW_CODE);
        assert.equal(guarded.reviewReason, "unknown_digest:equipamento_lifting");
      }
    });
  }
}

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
  assert.equal(guarded.suggestedReply, "Resposta aprovada");
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

test("an explicit minor context is always classified as high risk", () => {
  const examples = [
    "Tenho interesse em lobuloplastia para uma criança de 2 anos.",
    "Minha filha tem 12 anos e gostaria de uma avaliação.",
    "A paciente adolescente tem 16 anos.",
  ];

  for (const text of examples) {
    assert.equal(isMinorContext(text), true, text);
    assert.equal(classifyLearningRisk({ text }), "Alto", text);
  }
  assert.equal(isMinorContext("Minha filha tem 22 anos."), false);
});

test("a pediatric handoff acknowledges the child without giving clinical guidance", () => {
  const reply = buildPediatricReviewAcknowledgement({
    patientName: "Onde Há Fé, Há Milagres",
    introduceBruna: true,
    currentText:
      "Tenho interesse em lobuloplastia para uma criança de 2 anos.",
  });

  assert.equal(
    reply,
    "Olá! Eu sou a Bruna, concierge da Clínica LIV Faria Lima. Obrigada por explicar. Como se trata de uma criança, vou encaminhar sua mensagem para a equipe responsável confirmar a orientação mais adequada para esse caso. Como posso te chamar?",
  );
  assert.doesNotMatch(
    reply,
    /\b(?:indica[cç][aã]o|t[eé]cnica|pre[cç]o|valor|agenda|cirurgia indicada)\b/i,
  );
});

test("a pediatric handoff does not repeat a trusted name question", () => {
  const reply = buildPediatricReviewAcknowledgement({
    patientName: "Marina Souza",
    introduceBruna: false,
    currentText: "Quero informações para meu filho de 8 anos.",
  });

  assert.match(reply, /^Olá, Marina!/);
  assert.doesNotMatch(reply, /Como posso te chamar\?/);
});

test("the pediatric name question can be removed when the turn allows none", () => {
  const reply = buildPediatricReviewAcknowledgement({
    patientName: "Perfil comercial 24h",
    introduceBruna: true,
    currentText: "Quero informações para uma criança.",
    allowNameQuestion: false,
  });

  assert.match(reply, /Como se trata de uma criança/);
  assert.doesNotMatch(reply, /Como posso te chamar\?/);
});

test("a pediatric handoff does not ask the name again after prior interaction", () => {
  const reply = buildPediatricReviewAcknowledgement({
    patientName: "Perfil comercial 24h",
    introduceBruna: false,
    currentText: "Quero informações para uma criança.",
    allowNameQuestion: true,
  });

  assert.match(reply, /Como se trata de uma criança/);
  assert.doesNotMatch(reply, /Como posso te chamar\?/);
});

test("an adult review does not receive the pediatric acknowledgement", () => {
  assert.equal(
    buildPediatricReviewAcknowledgement({
      patientName: "Marina Souza",
      introduceBruna: false,
      currentText: "Tenho 35 anos e quero avaliar uma lobuloplastia para mim.",
    }),
    "",
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

test('a remote consultation review keeps its subject despite price and scheduling words', () => {
  const reply = buildUnknownHoldingReply({currentText:'Quero agendar uma avaliação online para planejar o orçamento.',reviewReason:'unknown_digest:consulta_online',procedure:'lifting_facial'});
  assert.match(reply,/avaliação online/);
  assert.doesNotMatch(reply,/faixa|valor para|lifting|R\$|confirmada/);
});

test('the unresolved semantic subject replaces keyword precedence from the full question', () => {
  const text='Quero saber o preço, se há desconto e quantos dias de afastamento. Preciso de relatório para reembolso.';
  const recovery=buildUnknownHoldingReply({currentText:text,reviewReason:'unknown_digest:afastamento_lifting',procedure:'lifting_facial'});
  assert.doesNotMatch(recovery,/valor|pagamento|desconto/);
  const remote=buildUnknownHoldingReply({currentText:text,reviewReason:'unknown_digest:orcamento_avaliacao_a_distancia'});
  assert.match(remote,/avaliação online/);
  const unknown=buildUnknownHoldingReply({currentText:text,reviewReason:'unknown_digest:equipamento_especifico'});
  assert.equal(unknown,'','an unrecognized subject must not invent a price promise');
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

test("a safe unknown review keeps a draft for the team without authorizing patient delivery", () => {
  const guarded = applyKnowledgeDecisionGuard(
    decision({
      route: "human_review",
      automaticAllowed: false,
      confidence: "low",
      replyCode: UNKNOWN_REVIEW_CODE,
      suggestedReply:
        "A diferença geral está na extensão do tratamento. A escolha depende da avaliação.",
      reviewReason: "unknown_digest:comparacao_de_tecnicas",
    }),
    {},
  );

  assert.equal(guarded.route, "human_review");
  assert.equal(guarded.automaticAllowed, false);
  assert.match(guarded.suggestedReply, /extensão do tratamento/i);
  assert.equal(
    buildSafeInternalReviewSuggestion({
      decision: guarded,
      risk: "Médio",
    }),
    guarded.suggestedReply,
  );
});

test("high-risk or urgent reviews never expose an internal draft as copy-ready", () => {
  const guarded = applyKnowledgeDecisionGuard(
    decision({
      route: "human_review",
      automaticAllowed: false,
      replyCode: UNKNOWN_REVIEW_CODE,
      suggestedReply: "Pela foto, a melhor técnica é esta.",
      reviewReason: "unknown_digest:foto_clinica",
    }),
    {},
  );

  assert.equal(
    buildSafeInternalReviewSuggestion({
      decision: guarded,
      risk: "Alto",
    }),
    "",
  );
  assert.equal(
    buildSafeInternalReviewSuggestion({
      decision: { ...guarded, urgent: true },
      risk: "Médio",
    }),
    "",
  );
});
