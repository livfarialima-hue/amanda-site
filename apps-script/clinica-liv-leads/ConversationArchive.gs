// Restricted, immutable text-only event archive, independent of CRM eligibility.
// This module never sends messages or changes a patient/CRM record.
const CONVERSATION_ARCHIVE = Object.freeze({
  folderId: "1NZFwgLSC2cUefzi73Nbn1nFaeJX8g85n",
  stateProperty: "WHATSAPP_CONVERSATION_ARCHIVE_STATE_V1",
  batchSize: 3,
});

function hashArquivoConversas_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (byte) { return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"); }).join("");
}

function pastaPrivadaArquivoConversas_() {
  const folder = DriveApp.getFolderById(CONVERSATION_ARCHIVE.folderId);
  if (folder.isTrashed() || folder.getSharingAccess() !== DriveApp.Access.PRIVATE) throw new Error("archive_folder_not_private");
  return folder;
}

function diagnosticarArquivoConversas_() {
  const folder = pastaPrivadaArquivoConversas_();
  const raw = PropertiesService.getScriptProperties().getProperty(CONVERSATION_ARCHIVE.stateProperty);
  const state = raw ? JSON.parse(raw) : null;
  return { ok: true, folderId: folder.getId(), configured: true, initialized: Boolean(state),
    startAt: state ? state.startAt : null, lastReceipt: state ? state.lastReceipt : null };
}

// Run from the editor only for Drive authorization/read-only verification.
function diagnosticarArquivoConversas() { console.log(JSON.stringify(diagnosticarArquivoConversas_())); }

function arquivarConversasNoDrive_(input) {
  // Serialize archive workers with a lease, not the patient write lock during
  // Drive I/O. A timed-out HTTP caller cannot start a second in-flight export.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { ok: false, error: "busy_retry" };
  const properties = PropertiesService.getScriptProperties();
  const key = CONVERSATION_ARCHIVE.stateProperty + "_LEASE", token = Utilities.getUuid();
  try {
    const previous = JSON.parse(properties.getProperty(key) || "null");
    if (previous && previous.until > Date.now()) return { ok: false, error: "archive_busy_retry" };
    properties.setProperty(key, JSON.stringify({ token: token, until: Date.now() + 15 * 60 * 1000 }));
  } finally { lock.releaseLock(); }
  try { return arquivarLoteConversasNoDrive_(input); }
  finally {
    if (lock.tryLock(1000)) {
      try {
        const current = JSON.parse(properties.getProperty(key) || "null");
        if (current && current.token === token) properties.deleteProperty(key);
      } finally { lock.releaseLock(); }
    }
  }
}

function arquivarLoteConversasNoDrive_(input) {
  const start = new Date(input && input.startAt || "");
  if (Number.isNaN(start.getTime()) || start.getTime() > Date.now()) return { ok: false, error: "invalid_archive_start" };
  const entries = input && input.entries;
  if (!Array.isArray(entries) || entries.length > CONVERSATION_ARCHIVE.batchSize) return { ok: false, error: "invalid_archive_batch" };
  const folder = pastaPrivadaArquivoConversas_();
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty(CONVERSATION_ARCHIVE.stateProperty);
  const state = raw ? JSON.parse(raw) : { version: 2, startAt: start.toISOString() };
  if (state.startAt !== start.toISOString()) return { ok: false, error: "archive_start_changed" };
  const allowed = ["schemaVersion", "phone", "eventId", "messageId", "externalId", "providerMessageId", "direction", "author", "at", "text", "messageType", "relatedMessageId", "source", "transcription", "deliveryState", "textTruncated"];
  const receipts = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i], record = entry && entry.record;
    if (!record || record.schemaVersion !== 2 || Object.keys(record).some(function (key) { return allowed.indexOf(key) < 0; }) ||
        typeof record.text !== "string" || record.text.length > 32768 || !/^\+?\d{8,15}$/.test(record.phone || "") ||
        !record.eventId || !/^[a-f0-9]{64}$/.test(entry.revision || "") || hashArquivoConversas_(JSON.stringify(record)) !== entry.revision ||
        !Number.isFinite(Date.parse(entry.receivedAt)) || Date.parse(entry.receivedAt) < start.getTime()) return { ok: false, error: "invalid_archive_entry" };
    // One immutable file per message revision: a lost response and new arrivals
    // cannot widen an old batch or duplicate its messages in another file.
    const content = JSON.stringify({ kind: "backup_metadata", schemaVersion: 2, revision: entry.revision,
      mediaFilesIncluded: false, authority: "read_only_projection" }) + "\n" + JSON.stringify(record) + "\n";
    const digest = hashArquivoConversas_(content), name = "conversa_" + entry.revision + ".jsonl";
    const files = folder.getFilesByName(name);
    let file = files.hasNext() ? files.next() : null;
    if (files.hasNext()) return { ok: false, error: "ambiguous_archive_file" };
    if (!file) file = folder.createFile(name, content, "text/plain");
    if (file.isTrashed() || file.getSharingAccess() !== DriveApp.Access.PRIVATE ||
        hashArquivoConversas_(file.getBlob().getDataAsString("UTF-8")) !== digest) return { ok: false, error: "archive_readback_failed" };
    receipts.push({ revision: entry.revision, fileId: file.getId(), sha256: digest, verifiedAt: new Date().toISOString() });
  }
  if (receipts.length) state.lastReceipt = receipts[receipts.length - 1];
  properties.setProperty(CONVERSATION_ARCHIVE.stateProperty, JSON.stringify(state));
  return { ok: true, status: receipts.length ? "archived" : "caught_up", rows: receipts.length, receipts: receipts };
}
