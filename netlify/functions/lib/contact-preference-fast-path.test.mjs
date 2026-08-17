import assert from "node:assert/strict";
import test from "node:test";

import {
  guardAutomaticContactPreference,
  hasFreshPatientRelationship,
  shouldLoadBotKnowledgeContext,
} from "../ycloud-webhook.mjs";

test("a relationship returned by append_lead avoids a second Sheets lookup", async () => {
  let lookupCalls = 0;
  const result = await guardAutomaticContactPreference(
    {
      phone: "+5511900000000",
      fallbackRelationship: {
        lookupStatus: "completed",
        relationshipState: "new_lead",
        neverBotReply: false,
      },
    },
    {
      lookupPatientRelationshipImpl: async () => {
        lookupCalls += 1;
        throw new Error("the verified relationship should be reused");
      },
    },
  );

  assert.equal(lookupCalls, 0);
  assert.equal(result.shouldSend, true);
  assert.equal(result.lookupStatus, "reused_append_lead");
});

test("the fast path keeps the no-bot contact preference fail closed", async () => {
  const result = await guardAutomaticContactPreference(
    {
      phone: "+5511900000000",
      fallbackRelationship: {
        lookupStatus: "completed",
        relationshipState: "known_patient",
        neverBotReply: true,
      },
    },
    {
      lookupPatientRelationshipImpl: async () => {
        throw new Error("the verified relationship should be reused");
      },
    },
  );

  assert.equal(result.shouldSend, false);
  assert.equal(result.status, "blocked_contact_preference");
  assert.equal(result.lookupStatus, "reused_append_lead");
});

test("an unverified fallback still requires the authoritative lookup", async () => {
  let lookupCalls = 0;
  const result = await guardAutomaticContactPreference(
    {
      phone: "+5511900000000",
      fallbackRelationship: {
        lookupStatus: "not_returned",
        relationshipState: "unknown",
      },
    },
    {
      lookupPatientRelationshipImpl: async () => {
        lookupCalls += 1;
        return {
          ok: true,
          relationship: {
            relationshipState: "known_patient",
            neverBotReply: true,
          },
        };
      },
    },
  );

  assert.equal(lookupCalls, 1);
  assert.equal(result.shouldSend, false);
  assert.equal(result.lookupStatus, "completed");
  assert.equal(
    hasFreshPatientRelationship({ lookupStatus: "not_returned" }),
    false,
  );
});

test("a deterministic Meta opening skips the knowledge lookup", () => {
  const base = {
    patientAutomationReady: true,
    humanTakeoverActive: false,
    automationMode: "active",
    messageType: "text",
    automationPlan: { route: "standard_reply" },
    appointmentReviewCandidate: false,
    appointmentNeedsPreference: false,
    professionalFactReview: null,
    approvedPriceReplyCandidate: false,
  };

  assert.equal(
    shouldLoadBotKnowledgeContext({
      ...base,
      deterministicMarketingOpeningCandidate: true,
    }),
    false,
  );
  assert.equal(
    shouldLoadBotKnowledgeContext({
      ...base,
      deterministicMarketingOpeningCandidate: false,
    }),
    true,
  );
});
