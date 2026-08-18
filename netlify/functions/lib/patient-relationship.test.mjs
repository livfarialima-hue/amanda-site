import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPatientRelationshipPolicy,
  blocksAutomatedPatientMessages,
  buildPatientCommitment,
  buildRelationshipAlertMessage,
  normalizePatientRelationship,
  patientRelationshipPromptContext,
} from "./patient-relationship.mjs";

test("permanent no-bot preference forces human review", () => {
  const result = applyPatientRelationshipPolicy(
    {
      route: "standard_reply",
      reason: "known_procedure",
      automaticAllowed: true,
    },
    {
      relationshipState: "unknown",
      neverBotReply: true,
      neverFollowUp: false,
      blockReason: "administrative only",
    },
  );

  assert.equal(result.route, "human_review");
  assert.equal(result.reason, "contact_preference_no_bot");
  assert.equal(result.automaticAllowed, false);
  assert.equal(
    blocksAutomatedPatientMessages(result.patientRelationship),
    true,
  );
  assert.equal(
    patientRelationshipPromptContext(result.patientRelationship)
      .blockReason,
    undefined,
  );
});

test("active care always pauses acquisition automation", () => {
  const result = applyPatientRelationshipPolicy(
    {
      route: "standard_reply",
      reason: "known_procedure",
      procedure: "lifting_facial",
      automaticAllowed: true,
    },
    {
      found: true,
      relationshipState: "surgical_planning",
    },
  );

  assert.equal(result.route, "human_review");
  assert.equal(result.reason, "known_patient_active_care");
  assert.equal(result.requestReason, "known_procedure");
  assert.equal(result.automaticAllowed, false);
});

test("active care preserves a surgical-price request for the alert and holding reply", () => {
  const result = applyPatientRelationshipPolicy(
    {
      route: "human_review",
      reason: "surgical_price_review",
      procedure: "lifting_facial",
      automaticAllowed: false,
    },
    {
      found: true,
      relationshipState: "surgical_planning",
      procedureTopic: "Lifting facial",
    },
  );

  assert.equal(result.route, "human_review");
  assert.equal(result.reason, "known_patient_active_care");
  assert.equal(result.requestReason, "surgical_price_review");
  assert.equal(result.procedure, "lifting_facial");
  assert.equal(
    result.patientRelationship.procedureTopic,
    "Lifting facial",
  );
});

test("former patient with a new interest keeps a personalized AI route", () => {
  const result = applyPatientRelationshipPolicy(
    {
      route: "standard_reply",
      reason: "known_procedure",
      procedure: "blefaroplastia",
      automaticAllowed: true,
    },
    {
      found: true,
      state: "former_patient",
    },
  );

  assert.equal(result.route, "standard_reply");
  assert.equal(result.reason, "returning_patient_new_interest");
  assert.equal(result.patientRelationship.state, "former_patient");
});

test("unknown relationship does not change the acquisition plan", () => {
  const plan = {
    route: "standard_reply",
    reason: "known_procedure",
    automaticAllowed: true,
  };
  const result = applyPatientRelationshipPolicy(plan, null);

  assert.equal(result.route, plan.route);
  assert.equal(result.reason, plan.reason);
  assert.deepEqual(
    patientRelationshipPromptContext(result.patientRelationship),
    {
      knownPatient: false,
      state: "unknown",
      label: "histórico não localizado",
      hasPendingHumanTask: false,
    },
  );
});

test("relationship alert is contextual but does not expose clinical history", () => {
  const result = buildRelationshipAlertMessage({
    messageText: "Preciso falar com a Dra.",
    patientName: "Ana Silva",
    relationship: {
      state: "active_postop",
      hasPendingHumanTask: true,
      pendingTaskSummary: "cirurgia e diagnóstico sensível",
    },
  });

  assert.match(result, /acompanhamento pós-operatório/i);
  assert.doesNotMatch(result, /Sugestão para copiar|alinhar esse ponto/i);
  assert.doesNotMatch(result, /diagnóstico sensível/i);
});

test("normalization rejects arbitrary relationship labels", () => {
  assert.equal(
    normalizePatientRelationship({ state: "anything" }).state,
    "unknown",
  );
});

test("human review creates one bounded operational commitment", () => {
  const commitment = buildPatientCommitment({
    eventId: "evt-1",
    phone: "+5511999999999",
    plan: {
      route: "human_review",
      reason: "known_patient_active_postop",
    },
    receivedAt: "2026-07-30T12:00:00.000Z",
  });

  assert.equal(commitment.kind, "care_journey");
  assert.equal(commitment.owner, "Amanda/equipe");
  assert.doesNotMatch(commitment.summary, /diagnóstico|procedimento/i);
});

test("automatic reply does not create a human commitment", () => {
  assert.equal(
    buildPatientCommitment({
      eventId: "evt-2",
      phone: "+5511999999999",
      plan: { route: "standard_reply" },
    }),
    null,
  );
});

test("commercial text cannot create a commitment even after a routing error", () => {
  assert.equal(
    buildPatientCommitment({
      eventId: "evt-commercial",
      phone: "+5511999999999",
      plan: {
        route: "human_review",
        reason: "unsupported_or_empty_message",
      },
      messageText:
        "Trabalho com gestão e otimização do Perfil da Empresa no Google para conquistar clientes.",
    }),
    null,
  );
});
