import assert from "node:assert/strict";
import test from "node:test";
import {
  appendConversationTurn,
  conversationKey,
  hydrateConversationMemory,
  readConversationTurns,
  toOpenAIConversation,
  updateConversationSemanticState,
} from "./conversation-memory.mjs";
import {
  hasUnresolvedPatientRequest,
} from "./conversation-action-controller.mjs";

function fakeBlobs(initialValue = null) {
  let value = initialValue;

  return {
    getStoreImpl: () => ({
      get: async () => value,
      setJSON: async (_key, nextValue) => {
        value = nextValue;
        return { modified: true, etag: "test" };
      },
    }),
    value: () => value,
  };
}

test("conversation key is stable and omits the phone", () => {
  const phone = "+5511961957144";
  const key = conversationKey(phone);

  assert.equal(key, conversationKey(phone));
  assert.equal(key.includes(phone), false);
  assert.match(key, /^[a-f0-9]{64}$/);
});

test("reads recent conversation turns without changing them", async () => {
  const blobs = fakeBlobs({
    version: 1,
    updatedAt: "2026-08-03T15:00:00.000Z",
    turns: [
      {
        role: "assistant",
        text: "Agendamento confirmado. Médico: Dr. Henrique Lane Staniak. Data: 05/08/2026. Horário: 15h.",
        eventId: "appointment",
        at: "2026-08-03T15:00:00.000Z",
        source: "human",
      },
    ],
  });
  const result = await readConversationTurns(
    "+5511900000000",
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-03T15:01:00.000Z"),
    },
  );

  assert.equal(result.status, "completed");
  assert.equal(result.turns.length, 1);
  assert.match(result.turns[0].text, /Henrique Lane Staniak/);
});

test("a patient turn returns the previous history and persists safely", async () => {
  const blobs = fakeBlobs();
  const result = await appendConversationTurn(
    {
      phone: "+5511900000000",
      role: "user",
      text: " Quero saber sobre blefaroplastia ",
      eventId: "event-1",
      at: "2026-07-26T20:00:00.000Z",
      source: "patient",
      templateId: "procedure_evaluation_v1",
    },
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-07-26T20:00:01.000Z"),
    },
  );

  assert.equal(result.status, "completed");
  assert.deepEqual(result.historyBefore, []);
  assert.equal(result.historyAfter.length, 1);
  assert.equal(
    blobs.value().turns[0].text,
    "Quero saber sobre blefaroplastia",
  );
  assert.equal(
    blobs.value().turns[0].templateId,
    "procedure_evaluation_v1",
  );
});

test("the same event is not added twice", async () => {
  const blobs = fakeBlobs();
  const input = {
    phone: "+5511900000000",
    role: "user",
    text: "Superior",
    eventId: "event-2",
  };

  await appendConversationTurn(input, {
    getStoreImpl: blobs.getStoreImpl,
    now: Date.parse("2026-07-26T20:00:00.000Z"),
  });
  const duplicate = await appendConversationTurn(input, {
    getStoreImpl: blobs.getStoreImpl,
    now: Date.parse("2026-07-26T20:00:02.000Z"),
  });

  assert.equal(duplicate.status, "duplicate");
  assert.equal(blobs.value().turns.length, 1);
});

test("out-of-order human echoes are stored by provider time before a short patient answer", async () => {
  const blobs = fakeBlobs();
  const phone = "+5511900000000";

  await appendConversationTurn(
    {
      phone,
      role: "assistant",
      source: "human",
      text: "Você gostaria de saber mais sobre a consulta?",
      eventId: "human-question",
      at: "2026-08-27T15:10:08.000Z",
    },
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-27T15:10:34.000Z"),
    },
  );
  await appendConversationTurn(
    {
      phone,
      role: "assistant",
      source: "human",
      text: "Na consulta, a Dra. Amanda avalia qual tratamento faz sentido.",
      eventId: "human-explanation",
      at: "2026-08-27T15:09:50.000Z",
    },
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-27T15:10:52.000Z"),
    },
  );
  const patientTurn = await appendConversationTurn(
    {
      phone,
      role: "user",
      source: "patient",
      text: "Sim",
      eventId: "patient-yes",
      at: "2026-08-27T15:12:52.000Z",
    },
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-27T15:13:40.000Z"),
    },
  );

  assert.deepEqual(
    patientTurn.historyAfter.map((turn) => turn.eventId),
    ["human-explanation", "human-question", "patient-yes"],
  );
  assert.equal(
    hasUnresolvedPatientRequest(
      "Sim",
      toOpenAIConversation(patientTurn.historyBefore),
    ),
    true,
  );
});

test("reading an already inverted cache restores chronological order", async () => {
  const blobs = fakeBlobs({
    version: 2,
    updatedAt: "2026-08-27T15:13:40.000Z",
    turns: [
      {
        role: "assistant",
        source: "human",
        text: "Você gostaria de saber mais sobre a consulta?",
        eventId: "human-question",
        at: "2026-08-27T15:10:08.000Z",
      },
      {
        role: "assistant",
        source: "human",
        text: "Na consulta, a Dra. Amanda avalia qual tratamento faz sentido.",
        eventId: "human-explanation",
        at: "2026-08-27T15:09:50.000Z",
      },
    ],
    semanticState: null,
  });

  const result = await readConversationTurns(
    "+5511900000000",
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-27T15:14:00.000Z"),
    },
  );

  assert.deepEqual(
    result.turns.map((turn) => turn.eventId),
    ["human-explanation", "human-question"],
  );
});

