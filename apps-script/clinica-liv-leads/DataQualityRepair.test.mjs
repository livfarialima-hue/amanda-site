import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createHash } from "node:crypto";

const source = readFileSync(
  new URL("./DataQualityRepair.gs", import.meta.url),
  "utf8",
);

function administrativeFixture() {
  const writes = [];
  const sheets = new Map();
  let held = false;
  let acquisitions = 0;
  let releases = 0;
  const lock = { tryLock() { acquisitions += 1; assert.equal(held, false); held = true; return true; },
    hasLock: () => held, releaseLock() { assert.equal(held, true); held = false; releases += 1; } };
  function sheet(name, initial = []) {
    const rows = initial;
    const result = { rows, getLastRow: () => rows.length, getLastColumn: () => rows[0]?.length || 0,
      getRange(row, column, height = 1, width = 1) {
        const range = { getValues: () => Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => rows[row - 1 + y]?.[column - 1 + x] ?? "")),
          getDisplayValues() { return this.getValues().map(line => line.map(value => String(value))); },
          getDisplayValue() { return this.getDisplayValues()[0][0]; },
          setValues(values) { writes.push({ name, row, column }); values.forEach((line, y) => line.forEach((value, x) => {
            rows[row - 1 + y] ||= []; rows[row - 1 + y][column - 1 + x] = value;
          })); return this; },
          setValue(value) { return this.setValues([[value]]); },
          createTextFinder(value) { return { matchEntireCell() { return this; }, findNext() {
            for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
              if (String(rows[row - 1 + y]?.[column - 1 + x] || "") === value) return { getRow: () => row + y };
            } return null;
          } }; } };
        return range;
      },
      appendRow(row) { writes.push({ name, append: true }); rows.push([...row]); },
    };
    sheets.set(name, result); return result;
  }
  const spreadsheet = { getSheetByName: name => sheets.get(name) || null };
  const properties = new Map([["ADMIN_RECONCILIATION_OPERATOR_EMAIL", "operator@example.test"], ["LEADS_INGEST_SECRET", "synthetic-secret"]]);
  const sandbox = { console: { log() {}, error() {} }, Date, JSON, Math, Number, Object, Array, String, Set,
    LockService: { getScriptLock: () => lock },
    Session: { getActiveUser: () => ({ getEmail: () => "operator@example.test" }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key) || "" }) },
    SpreadsheetApp: { openById: () => spreadsheet, flush() {} },
    Utilities: { DigestAlgorithm: { SHA_256: "SHA256" }, Charset: { UTF_8: "UTF8" },
      computeDigest: (_algorithm, value) => [...createHash("sha256").update(value).digest()].map(n => n > 127 ? n - 256 : n),
      formatDate: date => date.toISOString(), },
    UrlFetchApp: { fetch() { assert.fail("Administrative reconciliation must never call a network provider"); } },
  };
  const code = readFileSync(new URL("./Code.gs", import.meta.url), "utf8");
  const messages = readFileSync(new URL("./LeadClassification.gs", import.meta.url), "utf8");
  const milestones = readFileSync(new URL("./BusinessMilestones.gs", import.meta.url), "utf8");
  vm.createContext(sandbox);
  vm.runInContext(`${code}\n${messages}\n${source}\n${milestones}\nconst OPPORTUNITY_STORE_CONFIG={sheetName:'_CRM_OPORTUNIDADES'};const OPPORTUNITY_HEADERS=Array(26).fill('');`, sandbox);
  Object.assign(sandbox, {
    json_: value => ({ getContent: () => JSON.stringify(value) }),
    normalizePhone_: value => String(value || "").replace(/\D/g, ""),
    normalizeLead_: input => ({ ...input, phone: String(input.phone).replace(/\D/g, ""), contactAt: new Date(input.contactAt) }),
    resolverRotaLeadComContexto_: () => ({ professional: "amanda", sheetName: "Google Ads - Conversões", routeStatus: "resolved" }),
    resolverLinhaLeadCanonica_: () => ({ ok: false, reason: "lead_not_found" }),
    resolucaoLeadBloqueiaInsercao_: () => false,
    getOrCreateEventSheet_: () => sheets.get("_WHATSAPP_EVENTOS"),
    assertHeaders_() {}, houveAtendimentoHumanoNoDia_: () => false,
    findFirstAvailableRow_: target => target.getLastRow() + 1,
    writeRoutedLead_(target, row, lead) { target.getRange(row, 1, 1, 5).setValues([[lead.contactAt, "", lead.phone, "", "Novo"]]); },
    garantirOportunidadeLead_(_spreadsheet, lead, target, row) {
      const id = "opp_v2_amanda_12345678";
      const values = [id, lead.phone, "", "amanda", "Google Ads - Conversões", row, "open", "Novo", "new_lead", "bruna", "patient", "", "", ""];
      sheets.get("_CRM_OPORTUNIDADES").appendRow(values);
      return { opportunityId: id };
    },
    aplicarCorrecoesClassificacaoAuditadas_(input) {
      assert.equal(input.apply, true); const c = input.corrections[0];
      assert.equal(c.expectedStage, "Novo"); assert.equal(c.owner, "human_team");
      const target = sheets.get("_CRM_OPORTUNIDADES");
      target.getRange(2, 8, 1, 7).setValues([[c.stage, c.relationship, c.owner, c.expectedParty, "", c.summary, c.nextAction]]);
      return { ok: true };
    },
    getOrCreateLeadAuxiliarySheet_: (_spreadsheet, name, headers) => sheets.get(name) || sheet(name, [[...headers]]),
    findMessageRowInSheet_: (target, id) => { const index = target.rows.findIndex(row => row[3] === id); return index >= 1 ? index + 1 : null; },
    recordLeadMessageAndQueue_() { assert.fail("Historical recovery must never create or reopen classification queue"); },
  });
  const at = "2026-10-01T12:00:05.000Z";
  const lead = { phone: "5511900000000", messageId: "original-provider-message", eventId: "original-event", contactAt: at,
    professional: "amanda", messageType: "text", text: "Tenho interesse na avaliação online.", platform: "Meta", reference: "M26C01W-C07H01" };
  sheet("Google Ads - Conversões", [Array(25).fill("")]);
  sheet("Leads Dr. Daniel", [Array(25).fill("")]);
  sheet("_CRM_OPORTUNIDADES", [Array(26).fill("")]);
  sheet("_WHATSAPP_EVENTOS", [Array(9).fill(""), [lead.messageId, lead.eventId, lead.phone, at, "", "route_pending", "", "unknown", "pending"]]);
  sheet("_WHATSAPP_MENSAGENS", [Array(14).fill(""), [lead.phone, "IN", new Date(at), lead.messageId, lead.eventId, "", "", "", "unknown", "", "patient", "", "unsupported", ""],
    [lead.phone, "IN", new Date("2026-10-01T12:01:00Z"), "later-audio", "later-event", "", "", "", "unknown", "", "patient", "", "audio", ""]]);
  const payload = { lead, review: { stage: "Qualificado", owner: "human_team", expectedParty: "clinic", relationship: "engaged_lead",
    summary: "Revisão humana: pedido pessoal de avaliação online; áudio pendente.", nextAction: "Equipe deve revisar o áudio antes de contato.",
    sourceRef: `drive:synthetic_source_id#sha256:${"a".repeat(64)}` } };
  const input = sheet("_AUDITORIA_RECONCILIACAO", [["Request ID", "Ação", "Payload JSON"], [`admin_${"1".repeat(32)}`, "recover_route", JSON.stringify(payload)]]);
  function seal() {
    const preview = sandbox.simularReconciliacaoAdministrativaDaAba();
    payload.expectedStateHash = preview.items[0].stateHash;
    input.rows[1][2] = JSON.stringify(payload); return preview;
  }
  return { sandbox, sheets, spreadsheet, sheet, writes, properties, input, payload, seal,
    stats: () => ({ held, acquisitions, releases }) };
}

