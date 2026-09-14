import assert from "node:assert/strict";
import test from "node:test";

test("a contextual amount answers the price question and Amanda's price rule does not overwrite cardiology", () => {
  for (const [professional, amount] of [["amanda", "R$ 500"], ["daniel", "R$ 700"]]) {
    const result = enforceCommercialEvidenceGuard({ currentStatus: "Novo", messages: [
      { direction: "IN", text: "Qual o valor da consulta?", messageType: "text" },
      { direction: "OUT", text: amount, messageType: "text" },
    ], classification: { professional, recommendedStatus: "Novo", nextAction: "Aguardar paciente",
      expectedParty: "patient", commercialReason: "Em andamento", appointmentOutcome: "none", procedureMilestone: "none" } });
    assert.equal(result.expectedParty, "patient", professional);
    assert.equal(result.nextAction, "Aguardar paciente");
  }
});

test("a payment statement is not reopened as a consultation price question", () => {
  const result = enforceCommercialEvidenceGuard({ currentStatus: "Consulta realizada", messages: [
    { direction: "IN", text: "Já paguei o valor da consulta.", messageType: "text" },
  ], classification: { recommendedStatus: "Consulta realizada", nextAction: "Conferir recebimento", expectedParty: "clinic", commercialReason: "Em andamento", appointmentOutcome: "none", procedureMilestone: "none" } });
  assert.equal(result.nextAction, "Conferir recebimento");
});

test("a captioned receipt or shared-phone request cannot confirm an administrative milestone", () => {
  for (const message of [
    { direction: "IN", text: "Comprovante do Pix", messageType: "image" },
    { direction: "IN", text: "Eu e minha mãe queremos marcar as consultas.", messageType: "text" },
  ]) {
    const result = enforceCommercialEvidenceGuard({ currentStatus: "Qualificado", messages: [message],
      classification: { recommendedStatus: "Consulta agendada", nextAction: "Aguardar consulta", expectedParty: "patient", appointmentOutcome: "scheduled", procedureMilestone: "paid" } });
    assert.equal(result.recommendedStatus, "Qualificado");
    assert.equal(result.appointmentOutcome, "none");
    assert.equal(result.procedureMilestone, "none");
    assert.equal(result.expectedParty, "clinic");
  }
});
import {
  createClassifierSafetyIdentifier,
  isLikelyClassifierMarketingPrefill,
  parseLeadClassificationResponse,
  runLeadClassifier,
  enforceCommercialEvidenceGuard,
} from "./lead-classifier.mjs";

test("price inquiry is not a financial objection or consent to send dates", () => {
  const result = enforceCommercialEvidenceGuard({ currentStatus: "Novo", messages: [
    { direction: "IN", text: "Onde fica a clínica e qual o valor da consulta?" },
    { direction: "OUT", text: "A consulta custa R$ 500, em São Paulo.", source: "bruna" },
    { direction: "IN", text: "Tá certo" },
  ], classification: validClassification({ commercialReason: "Preço" }) });
  assert.equal(result.commercialReason, "Em andamento");
  assert.equal(result.recommendedStatus, "Novo");
  assert.equal(result.expectedParty, "patient");
  assert.doesNotMatch(result.nextAction, /Oferecer datas/);
});

test("farewell leaves an unanswered consultation price question with the clinic", () => {
  const result = enforceCommercialEvidenceGuard({ currentStatus: "Qualificado", messages: [
    { direction: "IN", text: "Vou conversar em casa. Qual o valor da consulta? Obrigada!" },
    { direction: "OUT", text: "Por nada! Boa semana!", source: "equipe_humana" },
  ], classification: validClassification({ expectedParty: "patient", nextAction: "Aguardar retorno" }) });
  assert.equal(result.expectedParty, "clinic");
  assert.match(result.nextAction, /valor da consulta/);
});

test("image after PIX is a document to review, not a confirmed surgical payment", () => {
  const result = enforceCommercialEvidenceGuard({ currentStatus: "Consulta realizada", messages: [
    { direction: "OUT", text: "Segue a chave PIX da consulta.", source: "equipe_humana" },
    { direction: "IN", text: "", messageType: "image", contentUnavailable: true },
  ], classification: validClassification({ recommendedStatus: "Paciente convertido", procedureMilestone: "payment_confirmed" }) });
  assert.equal(result.recommendedStatus, "Consulta realizada");
  assert.equal(result.procedureMilestone, "none");
  assert.equal(result.expectedParty, "clinic");
  assert.match(result.nextAction, /Conferir o material recebido/);
});

test("explicit request to schedule and explicit financial barriers remain distinguishable", () => {
  const ready = enforceCommercialEvidenceGuard({ currentStatus: "Novo", messages: [
    { direction: "IN", text: "Quero marcar uma consulta. Quais horários estão disponíveis?" },
  ], classification: validClassification() });
  assert.equal(ready.recommendedStatus, "Qualificado");
  const refused = enforceCommercialEvidenceGuard({ currentStatus: "Novo", messages: [
    { direction: "IN", text: "O investimento está fora do meu orçamento, não vou prosseguir." },
  ], classification: validClassification({ recommendedStatus: "Não qualificado", commercialReason: "Preço", expectedParty: "patient", nextAction: "Encerrar; sem nova ação comercial" }) });
  assert.equal(refused.commercialReason, "Preço");
  assert.equal(refused.recommendedStatus, "Não qualificado");
});

const PHONE = "+5511967743374";

function validClassification(overrides = {}) {
  return {
    recommendedStatus: "Qualificado",
    confidence: "high",
    professional: "amanda",
    procedure: "blefaroplastia",
    summary: "Interessada em avaliação e perguntou sobre agenda.",
    nextAction: "Oferecer datas disponíveis para avaliação.",
    expectedParty: "clinic",
    commercialReason: "Em andamento",
    evidence: "Pediu datas para agendar uma avaliação.",
    appointmentOutcome: "none",
    procedureMilestone: "none",
    ...overrides,
  };
}

