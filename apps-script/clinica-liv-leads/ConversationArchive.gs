// Restricted, text-only projection of the canonical message ledger.
// This module never sends messages or changes a patient/CRM record.
const CONVERSATION_ARCHIVE = Object.freeze({
  folderId: "1NZFwgLSC2cUefzi73Nbn1nFaeJX8g85n",
  stateProperty: "WHATSAPP_CONVERSATION_ARCHIVE_STATE_V1",
  batchSize: 100,
});

function hashArquivoConversas_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (byte) { return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"); }).join("");
}

function ancoraArquivoConversas_(row) {
  // Opportunity enrichment is mutable; phone/direction/time/provider identity
  // anchor the cursor without mistaking enrichment for deleted/reordered rows.
  return hashArquivoConversas_(JSON.stringify(row.slice(0, 5)));
}

function normalizarLinhaArquivoConversas_(row, rowNumber) {
  const direction = String(row[1] || "");
  const origin = String(row[10] || "");
  const at = row[2] instanceof Date ? row[2].toISOString() : String(row[2] || "");
  const text = String(row[5] || "");
  const transcription = text.startsWith("[Transcrição automática de áudio]") ? "automatic"
    : text.startsWith("[Transcrição incerta de áudio]") ? "uncertain" : null;
  return { row: rowNumber, phone: String(row[0] || ""), direction: direction, at: at,
    messageId: String(row[3] || ""), eventId: String(row[4] || ""),
    author: direction === "IN" ? "patient" : /human|equipe/i.test(origin) ? "human" :
      /bruna|bot|retomada|lembrete|pos_consulta|cuidado/i.test(origin) ? "bruna" : "clinic_unspecified",
    source: origin, text: text, messageType: String(row[12] || "unknown"),
    relatedMessageId: String(row[13] || ""), transcription: transcription };
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
  const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(CONFIG.messageSheetName);
  return { ok: true, folderId: folder.getId(), configured: true, initialized: Boolean(state),
    lastArchivedRow: state ? state.lastRow : null, ledgerLastRow: sheet ? sheet.getLastRow() : null,
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
  const folder = pastaPrivadaArquivoConversas_();
  const properties = PropertiesService.getScriptProperties();
  const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(CONFIG.messageSheetName);
  if (!sheet) return { ok: false, error: "conversation_ledger_missing" };
  const headers = sheet.getRange(1, 1, 1, LEAD_MESSAGE_HEADERS.length).getValues()[0];
  if (JSON.stringify(headers) !== JSON.stringify(Array.from(LEAD_MESSAGE_HEADERS))) return { ok: false, error: "conversation_headers_changed" };
  const lastRow = sheet.getLastRow(), raw = properties.getProperty(CONVERSATION_ARCHIVE.stateProperty);
  let state = raw ? JSON.parse(raw) : null;
  if (state && state.startAt !== start.toISOString()) return { ok: false, error: "archive_start_changed" };
  if (!state) {
    // Initial, bounded historical catch-up only from the explicitly configured
    // activation time. Subsequent appended rows are archived even if delayed.
    const dates = lastRow > 1 ? sheet.getRange(2, 3, lastRow - 1, 1).getValues() : [];
    const first = dates.findIndex(function (row) { const time = new Date(row[0]).getTime(); return Number.isFinite(time) && time >= start.getTime(); });
    const cursor = first < 0 ? lastRow : first + 1;
    state = { version: 1, startAt: start.toISOString(), lastRow: cursor,
      anchorHash: ancoraArquivoConversas_(sheet.getRange(cursor, 1, 1, LEAD_MESSAGE_HEADERS.length).getValues()[0]) };
  }
  if (lastRow < state.lastRow || ancoraArquivoConversas_(sheet.getRange(state.lastRow, 1, 1, LEAD_MESSAGE_HEADERS.length).getValues()[0]) !== state.anchorHash) {
    return { ok: false, error: "archive_ledger_position_changed" };
  }
  if (lastRow === state.lastRow) {
    properties.setProperty(CONVERSATION_ARCHIVE.stateProperty, JSON.stringify(state));
    return { ok: true, status: "caught_up", rows: 0, lastArchivedRow: state.lastRow };
  }
  const fromRow = state.lastRow + 1, count = Math.min(CONVERSATION_ARCHIVE.batchSize, lastRow - state.lastRow);
  const rows = sheet.getRange(fromRow, 1, count, LEAD_MESSAGE_HEADERS.length).getValues();
  const records = rows.map(function (row, index) { return normalizarLinhaArquivoConversas_(row, fromRow + index); });
  const metadata = { kind: "backup_metadata", schemaVersion: 1, sourceSpreadsheet: CONFIG.spreadsheetId,
    sourceSheet: CONFIG.messageSheetName, startAt: state.startAt, fromRow: fromRow, toRow: fromRow + count - 1,
    mediaFilesIncluded: false, authority: "read_only_projection" };
  const content = [JSON.stringify(metadata)].concat(records.map(function (record) { return JSON.stringify(record); })).join("\n") + "\n";
  const digest = hashArquivoConversas_(content);
  const name = "conversas_" + metadata.fromRow + "-" + metadata.toRow + "_" + digest + ".jsonl";
  const files = folder.getFilesByName(name);
  let file = files.hasNext() ? files.next() : null;
  if (files.hasNext()) return { ok: false, error: "ambiguous_archive_file" };
  if (!file) file = folder.createFile(name, content, "text/plain");
  if (file.isTrashed() || file.getSharingAccess() !== DriveApp.Access.PRIVATE ||
      hashArquivoConversas_(file.getBlob().getDataAsString("UTF-8")) !== digest) return { ok: false, error: "archive_readback_failed" };
  // Cursor advances only after independent Drive readback. A timeout before
  // this point reuses the same name and bytes on retry, without a second file.
  state.lastRow = metadata.toRow;
  state.anchorHash = ancoraArquivoConversas_(rows[rows.length - 1]);
  state.lastReceipt = { fileId: file.getId(), sha256: digest, fromRow: fromRow, toRow: state.lastRow,
    verifiedAt: new Date().toISOString(), rows: count };
  properties.setProperty(CONVERSATION_ARCHIVE.stateProperty, JSON.stringify(state));
  return { ok: true, status: "archived", rows: count, hasMore: lastRow > state.lastRow,
    lastArchivedRow: state.lastRow, receipt: state.lastReceipt };
}