test("administrative recovery uses original unbound message, manual owner and one lock without queue or replay", () => {
  const f = administrativeFixture();
  const unrelated = JSON.stringify(f.sheets.get("_WHATSAPP_MENSAGENS").rows[2]);
  f.seal(); assert.equal(f.writes.length, 0);
  const result = f.sandbox.aplicarReconciliacaoAdministrativaDaAba();
  assert.equal(result.changed, 1);
  assert.equal(f.sheets.get("_CRM_OPORTUNIDADES").rows[1][9], "human_team");
  assert.equal(f.sheets.get("_WHATSAPP_MENSAGENS").rows[1][4], "original-event");
  assert.equal(JSON.stringify(f.sheets.get("_WHATSAPP_MENSAGENS").rows[2]), unrelated);
  assert.equal(f.sheets.has("_WHATSAPP_CLASSIFICACAO"), false);
  assert.deepEqual(f.stats(), { held: false, acquisitions: 2, releases: 2 });
  const count = f.writes.length;
  const repeated = f.sandbox.aplicarReconciliacaoAdministrativaDaAba();
  assert.equal(repeated.alreadyApplied, 1); assert.equal(f.writes.length, count);
  const receipts = JSON.stringify(f.sheets.get("_AUDITORIA_RECONCILIACAO_RECIBOS").rows);
  for (const sensitive of [f.payload.lead.phone, f.payload.lead.text, f.payload.review.summary, "synthetic-secret", "operator@example.test"]) {
    assert.equal(receipts.includes(sensitive), false);
  }
});

