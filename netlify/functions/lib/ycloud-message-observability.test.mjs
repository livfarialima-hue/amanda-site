import assert from "node:assert/strict";
import test from "node:test";

import {
  hashYCloudIdentifier,
  normalizeYCloudMessageUpdated,
  normalizeYCloudTemplateEvent,
  readYCloudAcceptance,
} from "./ycloud-message-observability.mjs";

test("normalizes delivered messages into a PII-free final-cost event", () => {
  const result = normalizeYCloudMessageUpdated({
    id: "provider-event-1",
    type: "whatsapp.message.updated",
    createTime: "2026-10-01T14:00:05.000Z",
    whatsappMessage: {
      id: "ycloud-message-1",
      wamid: "wamid.secret-patient-message",
      from: "+5511961957144",
      to: "+5511999999999",
      status: "delivered",
      type: "template",
      externalId: "liv-appointment-consulta-42-24h",
      template: { name: "lembrete_consulta_liv_v1" },
      conversation: { id: "patient-conversation", originType: "utility" },
      pricingCategory: "AUTHENTICATION_INTERNATIONAL",
      pricingModel: "PMP",
      pricingType: "regular",
      totalPrice: 0.0315,
      currency: "BRL",
      regionCode: "BR",
      sendTime: "2026-10-01T14:00:00.000Z",
      deliverTime: "2026-10-01T14:00:04.000Z",
      text: { body: "conteúdo que jamais deve ser persistido" },
      customerProfile: { name: "Maria" },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.messageStatus.status, "delivered");
  assert.equal(result.messageStatus.finalPrice, true);
  assert.equal(result.messageStatus.totalPrice, 0.0315);
  assert.equal(result.messageStatus.currency, "BRL");
  assert.equal(
    result.messageStatus.pricingCategory,
    "authentication_international",
  );
  assert.equal(result.messageStatus.pricingModel, "pmp");
  assert.equal(result.messageStatus.pricingType, "regular");
  assert.equal(result.messageStatus.conversationOrigin, "utility");
  assert.equal(
    result.messageStatus.deliveredAt,
    "2026-10-01T14:00:04.000Z",
  );
  assert.equal(result.messageStatus.purpose, "appointment_reminder");
  assert.match(result.messageStatus.providerMessageKey, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.messageStatus.businessNumberKey, /^sha256:[a-f0-9]{64}$/);

  const serialized = JSON.stringify(result.messageStatus);
  for (const forbidden of [
    "wamid.secret-patient-message",
    "+5511961957144",
    "+5511999999999",
    "patient-conversation",
    "Maria",
    "conteúdo",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("rejects malformed message updates and accepts only final price on delivery", () => {
  assert.deepEqual(
    normalizeYCloudMessageUpdated({
      type: "whatsapp.message.updated",
      whatsappMessage: { id: "message-1", status: "queued" },
    }),
    { ok: false, error: "invalid_message_status" },
  );

  const sent = normalizeYCloudMessageUpdated({
    type: "whatsapp.message.updated",
    whatsappMessage: {
      id: "message-2",
      status: "sent",
      totalPrice: "0.10",
    },
  });
  assert.equal(sent.ok, true);
  assert.equal(sent.messageStatus.totalPrice, 0.1);
  assert.equal(sent.messageStatus.finalPrice, false);
});

test("normalizes template governance events without provider free text", () => {
  const result = normalizeYCloudTemplateEvent({
    id: "template-event-1",
    type: "whatsapp.template.quality_updated",
    createTime: "2026-10-01T10:00:00.000Z",
    whatsappTemplate: {
      name: "retomada_manual_bruna_v1",
      language: "pt_BR",
      category: "marketing",
      status: "paused",
      qualityRating: "red",
      reason: "texto livre do provedor que não deve ser salvo",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.templateEvent.actionRequired, true);
  assert.equal(result.templateEvent.status, "paused");
  assert.equal(result.templateEvent.qualityRating, "red");
  assert.equal(
    JSON.stringify(result.templateEvent).includes("texto livre"),
    false,
  );
});

test("flags a provider FLAGGED review even when the template remains approved", () => {
  const result = normalizeYCloudTemplateEvent({
    id: "template-event-flagged",
    type: "whatsapp.template.reviewed",
    createTime: "2026-10-01T10:00:00.000Z",
    whatsappTemplate: {
      name: "retomada_manual_bruna_v1",
      language: "pt_BR",
      category: "marketing",
      status: "approved",
      statusUpdateEvent: "FLAGGED",
      reason: "provider free text must not leave the webhook",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.templateEvent.status, "approved");
  assert.equal(result.templateEvent.statusUpdateEvent, "flagged");
  assert.equal(result.templateEvent.actionRequired, true);
  assert.equal(JSON.stringify(result).includes("provider free text"), false);
});

test("reads provider acceptance without exposing the raw provider id", async () => {
  const accepted = await readYCloudAcceptance(
    new Response(JSON.stringify({
      id: "raw-provider-id",
      status: "accepted",
      externalId: "liv-reply-event-1",
    }), { status: 200 }),
    { externalId: "liv-reply-fallback" },
  );

  assert.equal(accepted.deliveryState, "accepted_not_delivered");
  assert.equal(accepted.providerStatus, "accepted");
  assert.equal(accepted.externalId, "liv-reply-event-1");
  assert.equal(
    accepted.providerMessageKey,
    hashYCloudIdentifier("raw-provider-id", "ycloud-message"),
  );
  assert.equal(JSON.stringify(accepted).includes("raw-provider-id"), false);

  const unreadable = await readYCloudAcceptance(
    new Response("not-json", { status: 200 }),
    { externalId: "liv-reply-fallback" },
  );
  assert.equal(unreadable.deliveryState, "accepted_not_delivered");
  assert.equal(unreadable.providerMessageKey, "");
  assert.equal(unreadable.externalId, "liv-reply-fallback");
});
