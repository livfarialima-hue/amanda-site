import assert from "node:assert/strict";
import test from "node:test";
import {
  appendConversationTurn,
  conversationKey,
  readConversationTurns,
  toOpenAIConversation,
} from "./conversation-memory.mjs";

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

test("conversation memory preserves the latest sixteen bilateral turns", async () => {
  const turns = Array.from({ length: 20 }, (_value, index) => ({
    role: index % 2 === 0 ? "assistant" : "user",
    text: `Mensagem ${index + 1}`,
    eventId: `event-${index + 1}`,
    at: `2026-08-13T10:${String(index).padStart(2, "0")}:00.000Z`,
    source: index % 2 === 0 ? "human" : "patient",
  }));
  const blobs = fakeBlobs({
    version: 1,
    updatedAt: "2026-08-13T10:19:00.000Z",
    turns,
  });

  const result = await readConversationTurns(
    "+5511900000000",
    {
      getStoreImpl: blobs.getStoreImpl,
      now: Date.parse("2026-08-13T10:20:00.000Z"),
    },
  );

  assert.equal(result.turns.length, 16);
  assert.equal(result.turns[0].text, "Mensagem 5");
  assert.equal(result.turns[15].text, "Mensagem 20");
  assert.equal(result.turns[0].source, "human");
  assert.equal(result.turns[1].source, "patient");
});
