import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { getDurableConversationContext } from "../../netlify/functions/lib/conversation-ledger.mjs";

const phone = "+5511900000000";
function fixture({ count = 80, text, human = [], extra = [] } = {}) {
  const rows = Array.from({ length: count }, (_, i) => [phone, i % 2 ? "OUT" : "IN",
    new Date(Date.UTC(2026, 8, 1, 0, i)), `msg-${i}`, `event-${i}`, text || `Texto ${i}`, 2,
    "synthetic-opp", "amanda", "", i % 2 ? "human" : "patient", "", "text", i === 2 ? "msg-1" : ""]);
  rows.push(...extra);
  const sheet = values => ({ getLastRow: () => values.length + 1, getRange: () => ({ getValues: () => values }) });
  const sandbox = { Date, console };
  vm.runInNewContext(fs.readFileSync(new URL("./Code.gs", import.meta.url), "utf8") + "\n" +
    fs.readFileSync(new URL("./LeadClassification.gs", import.meta.url), "utf8"), sandbox);
  sandbox.SpreadsheetApp = { openById: () => ({ getSheetByName: name => name === "_LEAD_MESSAGES" ? sheet(rows) : sheet(human) }) };
  // Read the configured name instead of assuming the private ledger's title.
  vm.runInNewContext("globalThis.messageSheetName = CONFIG.messageSheetName", sandbox);
  sandbox.SpreadsheetApp = { openById: () => ({ getSheetByName: name => name === sandbox.messageSheetName ? sheet(rows) : sheet(human) }) };
  return { sandbox, read: input => sandbox.obterContextoConversa_({ phone, opportunityId: "synthetic-opp", professional: "amanda", historyMode: "full", ...input }), rows };
}

test("full ledger history retains all 80 turns, long middle text, dates, authorship and quotation IDs", () => {
  const { read, rows } = fixture();
  rows[1][5] = "Início. " + "antes ".repeat(300) + "CORREÇÃO CENTRAL" + " depois".repeat(300);
  const result = read();
  assert.equal(result.ok, true);
  assert.equal(result.turns.length, 80);
  assert.equal(result.coverage.omittedTurns, 0);
  assert.equal(result.turns[1].text, rows[1][5]);
  assert.equal(result.turns[1].source, "human");
  assert.equal(result.turns[2].relatedMessageId, "msg-1");
  assert.equal(result.turns[0].at, rows[0][2].toISOString());
});

test("full history rejects ambiguous identity and excludes other professionals and unlinked takeovers", () => {
  const { read, rows } = fixture({ human: [["unlinked", "human-other", phone, new Date(), "", "Tarefa de outra equipe"]],
    extra: [[phone, "OUT", new Date(), "other", "other", "Segredo cardiologia", 3, "daniel-opp", "daniel", "", "human"]] });
  const result = read();
  assert.equal(result.turns.length, 80);
  assert.equal(result.coverage.excludedUnlinkedHumanTurns, 1);
  assert.doesNotMatch(JSON.stringify(result), /Segredo cardiologia|Tarefa de outra equipe/);
  assert.equal(read({ opportunityId: "" }).ok, false);
  assert.equal(read({ professional: "daniel" }).ok, false);
  assert.equal(read({ phone: "+5511900000001" }).ok, false);
  rows[1][10] = "";
  assert.equal(read().turns[1].source, "unknown");
});

test("full ledger budgets serialized data and reports the omitted middle without sheet writes", () => {
  const { read } = fixture({ count: 200, text: '"\\\n'.repeat(200) });
  const result = read();
  assert.ok(JSON.stringify(result).length < 200000);
  assert.ok(result.coverage.omittedTurns > 0);
  assert.equal(result.turns[0].eventId, "event-0");
  assert.equal(result.turns.at(-1).eventId, "event-199");
});

test("unassigned legacy messages and unconfirmed professionals cannot enter a full scoped transcript", () => {
  const { read, rows } = fixture({ extra: [[phone, "OUT", new Date("2026-01-01"), "legacy", "legacy", "Outra pessoa atendida", 1, "", "", "", "human"]] });
  const result = read();
  assert.equal(result.turns.length, 80);
  assert.equal(result.coverage.excludedUnlinkedLedgerTurns, 1);
  assert.doesNotMatch(JSON.stringify(result), /Outra pessoa/);
  for (const row of rows) if (row[7] === "synthetic-opp") row[8] = "unknown";
  assert.equal(read().ok, false);
  assert.equal(read({ professional: "daniel" }).ok, false);
});

