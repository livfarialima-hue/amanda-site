import assert from "node:assert/strict";
import test from "node:test";
import {
  processInboundRecoveryJob,
} from "../ycloud-recovery.mjs";

test("recovery remains pending until the lead reaches Sheets", async () => {
  let completed = false;
  let rescheduled = false;

  const result = await processInboundRecoveryJob(
    {
      eventId: "fallback-event",
      phone: "+5511976360209",
      attempts: 1,
      rawBody: "{}",
      signature: "signature",
      contentType: "application/json",
      origin: "https://example.test",
      queueKey: "pending/fallback-event",
      claimToken: "claim-token",
    },
    {
      getLatestInboundReplyMarkerImpl: async () => ({
        status: "completed",
        found: true,
        eventId: "fallback-event",
      }),
      processImpl: async () =>
        new Response(
          JSON.stringify({
            received: true,
            leadRecorded: false,
            degradedMode: "sheets_delivery_fallback",
            aiActiveStatus: "completed",
          }),
          { status: 200 },
        ),
      completeInboundRecoveryImpl: async () => {
        completed = true;
        return { status: "completed" };
      },
      rescheduleInboundRecoveryImpl: async () => {
        rescheduled = true;
        return { status: "completed" };
      },
      sendYCloudReviewAlertImpl: async () => ({
        status: "completed",
      }),
      sendReviewAlertEmailCopyImpl: async () => ({
        status: "completed",
      }),
    },
  );

  assert.equal(result.status, "rescheduled");
  assert.equal(completed, false);
  assert.equal(rescheduled, true);
});

test("final lead failure is completed only after the email is confirmed", async () => {
  let completedOutcome = "";
  let rescheduled = false;
  let capturedEmail = null;

  const result = await processInboundRecoveryJob(
    {
      eventId: "final-fallback-event",
      phone: "+5511976360209",
      attempts: 3,
      rawBody: JSON.stringify({
        whatsappInboundMessage: {
          from: "+5511976360209",
          to: "+5511961957144",
          customerProfile: { name: "Marisa" },
          text: { body: "Quero referências" },
        },
      }),
      signature: "signature",
      contentType: "application/json",
      origin: "https://example.test",
      queueKey: "pending/final-fallback-event",
      claimToken: "claim-token",
    },
    {
      getLatestInboundReplyMarkerImpl: async () => ({
        status: "completed",
        found: true,
        eventId: "final-fallback-event",
      }),
      processImpl: async () =>
        new Response(
          JSON.stringify({
            received: true,
            leadRecorded: false,
            aiActiveStatus: "completed",
          }),
          { status: 200 },
        ),
      completeInboundRecoveryImpl: async (_job, { outcome }) => {
        completedOutcome = outcome;
        return { status: "completed" };
      },
      rescheduleInboundRecoveryImpl: async () => {
        rescheduled = true;
        return { status: "completed" };
      },
      sendReviewAlertEmailCopyImpl: async (input) => {
        capturedEmail = input;
        return { status: "completed" };
      },
      sendYCloudReviewAlertImpl: async () => ({
        status: "completed",
      }),
    },
  );

  assert.equal(result.status, "alerted");
  assert.equal(result.emailStatus, "completed");
  assert.equal(rescheduled, false);
  assert.equal(
    completedOutcome,
    "human_alerted_by_email_after_lead_failure",
  );
  assert.equal(capturedEmail.patientName, "Marisa");
  assert.equal(capturedEmail.patientPhone, "+5511976360209");
  assert.match(capturedEmail.messageText, /planilha LEADS/i);
  assert.match(capturedEmail.messageText, /cadastrar o contato manualmente/i);
});

test("failed email keeps the missing lead in the retry queue", async () => {
  let completed = false;
  let rescheduled = false;

  const result = await processInboundRecoveryJob(
    {
      eventId: "email-failed-event",
      phone: "+5511976360209",
      attempts: 3,
      rawBody: "{}",
      signature: "signature",
      contentType: "application/json",
      origin: "https://example.test",
      queueKey: "pending/email-failed-event",
      claimToken: "claim-token",
    },
    {
      getLatestInboundReplyMarkerImpl: async () => ({
        status: "completed",
        found: true,
        eventId: "email-failed-event",
      }),
      processImpl: async () =>
        new Response(
          JSON.stringify({
            received: true,
            leadRecorded: false,
            aiActiveStatus: "completed",
          }),
          { status: 200 },
        ),
      completeInboundRecoveryImpl: async () => {
        completed = true;
        return { status: "completed" };
      },
      rescheduleInboundRecoveryImpl: async () => {
        rescheduled = true;
        return { status: "completed" };
      },
      sendReviewAlertEmailCopyImpl: async () => ({
        status: "failed",
        errorCode: "email_timeout",
      }),
      sendYCloudReviewAlertImpl: async () => ({
        status: "completed",
      }),
    },
  );

  assert.equal(result.status, "alert_failed_rescheduled");
  assert.equal(result.emailStatus, "failed");
  assert.equal(completed, false);
  assert.equal(rescheduled, true);
});
