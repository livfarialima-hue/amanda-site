import assert from "node:assert/strict";
import test from "node:test";
import {
  createClassifierSafetyIdentifier,
  isLikelyClassifierMarketingPrefill,
  parseLeadClassificationResponse,
  runLeadClassifier,
} from "./lead-classifier.mjs";

const PHONE = "+5511967743374";

function validClassification(overrides = {}) {
  return {
    recommendedStatus: "Qualificado",
    confidence: "high",
    professional: "amanda",
    procedure: "blefaroplastia",
    summary: "Interessada em avaliação e perguntou sobre agenda.",
    nextAction: "Oferecer datas disponíveis para avaliação.",
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

test("marketing templates are treated as prefilled context", () => {
  assert.equal(
    isLikelyClassifierMarketingPrefill(
      "Gostaria de saber como funciona a consulta com a Dra. Amanda e consultar a disponibilidade.",
    ),
    true,
  );
  assert.equal(
    isLikelyClassifierMarketingPrefill(
      "Quero consultar a disponibilidade para terça à tarde.",
    ),
    false,
  );
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