test("administrative authentication and hard batch limit fail before every write", () => {
  for (const mode of ["unknown", "blank", "unconfigured", "three"]) {
    const f = administrativeFixture();
    if (mode === "unknown") f.sandbox.Session.getActiveUser = () => ({ getEmail: () => "other@example.test" });
    if (mode === "blank") f.sandbox.Session.getActiveUser = () => ({ getEmail: () => "" });
    if (mode === "unconfigured") f.properties.delete("ADMIN_RECONCILIATION_OPERATOR_EMAIL");
    if (mode === "three") f.input.rows.push([...f.input.rows[1]], [...f.input.rows[1]]);
    assert.throws(() => f.sandbox.aplicarReconciliacaoAdministrativaDaAba(), /administrative_(operator_unauthorized|input_count_invalid)/);
    assert.equal(f.writes.length, 0);
  }
});

test("administrative full preflight rejects conflicts and a bad second item without writing the first", () => {
  for (const mode of ["wrongPhone", "crossedIds", "missingEvent", "changedHistory", "boundMessage", "content", "daniel", "wrongProfessional", "unresolvedRoute", "secondBad", "existingQueue", "existingOpportunity", "existingLead"]) {
    const f = administrativeFixture(); f.seal();
    const event = f.sheets.get("_WHATSAPP_EVENTOS").rows[1];
    if (mode === "wrongPhone") event[2] = "5511900000001";
    if (mode === "wrongProfessional") event[7] = "daniel";
    if (mode === "unresolvedRoute") f.sandbox.resolverRotaLeadComContexto_ = () => ({ professional: "amanda", sheetName: "Google Ads - Conversões", routeStatus: "pending" });
    if (mode === "crossedIds") f.sheets.get("_WHATSAPP_EVENTOS").rows.push(["other-message", event[1], ...event.slice(2)]);
    if (mode === "missingEvent") f.sheets.get("_WHATSAPP_EVENTOS").rows.pop();
    if (mode === "changedHistory") f.sheets.get("_WHATSAPP_MENSAGENS").rows[2][5] = "new information";
    if (mode === "boundMessage") f.sheets.get("_WHATSAPP_MENSAGENS").rows[1][7] = "other-opportunity";
    if (mode === "content") f.sheets.get("_WHATSAPP_MENSAGENS").rows[1][5] = "valid existing text";
    if (mode === "daniel") { f.payload.lead.professional = "daniel"; f.input.rows[1][2] = JSON.stringify(f.payload); }
    if (mode === "secondBad") f.input.rows.push([`admin_${"2".repeat(32)}`, "void_accepted", JSON.stringify({})]);
    if (mode === "existingQueue") f.sheet("_WHATSAPP_CLASSIFICACAO", [["Telefone"], [f.payload.lead.phone]]);
    if (mode === "existingOpportunity") f.sheets.get("_CRM_OPORTUNIDADES").rows.push(["existing", f.payload.lead.phone]);
    if (mode === "existingLead") f.sheets.get("Google Ads - Conversões").rows.push(["", "", f.payload.lead.phone]);
    assert.throws(() => f.sandbox.aplicarReconciliacaoAdministrativaDaAba(), /administrative_/);
    assert.equal(f.writes.length, 0, mode);
  }
});