test("expired history is discarded", async () => {
  const blobs = fakeBlobs({
    version: 1,
    updatedAt: "2026-07-01T00:00:00.000Z",
    turns: [
      {
        role: "assistant",
        text: "Mensagem antiga",
        eventId: "old",
        at: "2026-07-01T00:00:00.000Z",
        source: "bruna",
      },
    ],
  });
  const result = await appendConversationTurn(
    {
      phone: "+5511900000000",
      role: "user",
      text: "Olá novamente",
      eventId: "new",
    },
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-07-26T20:00:00.000Z"),
    },
  );

  assert.deepEqual(result.historyBefore, []);
  assert.equal(result.expired, true);
  assert.equal(blobs.value().turns.length, 1);
});

test("OpenAI receives only the bounded conversational fields", () => {
  const result = toOpenAIConversation([
    {
      role: "assistant",
      text: "Como posso te chamar?",
      source: "bruna",
    },
    {
      role: "user",
      text: "Maria",
      source: "patient",
    },
  ]);

  assert.deepEqual(result, [
    {
      role: "assistant",
      text: "Como posso te chamar?",
      source: "bruna",
    },
    {
      role: "patient",
      text: "Maria",
      source: "paciente",
    },
  ]);
});

test("conversation memory preserves the latest thirty-two bilateral turns", async () => {
  const turns = Array.from({ length: 40 }, (_value, index) => ({
    role: index % 2 === 0 ? "assistant" : "user",
    text: `Mensagem ${index + 1}`,
    eventId: `event-${index + 1}`,
    at: new Date(Date.parse("2026-08-13T10:00:00.000Z") + index * 60_000).toISOString(),
    source: index % 2 === 0 ? "human" : "patient",
  }));
  const blobs = fakeBlobs({
    version: 1,
    updatedAt: "2026-08-13T10:39:00.000Z",
    turns,
  });

  const result = await readConversationTurns(
    "+5511900000000",
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-13T10:40:00.000Z"),
    },
  );

  assert.equal(result.turns.length, 32);
  assert.equal(result.turns[0].text, "Mensagem 9");
  assert.equal(result.turns[31].text, "Mensagem 40");
  assert.equal(result.turns[0].source, "human");
  assert.equal(result.turns[1].source, "patient");
});

test("OpenAI truncation preserves the beginning and a question at the end", () => {
  const longText = `CONTEXTO ${"x".repeat(1_500)} A pergunta real está aqui?`;
  const [turn] = toOpenAIConversation([{
    role: "user",
    source: "patient",
    eventId: "event-long",
    text: longText,
  }]);

  assert.equal(Array.from(turn.text).length, 1_200);
  assert.match(turn.text, /^CONTEXTO/);
  assert.match(turn.text, /A pergunta real está aqui\?$/);
  assert.equal(turn.eventId, "event-long");
});

test("durable hydration merges event ids and keeps the current cache turn", async () => {
  const blobs = fakeBlobs({
    version: 2,
    updatedAt: "2026-08-18T18:02:00.000Z",
    turns: [{
      role: "user",
      source: "patient",
      text: "Sim",
      eventId: "patient-current",
      at: "2026-08-18T18:02:00.000Z",
    }],
    semanticState: null,
  });
  const result = await hydrateConversationMemory(
    {
      phone: "+5511900000000",
      turns: [
        {
          role: "assistant",
          source: "human",
          text: "Posso te explicar como funciona a consulta.",
          eventId: "human-offer",
          at: "2026-08-18T18:01:00.000Z",
        },
        {
          role: "user",
          source: "patient",
          text: "Sim",
          eventId: "patient-current",
          at: "2026-08-18T18:02:00.000Z",
        },
      ],
    },
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-18T18:02:01.000Z"),
    },
  );

  assert.equal(result.status, "completed");
  assert.deepEqual(
    result.historyAfter.map((turn) => turn.eventId),
    ["human-offer", "patient-current"],
  );
});

test("semantic conversation state survives later turn appends", async () => {
  const blobs = fakeBlobs();
  const state = {
    activeTopic: "consulta",
    patientAct: "acceptance",
    refersToEventId: "human-offer",
    lastClinicQuestion: "",
    lastClinicOffer: "Posso te explicar como funciona a consulta.",
    unresolvedQuestions: ["como funciona a consulta"],
    factsAlreadyProvided: [],
    owner: "bruna",
    nextExpectedAction: "explicar a consulta",
    ambiguity: "",
    contextConfidence: "high",
  };
  const updated = await updateConversationSemanticState(
    { phone: "+5511900000000", semanticState: state },
    { getStoreImpl: blobs.getStoreImpl, now: Date.parse("2026-08-18T18:00:00Z") },
  );
  const appended = await appendConversationTurn(
    {
      phone: "+5511900000000",
      role: "assistant",
      source: "bruna",
      text: "Na consulta, a Dra. Amanda entende seus objetivos.",
      eventId: "reply-1",
    },
    { getStoreImpl: blobs.getStoreImpl, now: Date.parse("2026-08-18T18:00:01Z") },
  );

  assert.equal(updated.status, "completed");
  assert.equal(appended.semanticState.refersToEventId, "human-offer");
  assert.equal(blobs.value().version, 2);
});
