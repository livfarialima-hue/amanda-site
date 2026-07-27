import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPatientReply,
  shouldSendAutomaticPatientReply,
  shouldSendOpenAIPatientReply,
} from "./patient-replies.mjs";

test("builds a natural routing greeting without internal codes", () => {
  const reply = buildPatientReply({
    replyCode: "ORG-DIR-01",
    patientName: "Maria Silva",
  });

  assert.match(reply, /^Olá, Maria!/);
  assert.match(reply, /Dra\. Amanda/);
  assert.match(reply, /Dr\. Daniel/);
  assert.doesNotMatch(reply, /ORG-DIR-01/);
});

test("never includes a surgical price in the price reply", () => {
  const reply = buildPatientReply({
    replyCode: "P-PRECO-01",
    patientName: "Maria",
    procedure: "blefaroplastia",
  });

  assert.match(reply, /avaliação individual/);
  assert.doesNotMatch(reply, /R\$/);
});

test("blocks automatic sending for schedules, takeover and shadow mode", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      replyCode: "G-BLEF-01",
      automaticAllowed: true,
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
    reviewAlertConfigured: true,
  };

  assert.equal(shouldSendAutomaticPatientReply(base), true);
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      humanTakeoverToday: true,
    }),
    false,
  );
  assert.equal(
    shouldSendAutomaticPatientReply({
      ...base,
      mode: "shadow",
    }),
    false,
  );
});

test("Daniel greeting requires the internal review alert configuration", () => {
  const plan = {
    route: "daniel_greeting_and_alert",
    replyCode: "DANIEL-ENC-01",
    automaticAllowed: true,
  };

  assert.equal(
    shouldSendAutomaticPatientReply({
      mode: "active",
      plan,
      humanTakeoverToday: false,
      exactDuplicate: false,
      schedulingRequest: false,
      reviewAlertConfigured: false,
    }),
    false,
  );
});

test("active AI reply requires a high-confidence explicit authorization", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Olá! Posso te explicar como funciona a avaliação?",
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
  };

  assert.equal(shouldSendOpenAIPatientReply(base), true);
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        confidence: "medium",
      },
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      decision: {
        ...base.decision,
        automaticAllowed: false,
        route: "human_review",
        suggestedReply: "",
      },
    }),
    false,
  );
});

test("active AI reply remains blocked for schedules and deterministic review", () => {
  const base = {
    mode: "active",
    plan: {
      route: "standard_reply",
      automaticAllowed: true,
    },
    decision: {
      route: "standard_reply",
      confidence: "high",
      automaticAllowed: true,
      urgent: false,
      suggestedReply: "Resposta autorizada.",
    },
    humanTakeoverToday: false,
    exactDuplicate: false,
    schedulingRequest: false,
  };

  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      schedulingRequest: true,
    }),
    false,
  );
  assert.equal(
    shouldSendOpenAIPatientReply({
      ...base,
      plan: {
        route: "human_review",
        automaticAllowed: false,
      },
    }),
    false,
  );
});