test("administrative milestone batch preserves qualified phase and repeats only its completed receipt", () => {
  const f = administrativeFixture();
  const opportunityId = "opp_v2_amanda_87654321";
  f.sheets.get("_CRM_OPORTUNIDADES").rows.push([opportunityId, "5511900000001", "", "amanda", "", "", "open", "Qualificado"]);
  const original = ["accepted-original", opportunityId, "accepted", new Date("2026-10-01T12:00:00Z"), "whatsapp_classifier", "high", "recorded", new Date("2026-10-01T12:01:00Z")];
  const milestone = f.sheet("_OPORTUNIDADE_MARCOS", [["Event ID", "Opportunity ID", "Marco", "Data e hora", "Origem", "Confiança", "Estado", "Criado em"], [...original]]);
  const payload = { eventId: original[0], opportunityId, expectedMilestone: "accepted", expectedState: "recorded", reasonCode: "no_concrete_proposal_acceptance" };
  f.input.rows[1][1] = "void_accepted"; f.input.rows[1][2] = JSON.stringify(payload);
  payload.expectedStateHash = f.sandbox.simularReconciliacaoAdministrativaDaAba().items[0].stateHash;
  f.input.rows[1][2] = JSON.stringify(payload);
  assert.equal(f.writes.length, 0);
  assert.equal(f.sandbox.aplicarReconciliacaoAdministrativaDaAba().changed, 1);
  const expected = [...original]; expected[6] = "voided";
  assert.deepEqual(milestone.rows[1], expected);
  assert.equal(f.sheets.get("_CRM_OPORTUNIDADES").rows[1][7], "Qualificado");
  const receipts = f.sheets.get("_AUDITORIA_RECONCILIACAO_RECIBOS").rows;
  assert.deepEqual(receipts.slice(1).map(row => row[3]), ["prepared", "milestone_voided", "applied"]);
  assert.equal(receipts[2][8], "no_concrete_proposal_acceptance");
  const count = f.writes.length;
  assert.equal(f.sandbox.aplicarReconciliacaoAdministrativaDaAba().alreadyApplied, 1);
  assert.equal(f.writes.length, count);
  payload.expectedStateHash = "different"; f.input.rows[1][2] = JSON.stringify(payload);
  assert.throws(() => f.sandbox.aplicarReconciliacaoAdministrativaDaAba(), /request_payload_conflict/);
  assert.equal(f.writes.length, count);
});

test("administrative interrupted recovery leaves a durable review block and never duplicates on retry", () => {
  const f = administrativeFixture(); f.seal();
  f.sandbox.aplicarMetadadosRecuperacaoAdministrativa_ = () => { throw new Error("synthetic interruption"); };
  assert.throws(() => f.sandbox.aplicarReconciliacaoAdministrativaDaAba(), /partial_requires_review/);
  assert.equal(f.sheets.get("_CRM_OPORTUNIDADES").rows.length, 2);
  const count = f.writes.length;
  assert.throws(() => f.sandbox.aplicarReconciliacaoAdministrativaDaAba(), /partial_requires_review/);
  assert.equal(f.writes.length, count);
  assert.equal(f.sheets.has("_WHATSAPP_CLASSIFICACAO"), false);
  assert.equal(f.stats().held, false);
});

