import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { archiveConversationBatch } from "../../netlify/functions/conversation-archive.mjs";

const headers = ["Telefone", "Direção", "Data e hora", "Message ID", "Event ID", "Texto", "Linha do lead", "Opportunity ID", "Profissional", "Aba do lead", "Origem", "Template ID", "Tipo de mensagem", "Message ID relacionado"];
const startAt = "2026-10-13T23:25:00.000Z";
function harness() {
  const data = [headers, ["+5511900000000", "IN", "2026-10-12T10:00:00Z", "old", "old", "Anterior", "", "", "", "", "paciente", "", "text", ""],
    ["+5511900000000", "IN", "2026-10-13T23:26:00Z", "new", "new", "[Transcrição automática de áudio] Qual o endereço?", "", "", "", "", "paciente", "", "audio", ""],
    ["+5511900000000", "OUT", "2026-10-13T23:27:00Z", "reply", "reply", "Resposta da equipe", "", "", "", "", "equipe_humana", "", "text", ""]];
  const properties = new Map(), files = new Map(); let serial = 0;
  const state = { folderAccess: "PRIVATE", corruptReadback: false, failState: false, locked: false, data, files, properties };
  const folder = { getId: () => "synthetic-private-folder", isTrashed: () => false, getSharingAccess: () => state.folderAccess,
    getFilesByName: name => { let consumed = false; return { hasNext: () => !consumed && files.has(name), next: () => { consumed = true; return files.get(name); } }; },
    createFile: (name, content, mime) => {
      assert.equal(state.locked, false, "Drive I/O must not block patient writes");
      assert.equal(mime, "text/plain");
      const file = { getId: () => `file-${++serial}`, isTrashed: () => false, getSharingAccess: () => "PRIVATE",
        getBlob: () => ({ getDataAsString: () => state.corruptReadback ? "corrupt" : content }), content };
      files.set(name, file); return file;
    } };
  const sheet = { getLastRow: () => data.length,
    getRange: (row, column, count, width) => ({ getValues: () => data.slice(row - 1, row - 1 + count).map(r => r.slice(column - 1, column - 1 + width)) }) };
  const context = vm.createContext({ Date, console, CONFIG: { spreadsheetId: "synthetic-sheet", messageSheetName: "_WHATSAPP_MENSAGENS" }, LEAD_MESSAGE_HEADERS: headers,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) }, DriveApp: { Access: { PRIVATE: "PRIVATE" }, getFolderById: () => folder },
    LockService: { getScriptLock: () => ({ tryLock: () => { state.locked = true; return true; }, releaseLock: () => { state.locked = false; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), deleteProperty: key => properties.delete(key), setProperty: (key, value) => { if (state.failState && !key.endsWith("_LEASE")) throw new Error("state unavailable"); properties.set(key, value); } }) },
    Utilities: { getUuid: () => `lease-${++serial}`, DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" }, computeDigest: (_, text) => [...createHash("sha256").update(text).digest()] } });
  vm.runInContext(fs.readFileSync(new URL("./ConversationArchive.gs", import.meta.url), "utf8"), context);
  return { ...state, state, run: () => context.arquivarConversasNoDrive_({ startAt }), context };
}

test("archive starts at the configured time, preserves authorship and verifies exact text without media", () => {
  const h = harness(), result = h.run();
  assert.equal(result.ok, true); assert.equal(result.rows, 2);
  const content = [...h.files.values()][0].content, lines = content.trim().split("\n").map(JSON.parse);
  assert.equal(lines[0].mediaFilesIncluded, false); assert.equal(lines[1].author, "patient"); assert.equal(lines[1].transcription, "automatic");
  assert.equal(lines[2].author, "human"); assert.doesNotMatch(content, /Anterior/);
  assert.equal(result.receipt.sha256, createHash("sha256").update(content).digest("hex"));
  assert.equal(h.run().status, "caught_up"); assert.equal(h.files.size, 1);
});

test("lost cursor response reuses the same verified file and never duplicates the export", () => {
  const h = harness(); h.state.failState = true;
  assert.throws(h.run, /state unavailable/); assert.equal(h.files.size, 1);
  h.state.failState = false; assert.equal(h.run().ok, true); assert.equal(h.files.size, 1);
});

test("bad readback never advances progress", () => {
  const h = harness(); h.state.corruptReadback = true;
  assert.equal(h.run().error, "archive_readback_failed"); assert.equal(h.properties.size, 0);
  h.state.corruptReadback = false; assert.equal(h.run().ok, true); assert.equal(h.files.size, 1);
});

test("public access, moved ledger position and changed activation fail closed without overwriting evidence", () => {
  const h = harness(); h.state.folderAccess = "ANYONE_WITH_LINK";
  assert.throws(h.run, /archive_folder_not_private/); assert.equal(h.files.size, 0);
  h.state.folderAccess = "PRIVATE"; h.run();
  h.data[3][3] = "A different message occupies this row";
  assert.equal(h.run().error, "archive_ledger_position_changed"); assert.equal(h.files.size, 1);
  assert.equal(h.context.arquivarConversasNoDrive_({ startAt: "2026-10-12T00:00:00Z" }).error, "archive_start_changed");
});

test("diagnostics are read-only and return no patient transcript", () => {
  const h = harness(), result = h.context.diagnosticarArquivoConversas_();
  assert.equal(result.initialized, false); assert.equal(h.properties.size, 0); assert.equal(h.files.size, 0);
  assert.doesNotMatch(JSON.stringify(result), /5511|endereço/);
});

test("scheduler is default-off and only invokes the archive action with no WhatsApp effects", async () => {
  assert.equal((await archiveConversationBatch({ env: {}, callSheetsImpl: () => assert.fail("disabled") })).status, "disabled");
  const result = await archiveConversationBatch({ env: { WHATSAPP_CONVERSATION_ARCHIVE_ENABLED: "true", WHATSAPP_CONVERSATION_ARCHIVE_START_AT: startAt },
    callSheetsImpl: async (action, payload) => { assert.equal(action, "archive_conversations"); assert.deepEqual(payload, { archive: { startAt } });
      return { status: "completed", data: { status: "archived", rows: 2, lastArchivedRow: 4, receipt: { fileId: "synthetic" } } }; } });
  assert.equal(result.rows, 2); assert.equal(result.receipt.fileId, "synthetic");
});
