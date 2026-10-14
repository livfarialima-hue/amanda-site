import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { archiveRecord } from "../../netlify/functions/lib/conversation-archive-outbox.mjs";
const startAt = "2026-10-13T23:25:00.000Z";
function entry(id, text = "", extra = {}) {
  const record = archiveRecord({ phone: "+5511900000000", eventId: id, messageId: id, direction: "IN", author: "patient", at: "2026-10-13T23:26:00Z", messageType: "audio", text, ...extra });
  return { record, revision: createHash("sha256").update(JSON.stringify(record)).digest("hex"), receivedAt: "2026-10-13T23:26:01Z" };
}
function harness() {
  const properties = new Map(), files = new Map(); let serial = 0;
  const state = { folderAccess: "PRIVATE", corruptReadback: false, failState: false, locked: false, files, properties };
  const folder = { getId: () => "synthetic-private-folder", isTrashed: () => false, getSharingAccess: () => state.folderAccess,
    getFilesByName: name => { let consumed = false; return { hasNext: () => !consumed && files.has(name), next: () => { consumed = true; return files.get(name); } }; },
    createFile: (name, content, mime) => {
      assert.equal(state.locked, false, "Drive I/O must not block patient writes"); assert.equal(mime, "text/plain");
      const id = "file-" + ++serial;
      const file = { getId: () => id, isTrashed: () => false, getSharingAccess: () => "PRIVATE",
        getBlob: () => ({ getDataAsString: () => state.corruptReadback ? "corrupt" : content }), content };
      files.set(name, file); return file;
    } };
  const context = vm.createContext({ Date, console,
    DriveApp: { Access: { PRIVATE: "PRIVATE" }, getFolderById: () => folder },
    LockService: { getScriptLock: () => ({ tryLock: () => { state.locked = true; return true; }, releaseLock: () => { state.locked = false; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), deleteProperty: key => properties.delete(key), setProperty: (key, value) => { if (state.failState && !key.endsWith("_LEASE")) throw new Error("state unavailable"); properties.set(key, value); } }) },
    Utilities: { getUuid: () => "lease-" + ++serial, DigestAlgorithm: { SHA_256: "SHA_256" }, Charset: { UTF_8: "UTF_8" }, computeDigest: (_, text) => [...createHash("sha256").update(text).digest()] } });
  vm.runInContext(fs.readFileSync(new URL("./ConversationArchive.gs", import.meta.url), "utf8"), context);
  return { ...state, state, run: entries => context.arquivarConversasNoDrive_({ startAt, entries }), context };
}

test("archive preserves authorship and exact text without accessing CRM or copying media", () => {
  const h = harness(), entries = [entry("voice", "Qual o endereço?", { transcription: "automatic" }), entry("human", "Resposta da equipe", { author: "human", direction: "OUT", messageType: "text" })];
  const result = h.run(entries); assert.equal(result.ok, true); assert.equal(result.rows, 2);
  const content = [...h.files.values()][0].content, lines = content.trim().split("\n").map(JSON.parse);
  assert.equal(lines[0].mediaFilesIncluded, false); assert.equal(lines[1].author, "patient"); assert.equal(lines[1].transcription, "automatic");
  assert.equal(result.receipts[0].sha256, createHash("sha256").update(content).digest("hex"));
  assert.equal(h.run(entries).rows, 2); assert.equal(h.files.size, 2);
});

test("lost acknowledgement plus a new arrival reuses immutable files without overlapping batches", () => {
  const h = harness(), original = [entry("a", "Primeira"), entry("b", "Segunda")];
  h.state.failState = true; assert.throws(() => h.run(original), /state unavailable/); assert.equal(h.files.size, 2);
  h.state.failState = false; assert.equal(h.run([...original, entry("c", "Terceira")]).ok, true); assert.equal(h.files.size, 3);
  assert.equal([...h.files.values()].filter(file => file.content.includes("Primeira")).length, 1);
});

test("late transcript is a new revision of the same message after the original was archived", () => {
  const h = harness(); h.run([entry("voice")]); h.run([entry("voice", "Texto recuperado", { transcription: "automatic" })]);
  assert.equal(h.files.size, 2);
  const records = [...h.files.values()].map(file => JSON.parse(file.content.trim().split("\n")[1]));
  assert.equal(new Set(records.map(record => record.messageId)).size, 1);
  assert.deepEqual(records.map(record => record.text), ["", "Texto recuperado"]);
});

test("bad readback never acknowledges an entry and retry reuses exact file", () => {
  const h = harness(), entries = [entry("one", "Text")]; h.state.corruptReadback = true;
  assert.equal(h.run(entries).error, "archive_readback_failed"); assert.equal(h.properties.size, 0);
  h.state.corruptReadback = false; assert.equal(h.run(entries).ok, true); assert.equal(h.files.size, 1);
});

test("public folder, altered revision, extra provider fields and changed activation fail closed", () => {
  const h = harness(), entries = [entry("one", "Text")]; h.state.folderAccess = "ANYONE_WITH_LINK";
  assert.throws(() => h.run(entries), /archive_folder_not_private/); assert.equal(h.files.size, 0);
  h.state.folderAccess = "PRIVATE"; h.run(entries);
  assert.equal(h.run([{ ...entries[0], record: { ...entries[0].record, text: "changed" } }]).error, "invalid_archive_entry");
  assert.equal(h.run([{ ...entries[0], record: { ...entries[0].record, audio: { link: "https://private.invalid" } } }]).error, "invalid_archive_entry");
  assert.equal(h.context.arquivarConversasNoDrive_({ startAt: "2026-10-12T00:00:00Z", entries: [] }).error, "archive_start_changed");
  assert.equal(h.files.size, 1);
});

test("diagnostics return metadata only and empty initialization is not a backup receipt", () => {
  const h = harness(); assert.equal(h.context.diagnosticarArquivoConversas_().initialized, false);
  assert.equal(h.properties.size, 0); assert.equal(h.files.size, 0);
  assert.equal(h.run([]).status, "caught_up"); assert.equal(h.files.size, 0);
  assert.equal(h.context.diagnosticarArquivoConversas_().lastReceipt, undefined);
});
