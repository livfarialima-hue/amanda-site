import assert from "node:assert/strict";
import test from "node:test";

import { coalesceLatestPatientBurst } from "./inbound-burst-context.mjs";
import {
  isRefreshedHumanContextProtected,
  refreshLatestHumanContextInput,
} from "../ycloud-webhook.mjs";
import { decideConversationAction } from "./conversation-action-controller.mjs";
import { prepareSemanticContextContinuationAction } from "./semantic-reply-policy.mjs";
import {
  enrichAutomationPlanFromConversation,
  planAutomation,
} from "./whatsapp-automation.mjs";

const HUMAN_OPENING = {
  role: "assistant",
  source: "equipe_humana",
  text: "O que você gostaria de entender primeiro sobre o procedimento?",
  eventId: "event-human-opening",
  at: "2026-08-22T15:18:24-03:00",
};

test("coalesces rapid patient fragments into one current turn", () => {
  const result = coalesceLatestPatientBurst({
    recentConversation: [
      HUMAN_OPENING,
      {
        role: "patient",
        source: "paciente",
        text: "Como funciona?",
        eventId: "event-part-1",
        at: "2026-08-22T15:44:12-03:00",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Quero entender os valores",
        eventId: "event-part-2",
        at: "2026-08-22T15:44:17-03:00",
      },
    ],
    currentText: "Esses pontos",
    currentEventId: "event-part-3",
    currentAt: "2026-08-22T15:44:24-03:00",
  });

  assert.equal(result.coalesced, true);
  assert.equal(result.burstTurnCount, 3);
  assert.equal(
    result.text,
    "Como funciona?\nQuero entender os valores\nEsses pontos",
  );
  assert.equal(result.recentConversation.length, 1);
  assert.equal(result.recentConversation[0].eventId, HUMAN_OPENING.eventId);
  assert.equal(result.recentConversation[0].source, "equipe_humana");
});

test("does not cross a clinic turn or a quiet-window boundary", () => {
  const interrupted = coalesceLatestPatientBurst({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text: "Primeira pergunta",
        eventId: "event-old",
        at: "2026-08-22T15:43:00-03:00",
      },
      HUMAN_OPENING,
    ],
    currentText: "Nova pergunta",
    currentEventId: "event-new",
    currentAt: "2026-08-22T15:44:24-03:00",
  });
  assert.equal(interrupted.coalesced, false);
  assert.equal(interrupted.text, "Nova pergunta");

  const delayed = coalesceLatestPatientBurst({
    recentConversation: [
      HUMAN_OPENING,
      {
        role: "patient",
        source: "paciente",
        text: "Pergunta anterior",
        eventId: "event-delayed-old",
        at: "2026-08-22T15:43:00-03:00",
      },
    ],
    currentText: "Outra pergunta",
    currentEventId: "event-delayed-new",
    currentAt: "2026-08-22T15:44:24-03:00",
  });
  assert.equal(delayed.coalesced, false);
  assert.equal(delayed.text, "Outra pergunta");
});

test("refreshes the latest takeover candidate from the durable ledger", async () => {
  const result = await refreshLatestHumanContextInput(
    {
      phone: "+5511000000000",
      opportunityId: "opportunity-synthetic",
      professional: "amanda",
      eventId: "event-part-3",
      receivedAt: "2026-08-22T15:44:24-03:00",
      text: "Esses pontos",
      recentConversation: [HUMAN_OPENING],
    },
    {
      getDurableConversationContextImpl: async () => ({
        status: "completed",
        turns: [
          { ...HUMAN_OPENING, source: "human" },
          {
            role: "user",
            source: "patient",
            text: "Como funciona?",
            eventId: "event-part-1",
            at: "2026-08-22T15:44:12-03:00",
          },
          {
            role: "user",
            source: "patient",
            text: "Quero entender os valores",
            eventId: "event-part-2",
            at: "2026-08-22T15:44:17-03:00",
          },
          {
            role: "user",
            source: "patient",
            text: "Esses pontos",
            eventId: "event-part-3",
            at: "2026-08-22T15:44:24-03:00",
          },
        ],
      }),
    },
  );

  assert.equal(result.source, "durable_ledger");
  assert.equal(result.coalesced, true);
  assert.equal(result.burstTurnCount, 3);
  assert.equal(
    result.input.text,
    "Como funciona?\nQuero entender os valores\nEsses pontos",
  );
  assert.equal(result.input.recentConversation.length, 1);
  assert.equal(result.input.recentConversation[0].source, "equipe_humana");
});

test("refreshed burst keeps protected routes and scheduling with the team", () => {
  assert.equal(
    isRefreshedHumanContextProtected(
      {
        route: "standard_reply",
        automaticAllowed: true,
        professional: "amanda",
      },
      "Como funciona e quanto custa?",
    ),
    false,
  );
  assert.equal(
    isRefreshedHumanContextProtected(
      {
        route: "human_review",
        automaticAllowed: false,
        professional: "amanda",
      },
      "Pergunta clínica individual",
    ),
    true,
  );
  assert.equal(
    isRefreshedHumanContextProtected(
      {
        route: "standard_reply",
        automaticAllowed: true,
        professional: "amanda",
      },
      "Pode agendar para amanhã?",
    ),
    true,
  );
});

test("the coalesced cervical information and price turn keeps the approved envelope", () => {
  const text = "Como funciona?\nQuero entender os valores\nEsses pontos";
  const plan = enrichAutomationPlanFromConversation(
    planAutomation({
      text,
      messageType: "text",
      reference: "M26C01W-C07H01",
      platform: "WhatsApp direto",
    }),
    [HUMAN_OPENING],
  );
  const action = prepareSemanticContextContinuationAction(
    decideConversationAction({
      text,
      messageType: "text",
      plan,
      recentConversation: [HUMAN_OPENING],
      humanTakeoverActive: true,
    }),
  );

  assert.equal(plan.reason, "price_initial_information");
  assert.equal(plan.procedure, "lifting_cervical");
  assert.equal(action.replyContract.maxLinks, 1);
  assert.equal(action.replyContract.allowCta, true);
  assert.equal(action.replyContract.allowAppointmentConfirmation, false);
});
