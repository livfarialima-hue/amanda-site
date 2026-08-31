import assert from "node:assert/strict";
import test from "node:test";

import {
  coalesceLatestPatientBurst,
  coalesceUnansweredPatientBlock,
} from "./inbound-burst-context.mjs";
import {
  isRefreshedHumanContextProtected,
  isSchedulingRequestInPatientBlock,
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

test("reconstructs the unanswered flacidez and consultation-price block", () => {
  const result = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text:
          "Posso te orientar sobre cervicoplastia. O que você gostaria de entender primeiro?",
        eventId: "event-opening",
        at: "2026-08-31T12:35:00-03:00",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Boa tarde",
        eventId: "event-greeting",
        at: "2026-08-31T12:40:00-03:00",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Queria entender mais sobre flacidez de papada",
        eventId: "event-flacidez",
        at: "2026-08-31T12:41:00-03:00",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Quero saber tbm se vcs cobram a consulta de avaliação",
        eventId: "event-price",
        at: "2026-08-31T12:43:00-03:00",
      },
    ],
    currentText: "?",
    currentEventId: "event-question-mark",
    currentAt: "2026-08-31T12:43:15-03:00",
  });

  assert.equal(result.coalesced, true);
  assert.equal(result.blockTurnCount, 4);
  assert.equal(result.substantiveRequestCount, 2);
  assert.equal(result.substantiveTurnCount, 2);
  assert.equal(result.multipleRequests, true);
  assert.equal(result.requiresContextualReply, true);
  assert.equal(
    result.text,
    [
      "Boa tarde",
      "Queria entender mais sobre flacidez de papada",
      "Quero saber tbm se vcs cobram a consulta de avaliação",
      "?",
    ].join("\n"),
  );
  assert.equal(result.recentConversation.length, 1);
  assert.equal(result.recentConversation[0].eventId, "event-opening");
});

test("a meaningful patient answer before a new question also requires context", () => {
  const result = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "assistant",
        source: "bruna",
        text: "O que mais chamou sua atenção no pescoço?",
        eventId: "event-context-question",
        at: "2026-08-31T12:40:00-03:00",
      },
      {
        role: "patient",
        source: "paciente",
        text: "Flacidez de papada",
        eventId: "event-context-answer",
        at: "2026-08-31T12:41:00-03:00",
      },
    ],
    currentText: "E vocês cobram a consulta de avaliação?",
    currentEventId: "event-context-price",
    currentAt: "2026-08-31T12:43:00-03:00",
  });

  assert.equal(result.coalesced, true);
  assert.equal(result.substantiveRequestCount, 1);
  assert.equal(result.substantiveTurnCount, 2);
  assert.equal(result.multipleRequests, false);
  assert.equal(result.requiresContextualReply, true);
});

test("unanswered blocks stop at templates, commercial messages and pauses", () => {
  const current = {
    currentText: "Qual é o valor da consulta?",
    currentEventId: "event-current",
    currentAt: "2026-08-31T12:43:00-03:00",
  };
  const templateBoundary = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text: "Olá! Quero saber sobre lifting cervical com a Dra. Amanda.",
        templateId: "procedure_evaluation_v1",
        eventId: "event-template",
        at: "2026-08-31T12:40:00-03:00",
      },
    ],
    ...current,
  });
  assert.equal(templateBoundary.coalesced, false);
  assert.equal(templateBoundary.text, current.currentText);
  assert.equal(templateBoundary.recentConversation.length, 1);

  const commercialBoundary = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text:
          "Sou da Clínica OXY e temos uma novidade com condição especial. Quer que eu envie os valores?",
        eventId: "event-commercial",
        at: "2026-08-31T12:40:00-03:00",
      },
    ],
    ...current,
  });
  assert.equal(commercialBoundary.coalesced, false);
  assert.equal(commercialBoundary.text, current.currentText);

  const pauseBoundary = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text: "Vou pensar com calma e depois volto",
        eventId: "event-pause",
        at: "2026-08-31T12:40:00-03:00",
      },
    ],
    ...current,
  });
  assert.equal(pauseBoundary.coalesced, false);
  assert.equal(pauseBoundary.text, current.currentText);
});

test("unanswered blocks fail closed when timestamps are missing or too old", () => {
  const withoutTimestamp = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text: "Queria entender a flacidez",
        eventId: "event-undated",
      },
    ],
    currentText: "Qual é o valor da consulta?",
    currentEventId: "event-current-undated",
    currentAt: "2026-08-31T12:43:00-03:00",
  });
  assert.equal(withoutTimestamp.coalesced, false);

  const tooOld = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text: "Queria entender a flacidez",
        eventId: "event-old-request",
        at: "2026-08-31T12:30:00-03:00",
      },
    ],
    currentText: "Qual é o valor da consulta?",
    currentEventId: "event-current-old",
    currentAt: "2026-08-31T12:43:00-03:00",
  });
  assert.equal(tooOld.coalesced, false);

  const totalWindowBounded = coalesceUnansweredPatientBlock({
    recentConversation: [
      {
        role: "patient",
        source: "paciente",
        text: "Queria entender a flacidez",
        eventId: "event-total-window-old",
        at: "2026-08-31T12:27:00-03:00",
      },
      {
        role: "patient",
        source: "paciente",
        text: "E como funciona a avaliação?",
        eventId: "event-total-window-middle",
        at: "2026-08-31T12:35:00-03:00",
      },
    ],
    currentText: "Qual é o valor da consulta?",
    currentEventId: "event-total-window-current",
    currentAt: "2026-08-31T12:43:00-03:00",
  });
  assert.equal(totalWindowBounded.coalesced, true);
  assert.equal(totalWindowBounded.blockTurnCount, 2);
  assert.doesNotMatch(totalWindowBounded.text, /Queria entender a flacidez/);
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

test("a scheduling line stays protected even when another line asks consultation price", () => {
  assert.equal(
    isSchedulingRequestInPatientBlock(
      [
        "Quero marcar uma avaliação",
        "Também gostaria de saber o valor da consulta",
      ].join("\n"),
    ),
    true,
  );
  assert.equal(
    isSchedulingRequestInPatientBlock(
      [
        "Boa tarde",
        "Queria entender mais sobre flacidez de papada",
        "Quero saber se vocês cobram a consulta de avaliação",
      ].join("\n"),
    ),
    false,
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