function validResponse(classification = validClassification()) {
  return {
    model: "test-classifier",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(classification),
          },
        ],
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
    },
  };
}

test("classifier safety identifier is stable and contains no phone", () => {
  const first = createClassifierSafetyIdentifier(PHONE);
  const second = createClassifierSafetyIdentifier(PHONE);

  assert.equal(first, second);
  assert.equal(first.includes(PHONE), false);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("valid strict classification is parsed", () => {
  const result = parseLeadClassificationResponse(
    validResponse(),
    "fallback",
  );

  assert.equal(result.status, "completed");
  assert.equal(result.model, "test-classifier");
  assert.deepEqual(result.classification, validClassification());
  assert.deepEqual(result.usage, {
    input_tokens: 100,
    output_tokens: 50,
    total_tokens: 150,
  });
});

test("external professionals and non-patient contacts are valid exclusion routes", () => {
  for (const professional of ["external", "nonpatient"]) {
    const result = parseLeadClassificationResponse(
      validResponse(validClassification({
        recommendedStatus: "Não qualificado",
        professional,
      })),
      "fallback",
    );
    assert.equal(result.status, "completed");
    assert.equal(result.classification.professional, professional);
  }
});

test("unexpected classification field is rejected", () => {
  const result = parseLeadClassificationResponse(
    validResponse(
      validClassification({ extra: "not allowed" }),
    ),
    "fallback",
  );

  assert.deepEqual(result, {
    status: "failed",
    httpStatus: 200,
    errorCode: "invalid_response",
  });
});

test("invalid administrative milestones are rejected", () => {
  const result = parseLeadClassificationResponse(
    validResponse(validClassification({ appointmentOutcome: "rescheduled" })),
    "fallback",
  );

  assert.deepEqual(result, {
    status: "failed",
    httpStatus: 200,
    errorCode: "invalid_response",
  });
});

test("only the structured template id marks marketing prefilled context", () => {
  assert.equal(
    isLikelyClassifierMarketingPrefill(
      "Gostaria de saber como funciona a consulta com a Dra. Amanda e consultar a disponibilidade.",
    ),
    false,
  );
  assert.equal(
    isLikelyClassifierMarketingPrefill(
      { templateId: "procedure_evaluation_v1" },
    ),
    true,
  );
});

test("an isolated structured prefill can never qualify the lead", async () => {
  const result = await runLeadClassifier(
    {
      phone: PHONE,
      currentStatus: "Novo",
      messages: [
        {
          direction: "IN",
          text: "Olá! Tenho interesse em otoplastia com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.",
          templateId: "procedure_evaluation_v1",
        },
      ],
    },
    {
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_CLASSIFIER_MODEL: "test-model",
      },
      fetchImpl: async () => new Response(
        JSON.stringify(validResponse()),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(result.classification.recommendedStatus, "Novo");
  assert.equal(result.classification.appointmentOutcome, "none");
  assert.equal(result.classification.procedureMilestone, "none");
  assert.equal(result.classification.expectedParty, "clinic");
  assert.match(result.classification.evidence, /sem intenção pessoal posterior/i);
});

test("request is private, structured, bounded and excludes raw phone", async () => {
  let requestBody;

  const result = await runLeadClassifier(
    {
      phone: PHONE,
      currentStatus: "Novo",
      currentSummary: "",
      currentNextAction: "",
      currentProfessional: "amanda",
      patientRelationship: {
        found: true,
        relationshipState: "known_patient",
      },
      messages: Array.from({ length: 20 }, (_, index) => ({
        direction: index % 2 ? "OUT" : "IN",
        at: `2026-07-26T12:${String(index).padStart(2, "0")}:00.000Z`,
        text: `mensagem-${index} ${"x".repeat(1200)}`,
      })),
    },
    {
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_CLASSIFIER_MODEL: "test-model",
      },
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.reasoning.effort, "low");
  assert.equal(requestBody.model, "test-model");
  assert.equal(
    requestBody.text.format.type,
    "json_schema",
  );
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(JSON.stringify(requestBody).includes(PHONE), false);

  const input = JSON.parse(requestBody.input);
  assert.deepEqual(input.patientRelationship, {
    found: true,
    relationshipState: "known_patient",
  });
  assert.equal(input.currentProfessional, "amanda");
  assert.equal(input.messages.length, 16);
  assert.ok(
    input.messages.every(
      (message) => Array.from(message.text).length <= 1000,
    ),
  );
  assert.ok(
    input.messages.reduce(
      (total, message) => total + message.text.length,
      0,
    ) <= 16000,
  );
  assert.match(requestBody.instructions, /marketingPrefill true/);
  assert.match(requestBody.instructions, /não congela a oportunidade atual/);
  assert.match(requestBody.instructions, /marcos administrativos/);
  assert.match(requestBody.instructions, /quote_sent isolado nunca é conversão/);
  assert.match(requestBody.instructions, /confirmação automática de recebimento[\s\S]*expectedParty continua clinic/);
  assert.match(requestBody.instructions, /respostas curtas da pessoa no contexto imediato/);
  assert.match(requestBody.instructions, /external/);
  assert.match(requestBody.instructions, /nonpatient/);
});

test("missing API configuration skips classification", async () => {
  const result = await runLeadClassifier(
    {
      phone: PHONE,
      messages: [],
    },
    { env: {} },
  );

  assert.deepEqual(result, {
    status: "skipped",
    errorCode: "configuration_missing",
  });
});
