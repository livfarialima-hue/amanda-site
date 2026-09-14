import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

function sheet(rows = []) {
  return {
    rows,
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map(row => row.length)),
    appendRow: row => rows.push([...row]),
    getRange(r, c, h = 1, w = 1) {
      const getValues = () => Array.from({ length: h }, (_, i) =>
        Array.from({ length: w }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? ""));
      const range = {
        getValues,
        getDisplayValues: () => getValues().map(row => row.map(String)),
        getDisplayValue: () => String(getValues()[0][0]),
        setValues(values) {
          values.forEach((row, i) => row.forEach((value, j) => {
            (rows[r - 1 + i] ||= [])[c - 1 + j] = value;
          }));
          return range;
        },
        setValue(value) { return range.setValues([[value]]); },
        createTextFinder(value) {
          return { matchEntireCell() { return this; }, findNext() {
            const index = getValues().findIndex(row => String(row[0]) === value);
            return index < 0 ? null : { getRow: () => r + index };
          }};
        },
      };
      return range;
    },
  };
}

function fixture() {
  const sheets = new Map();
  const spreadsheet = { getSheetByName: name => sheets.get(name) || null };
  const context = vm.createContext({ Date, console, Set,
    SpreadsheetApp: { openById: () => spreadsheet },
    Utilities: { DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
      computeDigest: (_algorithm, text) => [...createHash("sha256").update(text).digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString("base64url") },
  });
  for (const name of ["Code.gs", "LeadClassification.gs", "Retomadas.gs"]) {
    vm.runInContext(readFileSync(new URL(name, import.meta.url), "utf8"), context);
  }
  const headers = vm.runInContext("({ messages: LEAD_MESSAGE_HEADERS, queue: LEAD_CLASSIFICATION_HEADERS })", context);
  const messages = sheet([[...headers.messages]]);
  const queue = sheet([[...headers.queue]]);
  sheets.set("_WHATSAPP_MENSAGENS", messages);
  sheets.set("_WHATSAPP_CLASSIFICACAO", queue);
  return { context, spreadsheet, messages, queue, sheets };
}

function lead(overrides = {}) {
  return { phone: "+5511900000000", eventId: "synthetic-in", messageId: "synthetic-message",
    text: "Qual o valor da consulta?", contactAt: new Date("2026-09-14T13:00:00Z"),
    opportunityId: "synthetic-op", professional: "amanda", leadSheetName: "Google Ads - Conversões", ...overrides };
}

test("a late OUT invalidates classification without moving activity backward or duplicating a replay", () => {
  const { context: c, spreadsheet, messages, queue } = fixture();
  c.recordLeadMessageAndQueue_(spreadsheet, 2, lead(), "IN");
  queue.rows[1][4] = "done";
  c.recordLeadMessageAndQueue_(spreadsheet, 2, lead({ eventId: "synthetic-out", messageId: "bruna:older",
    text: "Podemos esclarecer suas dúvidas.", contactAt: new Date("2026-09-14T12:00:00Z"), source: "bruna" }), "OUT");
  assert.equal(queue.rows[1][4], "pending");
  assert.equal(queue.rows[1][8], "synthetic-message");
  assert.equal(queue.rows[1][2].toISOString(), "2026-09-14T13:00:00.000Z");
  assert.equal(queue.rows[1][9], 2);
  queue.rows[1][4] = "done";
  c.recordLeadMessageAndQueue_(spreadsheet, 2, lead(), "IN");
  assert.equal(messages.rows.length, 3);
  assert.equal(queue.rows[1][9], 2);
  assert.equal(queue.rows[1][4], "done");
});

test("delayed ledger recovery follows the original event instead of the newest patient opportunity", () => {
  const { context: c, spreadsheet, messages } = fixture();
  c.recordLeadMessageAndQueue_(spreadsheet, 2, lead(), "IN");
  c.localizarOportunidadeMaisRecentePorTelefone_ = () => {
    throw new Error("must not infer a delayed reply's identity from the latest opportunity");
  };
  const input = { phone: lead().phone, eventId: "synthetic-in:bruna", parentEventId: "synthetic-in",
    text: "A consulta custa R$ 500.", at: "2026-09-14T13:01:00Z" };
  assert.equal(c.registrarTurnoConversa_(input).opportunityId, "synthetic-op");
  assert.equal(messages.rows.at(-1)[7], "synthetic-op");
  assert.equal(c.registrarTurnoConversa_({ ...input, opportunityId: "different-patient" }).error, "conversation_identity_conflict");
  assert.equal(c.registrarTurnoConversa_({ ...input, parentEventId: "missing" }).error, "conversation_parent_not_found");
  assert.equal(messages.rows.length, 3);
});

test("media metadata preserves the first twelve columns and changes the history revision", () => {
  const { context: c, spreadsheet, messages, queue } = fixture();
  c.recordLeadMessageAndQueue_(spreadsheet, 2, lead({ text: "", messageType: "image", relatedMessageId: "pix-instructions" }), "IN");
  assert.equal(messages.rows[0][11], "Template ID");
  assert.equal(messages.rows[1][12], "image");
  assert.equal(messages.rows[1][13], "pix-instructions");
  const history = () => c.collectLeadMessagesForOpportunity_(messages, "synthetic-op", lead().phone, "amanda", 24, false);
  const original = c.revisaoHistoricoClassificacao_(history());
  messages.rows[1][12] = "reaction";
  assert.notEqual(c.revisaoHistoricoClassificacao_(history()), original);
  messages.rows[1][12] = "";
  queue.rows[1][4] = "done";
  c.recordLeadMessageAndQueue_(spreadsheet, 2, lead({ text: "", messageType: "image", relatedMessageId: "pix-instructions" }), "IN");
  assert.equal(queue.rows[1][4], "pending");
  assert.equal(queue.rows[1][9], 1);
});

test("an explicit human resolution closes only the selected commitment and keeps the reason", () => {
  const { context: c, sheets } = fixture();
  const commitments = sheet([Array(11).fill("header"),
    ["synthetic-task-a", lead().phone, "Retorno combinado", "", "Equipe", new Date(), new Date(), "Pendente"],
    ["synthetic-task-b", lead().phone, "Cuidado", "", "Equipe", new Date(), new Date(), "Pendente"]]);
  sheets.set("_WHATSAPP_COMPROMISSOS", commitments);
  const result = c.resolverCompromissosPaciente_({ phone: lead().phone, commitmentEventId: "synthetic-task-a",
    resolutionReason: "Equipe confirmou que respondeu à solicitação.", at: "2026-09-14T15:00:00Z" });
  assert.equal(result.resolved, 1);
  assert.equal(commitments.rows[1][7], "Resolvido");
  assert.equal(commitments.rows[2][7], "Pendente");
  assert.match(commitments.rows[1][10], /respondeu/);
});