function load() {
  const sandbox = {
    Array,
    Boolean,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    normalizePhone_(value) {
      return String(value || "").replace(/\D/g, "");
    },
    rankFaseOportunidade_(value) {
      return {
        Novo: 1,
        Qualificado: 2,
        "N\u00e3o qualificado": 2,
        "Consulta agendada": 3,
        "Consulta realizada": 4,
        "Paciente convertido": 5,
      }[String(value || "")] || 0;
    },
    normalizarProfissionalOportunidade_(value) {
      const normalized = String(value || "").toLowerCase();
      if (normalized.includes("amanda")) return "amanda";
      if (normalized.includes("daniel")) return "daniel";
      return "unknown";
    },
    profissionalPermitidoOportunidade_(value) {
      return value === "amanda" || value === "daniel";
    },
    safeText_(value, maximumLength) {
      return Array.from(String(value || "")).slice(0, maximumLength).join("");
    },
    resolverFaseSincronizada_(crmStage, visibleStage, input) {
      const ranks = {
        Novo: 1,
        Qualificado: 2,
        "Consulta agendada": 3,
        "Consulta realizada": 4,
        "Paciente convertido": 5,
      };
      const stages = [crmStage, visibleStage, input.stage].filter(Boolean);
      const stage = stages.reduce((best, current) =>
        (ranks[current] || 0) > (ranks[best] || 0) ? current : best, "");
      return { ok: true, stage };
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { escolherLinhaCanonicaDuplicidade_, agruparLinhasPorOportunidade_, resolverLinhaLeadIndexada_, resolverOportunidadeConsultaIndexada_, auditarFaseConsultaIndexada_, eventoAgendaConsultaConsistente_, validarCorrecaoClassificacaoAuditada_, oportunidadeAuditavelParaArquivo_ };`,
    sandbox,
  );
  return sandbox.__test;
}

test("audited classification corrections accept explicit human downgrades", () => {
  const { validarCorrecaoClassificacaoAuditada_ } = load();
  const correction = validarCorrecaoClassificacaoAuditada_({
    opportunityId: "opp_v2_amanda_12345678",
    expectedStage: "Qualificado",
    stage: "Novo",
    invalidateQualifiedConversion: true,
    reason: "Somente prefill estruturado, sem intenção pessoal posterior.",
  });

  assert.equal(correction.ok, true);
  assert.equal(correction.stage, "Novo");
  assert.equal(correction.invalidateQualifiedConversion, true);
});

test("a qualified lead downgraded to new always invalidates the conversion", () => {
  const { validarCorrecaoClassificacaoAuditada_ } = load();
  const correction = validarCorrecaoClassificacaoAuditada_({
    opportunityId: "opp_v2_amanda_12345678",
    expectedStage: "Qualificado",
    stage: "Novo",
    reason: "Auditoria humana corrigiu a fase.",
  });

  assert.equal(correction.ok, true);
  assert.equal(correction.invalidateQualifiedConversion, true);
});

test("conversion invalidation fails closed for a still-qualified stage", () => {
  const { validarCorrecaoClassificacaoAuditada_ } = load();
  const correction = validarCorrecaoClassificacaoAuditada_({
    opportunityId: "opp_v2_amanda_12345678",
    expectedStage: "Qualificado",
    stage: "Qualificado",
    invalidateQualifiedConversion: true,
  });

  assert.equal(correction.ok, false);
  assert.equal(correction.reason, "invalid_conversion_invalidation_target");
});

test("non-lead archive preflight accepts the canonical open opportunity state", () => {
  const { oportunidadeAuditavelParaArquivo_ } = load();
  const found = {
    values: [
      "opp_v2_amanda_12345678",
      "5511999999999",
      "",
      "amanda",
      "Google Ads - Conversões",
      "",
      "open",
      "Paciente convertido",
    ],
  };

  assert.equal(
    oportunidadeAuditavelParaArquivo_(found, {
      expectedStage: "Paciente convertido",
    }),
    true,
  );
  found.values[6] = "voided";
  assert.equal(
    oportunidadeAuditavelParaArquivo_(found, {
      expectedStage: "Paciente convertido",
    }),
    false,
  );
});

test("duplicate planning keeps the highest stage and returns every excess row", () => {
  const { escolherLinhaCanonicaDuplicidade_ } = load();
  const result = escolherLinhaCanonicaDuplicidade_([
    { rowNumber: 2, stage: "Novo" },
    { rowNumber: 8, stage: "Consulta agendada" },
    { rowNumber: 9, stage: "Qualificado" },
  ], 2);

  assert.equal(result.ok, true);
  assert.equal(result.canonicalRow, 8);
  assert.equal(result.targetStage, "Consulta agendada");
  assert.deepEqual(Array.from(result.duplicateRows), [2, 9]);
});

test("CRM pointer breaks a tie only among rows at the highest stage", () => {
  const { escolherLinhaCanonicaDuplicidade_ } = load();
  const result = escolherLinhaCanonicaDuplicidade_([
    { rowNumber: 2, stage: "Qualificado" },
    { rowNumber: 8, stage: "Qualificado" },
  ], 2);

  assert.equal(result.ok, true);
  assert.equal(result.canonicalRow, 2);
});

test("qualified versus non-qualified is never resolved automatically", () => {
  const { escolherLinhaCanonicaDuplicidade_ } = load();
  const result = escolherLinhaCanonicaDuplicidade_([
    { rowNumber: 2, stage: "Qualificado" },
    { rowNumber: 8, stage: "N\u00e3o qualificado" },
  ], 2);

  assert.equal(result.ok, false);
  assert.equal(result.reason, "equal_rank_stage_conflict");
});

test("groups only non-empty opportunity ids", () => {
  const { agruparLinhasPorOportunidade_ } = load();
  const columns = { "Opportunity ID": 2, "Situa\u00e7\u00e3o do lead": 3 };
  const groups = agruparLinhasPorOportunidade_([
    ["a", "opp-1", "Novo"],
    ["b", "", "Novo"],
    ["c", "opp-1", "Qualificado"],
  ], columns);

  assert.deepEqual(Object.keys(groups), ["opp-1"]);
  assert.equal(groups["opp-1"].length, 2);
});

test("indexed lead resolution preserves duplicate and unique-match safety", () => {
  const { resolverLinhaLeadIndexada_ } = load();
  const entry = {
    columns: { "Opportunity ID": 2 },
    byOpportunityId: { duplicated: [2, 9], unique: [8] },
    byPhone: { 5511999999999: [8] },
  };

  assert.equal(resolverLinhaLeadIndexada_(entry, "unique", "").row, 8);
  assert.equal(
    resolverLinhaLeadIndexada_(entry, "duplicated", "").reason,
    "duplicate_opportunity_id_in_visible_sheet",
  );
  assert.equal(
    resolverLinhaLeadIndexada_(entry, "", "+55 11 99999-9999").row,
    8,
  );
});

test("consultation identity index only accepts one canonical match", () => {
  const { resolverOportunidadeConsultaIndexada_ } = load();
  const unique = {
    sheet: {},
    byOpportunityId: {
      "opp-1": [{
        row: 2,
        values: ["opp-1", "5511999999999", "", "amanda"],
      }],
      duplicated: [
        { row: 3, values: ["duplicated"] },
        { row: 4, values: ["duplicated"] },
      ],
    },
    byIdentity: {
      "amanda|5511999999999": [
        {
          row: 2,
          values: ["opp-1", "5511999999999", "", "amanda"],
        },
      ],
    },
  };

  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "opp-1",
      phone: "+55 11 99999-9999",
      professional: "Dra. Amanda",
    }).opportunityId,
    "opp-1",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      phone: "+55 11 99999-9999",
      professional: "Dra. Amanda",
    }).matchedBy,
    "unique_active_professional_phone",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "duplicated",
    }).reason,
    "duplicate_opportunity_id",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "opp-1",
      phone: "+55 11 99999-9999",
      professional: "Dr. Henrique",
    }).reason,
    "unsupported_professional_opportunity_link",
  );
  assert.equal(
    resolverOportunidadeConsultaIndexada_(unique, {
      opportunityId: "opp-1",
      phone: "+55 11 98888-8888",
      professional: "Dra. Amanda",
    }).reason,
    "opportunity_phone_mismatch",
  );
});

test("consultation stage audit separates consistency from a real repair", () => {
  const { auditarFaseConsultaIndexada_ } = load();
  const columns = {
    "Opportunity ID": 1,
    "Situação do lead": 2,
  };
  const visibleIndex = {
    Leads: {
      columns,
      rows: [["opp-1", "Consulta agendada"]],
      byOpportunityId: { "opp-1": [2] },
      byPhone: {},
    },
  };
  const identity = {
    found: {
      row: 2,
      values: [
        "opp-1",
        "5511999999999",
        "",
        "amanda",
        "Leads",
        2,
        "open",
        "Consulta agendada",
      ],
    },
  };

  assert.equal(
    auditarFaseConsultaIndexada_(
      visibleIndex,
      identity,
      "Consulta agendada",
    ).state,
    "consistent",
  );
  identity.found.values[5] = 9;
  assert.equal(
    auditarFaseConsultaIndexada_(
      visibleIndex,
      identity,
      "Consulta agendada",
    ).state,
    "repairable",
  );
});

test("calendar event audit requires exact time and operational metadata", () => {
  const { eventoAgendaConsultaConsistente_ } = load();
  const start = new Date("2026-08-20T15:00:00-03:00");
  const end = new Date("2026-08-20T16:00:00-03:00");
  const expected = {
    start,
    end,
    title: "Consulta — Dra. Amanda",
    description: "Reserva operacional",
    acceptedDescriptions: [
      "Reserva operacional",
      "Reserva antiga, mas segura.",
    ],
    location: "Clínica LIV Faria Lima — Sala 1",
  };
  const event = {
    getStartTime: () => start,
    getEndTime: () => end,
    getTitle: () => expected.title,
    getDescription: () => expected.description,
    getLocation: () => expected.location,
  };

  assert.equal(eventoAgendaConsultaConsistente_(event, expected), true);
  event.getDescription = () => "  Reserva antiga,\nmas segura.  ";
  assert.equal(eventoAgendaConsultaConsistente_(event, expected), true);
  event.getEndTime = () => new Date(end.getTime() + 15 * 60 * 1000);
  assert.equal(eventoAgendaConsultaConsistente_(event, expected), false);
});

test("integrated repair runner keeps every mutating repair in dry-run mode", () => {
  const start = source.indexOf(
    "function executarSimulacoesCorrecaoIntegrada()",
  );
  assert.notEqual(start, -1);
  const runner = source.slice(start);

  assert.match(runner, /auditarIntegridadeFunilLocal_\(\)/);
  assert.match(runner, /executarDeduplicacaoReversivelLeads\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarFasesHistoricasLeads\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarConsultasHistoricas\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarAtribuicaoHistoricaLeads\(\{ apply: false \}\)/);
  assert.match(runner, /reconciliarGoogleAdsLedgerEImportacao\(\{ apply: false \}\)/);
  assert.match(runner, /reconstruirFonteFunilCanonico\(\{ apply: false \}\)/);
  assert.match(runner, /executarReaperFilaClassificacao\(\{ apply: false \}\)/);
  assert.match(runner, /auditarSlaOperacional\(\)/);
  assert.doesNotMatch(runner, /apply:\s*true/);
  assert.match(runner, /INTEGRATED_DRY_RUN/);
});

test("split repair runners expose every check without enabling writes", () => {
  const wrapper = source.match(
    /function executarSimulacaoCorrecaoIntegrada_\([\s\S]*?\n\}/,
  );
  assert.ok(wrapper);
  assert.match(wrapper[0], /INTEGRATED_DRY_RUN_CHECK/);
  assert.doesNotMatch(wrapper[0], /apply:\s*true/);
  for (let index = 1; index <= 9; index += 1) {
    const runner = source.match(
      new RegExp(`function simularCorrecao0${index}[\\s\\S]*?\\n\\}`),
    );
    assert.ok(runner);
    assert.doesNotMatch(runner[0], /apply:\s*true/);
  }
});

test("read-only repair paths use cached visible rows and do not repair headers", () => {
  assert.match(source, /function construirIndiceLeadsVisiveis_/);
  assert.match(source, /function resolverLinhaLeadIndexada_/);
  assert.match(
    source,
    /if \(apply\) garantirEstruturaSincronizacaoConsultas_\(sheet\)/,
  );
  assert.match(
    source,
    /const columns = apply\s*\? garantirEstruturaIntegradaLead_\(sheet\)\s*:\s*mapaCabecalhosOportunidade_\(sheet\)/,
  );
});

test("authorized deduplication is locked, reversible and exposes opaque backup ids", () => {
  const start = source.indexOf(
    "function executarDeduplicacaoReversivelLeads(input)",
  );
  const end = source.indexOf(
    "function restaurarLeadDuplicadoArquivado(input)",
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const applyFlow = source.slice(start, end);

  assert.match(applyFlow, /LockService\.getScriptLock\(\)/);
  assert.match(applyFlow, /lock\.tryLock\(30000\)/);
  assert.match(applyFlow, /finally\s*{\s*lock\.releaseLock\(\)/);
  assert.match(applyFlow, /setValue\("rolled_back"\)/);
  assert.match(applyFlow, /backupIds\.push\(entry\.backupId\)/);
  assert.match(applyFlow, /function aplicarDeduplicacaoReversivelAutorizada/);
  assert.match(applyFlow, /DEDUPLICATION_APPLY/);
});

test("authorized historical stage reconciliation is guarded and idempotent", () => {
  const start = source.indexOf(
    "function aplicarReconciliacaoFasesHistoricasAutorizada()",
  );
  const end = source.indexOf(
    "function reconciliarConsultasHistoricas(input)",
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const applyFlow = source.slice(start, end);

  assert.match(applyFlow, /expectedInspected = 131/);
  assert.match(applyFlow, /expectedRepairable = 27/);
  assert.match(applyFlow, /LockService\.getScriptLock\(\)/);
  assert.match(applyFlow, /lock\.tryLock\(30000\)/);
  assert.match(applyFlow, /preflight_mismatch/);
  assert.match(applyFlow, /alreadyReconciled: true/);
  assert.match(
    applyFlow,
    /reconciliarFasesHistoricasLeads\(\{ apply: true \}\)/,
  );
  assert.match(applyFlow, /postflightSummary\.repairable === 0/);
  assert.match(applyFlow, /finally\s*{\s*lock\.releaseLock\(\)/);
  assert.match(applyFlow, /HISTORICAL_STAGE_RECONCILIATION_APPLY/);
});

test("authorized consultation reconciliation applies only the locked safe subset", () => {
  const start = source.indexOf(
    "function aplicarReconciliacaoConsultasSegurasAutorizada()",
  );
  const end = source.indexOf(
    "function reconciliarAtribuicaoHistoricaLeads(input)",
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const applyFlow = source.slice(start, end);

  assert.match(applyFlow, /inspected: 43/);
  assert.match(applyFlow, /phaseRepairable: 3/);
  assert.match(applyFlow, /calendarSafeRepairable: 9/);
  assert.match(applyFlow, /calendarBlockedRepairable: 2/);
  assert.match(applyFlow, /reviewRequired: 29/);
  assert.match(applyFlow, /LockService\.getScriptLock\(\)/);
  assert.match(applyFlow, /lock\.tryLock\(30000\)/);
  assert.match(applyFlow, /preflight_mismatch/);
  assert.match(applyFlow, /alreadyReconciled: true/);
  assert.match(
    applyFlow,
    /reconciliarConsultasHistoricas\(\{ apply: true \}\)/,
  );
  assert.match(
    applyFlow,
    /reconciliarConsultasHistoricas\(\{ apply: false \}\)/,
  );
  assert.match(applyFlow, /matchesExpected\(postflight, false\)/);
  assert.match(applyFlow, /finally\s*{\s*lock\.releaseLock\(\)/);
  assert.match(applyFlow, /SAFE_CONSULTATION_RECONCILIATION_APPLY/);
});

test("authorized Google Ads reconciliation is locked, bounded and idempotent", () => {
  const source = readFileSync(
    new URL("./DataQualityRepair.gs", import.meta.url),
    "utf8",
  );
  const runner = source.match(
    /function aplicarReconciliacaoGoogleAdsSeguraAutorizada\(\) \{[\s\S]*?\n\}/,
  );

  assert.ok(runner);
  assert.match(runner[0], /tryLock\(30000\)/);
  assert.match(runner[0], /importRows: 5/);
  assert.match(runner[0], /ledgerRows: 2/);
  assert.match(runner[0], /visibleConversionNameMismatches: 5/);
  assert.match(runner[0], /missingLedger: 3/);
  assert.match(runner[0], /ledgerRows: 5/);
  assert.match(runner[0], /alreadyReconciled: true/);
  assert.match(runner[0], /reconstructedLedger !== 3/);
  assert.match(runner[0], /finally \{\s*lock\.releaseLock\(\)/);
});
