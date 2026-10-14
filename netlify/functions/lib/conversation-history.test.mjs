import test from "node:test";
import assert from "node:assert/strict";
import { buildFullConversationContext, FULL_CONVERSATION_CHARACTER_BUDGET } from "./conversation-history.mjs";

const turn = (index, overrides = {}) => ({ role: index % 2 ? "assistant" : "user", source: index % 2 ? "human" : "patient",
  text: `Mensagem sintética ${index}`, eventId: `synthetic-${index}`, at: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(), ...overrides });
const full = turns => ({ status: "completed", historyMode: "full", turns, coverage: { availableTurns: turns.length, omittedTurns: 0 } });

test("full history retains opening, middle and human corrections beyond 32 turns and seven days", () => {
  const turns = Array.from({ length: 90 }, (_, i) => turn(i));
  turns[1].text = "Pode me chamar de Helena. " + "Contexto. ".repeat(140) + "CORREÇÃO NO MEIO. " + "Detalhe. ".repeat(140);
  const recent = turn(90, { source: "human", role: "assistant", text: "Correção mais recente da equipe", at: "2026-10-13T17:00:00Z" });
  const result = buildFullConversationContext(full(turns), [recent]);
  assert.equal(result.turns.length, 91);
  assert.equal(result.turns[1].text, turns[1].text.trim());
  assert.equal(result.turns.at(-1).text, recent.text);
  assert.equal(result.coverage.status, "all_available");
  assert.equal(result.coverage.providerHistoryMayBeIncomplete, true);
});

test("short cache copies cannot erase full text, quote IDs, authorship or audio provenance", () => {
  const original = turn(1, { text: "Texto completo. ".repeat(200), messageId: "wamid-1", relatedMessageId: "wamid-0", messageType: "audio" });
  const result = buildFullConversationContext(full([original]), [turn(1, { text: "Texto completo. …", source: "human" })]);
  assert.equal(result.turns.length, 1);
  assert.equal(result.turns[0].text, original.text.trim());
  assert.equal(result.turns[0].relatedMessageId, "wamid-0");
  assert.equal(result.turns[0].source, "equipe_humana");
  assert.equal(result.turns[0].messageType, "audio");
});

test("uncertain audio content is not supplied as a confirmed fact and unknown authorship stays unknown", () => {
  const result = buildFullConversationContext(full([
    turn(1, { source: "unknown", text: "Uma mensagem da clínica" }),
    turn(2, { text: "[Transcrição incerta de áudio] Confirmo consulta terça às nove" }),
  ]));
  assert.equal(result.turns[0].source, "clinica_autoria_desconhecida");
  assert.equal(result.turns[1].messageType, "audio");
  assert.doesNotMatch(result.turns[1].text, /terça/);
});

test("actual serialized budget preserves opening and newest messages and declares omitted middle", () => {
  const turns = Array.from({ length: 170 }, (_, i) => turn(i, { text: '"\\\n'.repeat(250) + i }));
  const result = buildFullConversationContext(full(turns));
  assert.ok(JSON.stringify(result.turns).length <= FULL_CONVERSATION_CHARACTER_BUDGET);
  assert.equal(result.turns[0].eventId, turns[0].eventId);
  assert.equal(result.turns.at(-1).eventId, turns.at(-1).eventId);
  assert.equal(result.coverage.status, "partial");
  assert.equal(result.coverage.omittedTurns, turns.length - result.turns.length);
});

test("missing source and oversized individual text are explicitly partial", () => {
  const unavailable = buildFullConversationContext({ status: "failed", errorCode: "timeout" }, [turn(1)]);
  assert.equal(unavailable.coverage.status, "partial");
  assert.equal(unavailable.coverage.reason, "timeout");
  const oversized = buildFullConversationContext(full([turn(1, { text: "x".repeat(40000) })]));
  assert.equal(oversized.coverage.truncatedTurns, 1);
  assert.equal(oversized.coverage.status, "partial");
});

test("a late transcript replaces a pending placeholder but a stale placeholder never replaces real text", () => {
  const pending = turn(2, { text: "[Áudio de conteúdo não confirmado; aguardar atendimento humano.]", messageType: "audio" });
  const confirmed = turn(2, { text: "[Transcrição de áudio] Qual é o endereço?", messageType: "audio" });
  for (const [ledger, cache] of [[pending, confirmed], [confirmed, pending]]) {
    const result = buildFullConversationContext(full([ledger]), [cache]);
    assert.equal(result.turns.length, 1);
    assert.equal(result.turns[0].text, confirmed.text);
  }
});

test("late text enrichment preserves ledger metadata and deduplicates event aliases of the same message", () => {
  const ledger = turn(1, { text: "Texto curto", messageId: "wamid-1", relatedMessageId: "quoted-1", source: "human" });
  const alias = { ...ledger, eventId: "alias-event" };
  const cache = turn(1, { text: "Texto completo recuperado depois", source: "unknown" });
  const result = buildFullConversationContext(full([ledger, alias]), [cache]);
  assert.equal(result.turns.length, 1);
  assert.equal(result.turns[0].messageId, "wamid-1");
  assert.equal(result.turns[0].relatedMessageId, "quoted-1");
  assert.equal(result.turns[0].source, "equipe_humana");
  assert.equal(result.turns[0].text, cache.text);
});

test("recent cache truncation remains explicit until the complete ledger text becomes available", () => {
  const recent = turn(4, { text: "Abertura … Correção humana no fim", source: "human", role: "assistant" });
  const pending = buildFullConversationContext(full([turn(1)]), [recent]);
  assert.equal(pending.coverage.status, "partial");
  assert.equal(pending.coverage.truncatedTurns, 1);
  const recovered = buildFullConversationContext(full([turn(1), { ...recent, text: "Abertura " + "mensagem integral ".repeat(50) + "Correção humana no fim" }]), [recent]);
  assert.equal(recovered.coverage.status, "all_available");
  assert.equal(recovered.coverage.truncatedTurns, 0);
});