test("future inbound messages preserve text beyond 4000 characters without rewriting legacy transcripts", () => {
  const { sandbox } = fixture();
  const text = "Contexto completo. ".repeat(350) + "PERGUNTA FINAL";
  const lead = sandbox.normalizeLead_({ phone, eventId: "long", messageId: "long", contactAt: "2026-10-13T17:00:00Z", text, messageType: "text" });
  assert.equal(lead.text, text);
  let row;
  const sheet = { appendRow: next => { row = next; }, getRange: (_r, col, _h = 1, width = 1) => ({
    getValues: () => [row.slice(col - 1, col - 1 + width)], getDisplayValue: () => String(row[col - 1] || ""),
    setValue: () => { throw new Error("Unexpected rewrite"); }, setValues: () => { throw new Error("Unexpected rewrite"); },
  }) };
  sandbox.getOrCreateLeadAuxiliarySheet_ = () => sheet;
  sandbox.findMessageRowInSheet_ = () => row ? 2 : null;
  assert.equal(sandbox.recordLeadMessageOnly_({}, "", lead, "IN").created, true);
  assert.equal(row[5], text);
  assert.equal(sandbox.recordLeadMessageOnly_({}, "", lead, "IN").created, false);
  row[5] = text.slice(0, 4000);
  assert.equal(sandbox.recordLeadMessageOnly_({}, "", lead, "IN").created, false);
  assert.equal(row[5], text.slice(0, 4000));
});

test("linked human evidence restores missing text and authorship before full-history deduplication", () => {
  const { read, rows } = fixture({ human: [["event-1", "msg-1", phone, new Date(Date.UTC(2026, 8, 1, 0, 1)), "", "Correção humana integral confirmada"]] });
  rows[1][10] = ""; rows[1][5] = ""; rows[1][12] = "audio"; rows[1][13] = "quoted-earlier";
  const result = read();
  assert.equal(result.turns.length, 80);
  assert.equal(result.turns[1].source, "human");
  assert.equal(result.turns[1].text, "Correção humana integral confirmada");
  assert.equal(result.turns[1].messageType, "audio");
  assert.equal(result.turns[1].relatedMessageId, "quoted-earlier");
  assert.equal(rows[1][5], "", "read-only enrichment must not rewrite the ledger");
});

test("history reports partial text after ingress saturation, including emoji, formula escaping and legacy caps", () => {
  const { read, rows, sandbox } = fixture({ count: 1 });
  for (const text of ["a".repeat(35000), "😀".repeat(20000), "=" + "a".repeat(35000)]) {
    const lead = sandbox.normalizeLead_({ phone, eventId: "long", messageId: "long", text });
    rows[0][5] = sandbox.safeText_(lead.text, 32768);
    assert.equal(read().turns[0].textTruncated, true);
  }
  for (const text of ["a".repeat(4000), "'=" + "a".repeat(3999)]) {
    rows[0][5] = text;
    assert.equal(read().turns[0].textTruncated, true);
  }
  rows[0][5] = "a".repeat(3999);
  assert.equal(read().turns[0].textTruncated, false);
});

test("the full ledger client preserves the DTO and rejects old servers or identity mismatch", async () => {
  const { read } = fixture();
  const identity = { phone, opportunityId: "synthetic-opp", professional: "amanda", historyMode: "full" };
  let request;
  const result = await getDurableConversationContext(identity, { callSheetsImpl: async (action, payload, options) => {
    request = { action, payload, options }; return { status: "completed", data: read() };
  } });
  assert.equal(result.turns.length, 80);
  assert.equal(request.payload.conversation.historyMode, "full");
  assert.equal(request.options.timeoutMs, 6000);
  for (const overrides of [{ historyMode: undefined }, { opportunityId: "wrong" }, { professional: "daniel" }]) {
    const invalid = await getDurableConversationContext(identity, { callSheetsImpl: async () => ({ status: "completed", data: { ...read(), ...overrides } }) });
    assert.equal(invalid.status, "failed");
    assert.deepEqual(invalid.turns, []);
  }
  const noIdentity = await getDurableConversationContext({ phone, historyMode: "full" }, { callSheetsImpl: () => { throw new Error("Must not look up latest by phone"); } });
  assert.equal(noIdentity.errorCode, "full_history_identity_required");
});
