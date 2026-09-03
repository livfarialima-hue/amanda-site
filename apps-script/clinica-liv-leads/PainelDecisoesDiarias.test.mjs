import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("./PainelDecisoesDiarias.gs", import.meta.url),
  "utf8",
);
const codeSource = fs.readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function formatDate(date, _timezone, format) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const replacements = {
    yyyy: values.year,
    MM: values.month,
    dd: values.day,
    HH: values.hour,
    mm: values.minute,
  };
  return format.replace(
    /yyyy|MM|dd|HH|mm/g,
    (token) => replacements[token],
  );
}

function loadContext(overrides = {}) {
  const state = {
    spreadsheetReads: 0,
    listReads: 0,
    lockAttempts: 0,
    releases: 0,
    approvals: [],
    cancellations: [],
    deferrals: [],
  };
  const sheet = {};
  const spreadsheet = {
    getSheetByName() {
      return sheet;
    },
  };
  const htmlOutput = (content) => ({
    content,
    title: "",
    setTitle(title) {
      this.title = title;
      return this;
    },
  });
  const context = {
    console,
    Date,
    Number,
    Object,
    Set,
    Array,
    String,
    Math,
    JSON,
    CONFIG: { spreadsheetId: "spreadsheet-test" },
    CENTRAL_ATENDIMENTO_CONFIG: { sheetName: "Central de Atendimento" },
    RETOMADAS_CONFIG: {
      propriedadeSegredo: "LEADS_INGEST_SECRET",
      fusoHorario: "America/Sao_Paulo",
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => "segredo-sintetico-de-teste",
      }),
    },
    Utilities: {
      computeHmacSha256Signature(value, secret) {
        return Array.from(
          crypto.createHmac("sha256", secret).update(value).digest(),
        );
      },
      base64EncodeWebSafe(bytes) {
        return Buffer.from(bytes).toString("base64url");
      },
      formatDate,
    },
    HtmlService: { createHtmlOutput: htmlOutput },
    SpreadsheetApp: {
      openById() {
        state.spreadsheetReads += 1;
        return spreadsheet;
      },
    },
    LockService: {
      getScriptLock: () => ({
        tryLock() {
          state.lockAttempts += 1;
          return true;
        },
        releaseLock() {
          state.releases += 1;
        },
      }),
    },
    formatarDataRetomadas_: (date, format) =>
      formatDate(date, "America/Sao_Paulo", format),
    combinarDataHorarioCentral_(day, time) {
      return new Date(`${day}T${time}:00-03:00`);
    },
    escaparHtmlRetomadas_(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
    urlAplicativoRetomadas_: () =>
      "https://script.google.com/macros/s/deployment-test/exec",
    linkCentralAtendimentoRetomadas_: () =>
      "https://docs.google.com/spreadsheets/d/test/edit#gid=123",
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [];
    },
    aprovarRetomadasMarcadasCentralInterno_(
      _spreadsheet,
      _sheet,
      _now,
      decisions,
    ) {
      state.approvals.push(...decisions);
      return {
        results: decisions.map((decision) => ({
          rowNumber: decision.rowNumber,
          ok: true,
        })),
      };
    },
    cancelarRetomadasMarcadasCentralInterno_(
      _spreadsheet,
      _sheet,
      _now,
      decisions,
    ) {
      state.cancellations.push(...decisions);
      return {
        results: decisions.map((decision) => ({
          rowNumber: decision.rowNumber,
          ok: true,
        })),
      };
    },
    adiarItensCentralInterno_(_sheet, _now, decisions) {
      state.deferrals.push(...decisions);
      return {
        results: decisions.map((decision) => ({
          rowNumber: decision.rowNumber,
          ok: true,
        })),
      };
    },
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(source, context, {
    filename: "PainelDecisoesDiarias.gs",
  });
  return { context, state, sheet, spreadsheet };
}

function currentDay(context) {
  return context.formatarDataRetomadas_(new Date(), "yyyy-MM-dd");
}

function tomorrow(context, day) {
  return context.amanhaPainelDecisoes_(day, 1);
}

test("daily and item links use opaque tokens without patient identifiers", () => {
  const { context } = loadContext();
  const day = currentDay(context);
  const sourceKey = "followup:+5511999999999:patient-name";
  const dailyLink = context.linkPainelDecisoesDiarias_(new Date());
  const itemToken = context.assinaturaItemPainelDecisoesDiarias_(
    day,
    sourceKey,
  );

  assert.match(dailyLink, /view=decisoes_diarias/);
  assert.match(dailyLink, /token=[A-Za-z0-9_-]+/);
  assert.doesNotMatch(dailyLink, /5511999999999|patient-name|followup/);
  assert.match(itemToken, /^[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(itemToken, /5511999999999|patient-name|followup/);
});

test("the web app routes the daily decision view to the read-only renderer", () => {
  assert.match(codeSource, /view === "decisoes_diarias"/);
  assert.match(
    codeSource,
    /return renderPainelDecisoesDiarias_\(/,
  );
});

test("an invalid or expired link is read-only and never opens the spreadsheet", () => {
  const { context, state } = loadContext();
  const output = context.renderPainelDecisoesDiarias_({
    day: "2020-01-01",
    token: "invalid",
  });

  assert.equal(state.spreadsheetReads, 0);
  assert.equal(state.listReads, 0);
  assert.match(output.content, /Link inválido ou expirado/);
  assert.match(output.content, /Nenhuma decisão foi aplicada/);
});

test("opening the valid panel only reads and never preselects an action", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "followup:synthetic",
          rowNumber: 2,
          name: "Paciente Teste",
          phone: "+5511999999999",
          priority: "Alta",
          queue: "Retomada humana",
          dueAt: new Date(),
          nextAction: "Revisar mensagem",
          context: "Contexto anonimizado",
          owner: "Equipe",
          mode: "Manual",
          finalMessage: "Mensagem sugerida para revisão.",
          future: false,
          automatic: false,
          approvalAvailable: true,
          cancellationAvailable: true,
          deferAvailable: true,
          approvalDecision: { rowNumber: 2 },
          cancellationDecision: { rowNumber: 2 },
        },
      ];
    },
  });
  const day = currentDay(context);
  const token = context.assinaturaPainelDecisoesDiarias_(day);
  const output = context.renderPainelDecisoesDiarias_({ day, token });

  assert.equal(state.spreadsheetReads, 1);
  assert.equal(state.listReads, 1);
  assert.equal(state.lockAttempts, 0);
  assert.equal(state.approvals.length, 0);
  assert.equal(state.cancellations.length, 0);
  assert.equal(state.deferrals.length, 0);
  assert.match(output.content, /Abrir esta página não altera nada/);
  assert.match(output.content, /Confirmar decisões selecionadas/);
  assert.match(output.content, /confirm\(mensagemConfirmacao/);
  assert.doesNotMatch(output.content, /<input[^>]*\schecked(?:\s|=|>)/i);
  assert.doesNotMatch(output.content, /Nunca retomar[^<]*<input/i);
});

test("duplicated decisions fail before locking or writing anything", () => {
  const { context, state } = loadContext();
  const day = currentDay(context);
  const token = context.assinaturaPainelDecisoesDiarias_(day);
  const itemToken = context.assinaturaItemPainelDecisoesDiarias_(
    day,
    "followup:duplicate",
  );
  const result = context.processarDecisoesPainelDiario({
    day,
    token,
    decisions: [
      { itemToken, action: "approve" },
      { itemToken, action: "cancel" },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "conflicting_decisions");
  assert.equal(state.lockAttempts, 0);
  assert.equal(state.spreadsheetReads, 0);
  assert.equal(state.approvals.length, 0);
  assert.equal(state.cancellations.length, 0);
});

test("tomorrow remains a valid defer date even when the panel is used late", () => {
  const { context } = loadContext();
  const late = new Date("2026-09-03T23:45:00-03:00");

  assert.equal(
    context.dataAdiamentoPainelDecisoes_(
      "2026-09-04",
      late,
    ).toISOString(),
    new Date("2026-09-04T09:00:00-03:00").toISOString(),
  );
  assert.equal(
    context.dataAdiamentoPainelDecisoes_("2026-09-03", late),
    null,
  );
  assert.equal(
    context.dataAdiamentoPainelDecisoes_("2026-10-04", late),
    null,
  );
});

test("the processor re-reads each item and applies only still-valid decisions", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "followup:approve",
          rowNumber: 2,
          approvalAvailable: true,
          cancellationAvailable: false,
          deferAvailable: false,
          approvalDecision: { rowNumber: 2, sourceKey: "followup:approve" },
        },
        {
          sourceKey: "followup:cancel",
          rowNumber: 3,
          approvalAvailable: false,
          cancellationAvailable: true,
          deferAvailable: false,
          cancellationDecision: { rowNumber: 3, sourceKey: "followup:cancel" },
        },
        {
          sourceKey: "conversation:defer",
          rowNumber: 4,
          approvalAvailable: false,
          cancellationAvailable: false,
          deferAvailable: true,
        },
      ];
    },
  });
  const day = currentDay(context);
  const token = context.assinaturaPainelDecisoesDiarias_(day);
  const result = context.processarDecisoesPainelDiario({
    day,
    token,
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "followup:approve",
        ),
        action: "approve",
      },
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "followup:cancel",
        ),
        action: "cancel",
      },
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "conversation:defer",
        ),
        action: "defer",
        deferDate: tomorrow(context, day),
      },
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "followup:changed-after-email",
        ),
        action: "approve",
      },
    ],
  });

  assert.equal(state.listReads, 1);
  assert.equal(state.approvals.length, 1);
  assert.equal(state.cancellations.length, 1);
  assert.equal(state.deferrals.length, 1);
  assert.equal(result.approved, 1);
  assert.equal(result.cancelled, 1);
  assert.equal(result.deferred, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.allApplied, false);
  assert.match(result.summary, /1 mantida\(s\) sem alteração/);
  assert.equal(state.releases, 1);
});

test("automatic items cannot be deferred through the panel", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "appointment:auto",
          rowNumber: 8,
          automatic: true,
          approvalAvailable: false,
          cancellationAvailable: false,
          deferAvailable: false,
        },
      ];
    },
  });
  const day = currentDay(context);
  const token = context.assinaturaPainelDecisoesDiarias_(day);
  const result = context.processarDecisoesPainelDiario({
    day,
    token,
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "appointment:auto",
        ),
        action: "defer",
        deferDate: tomorrow(context, day),
      },
    ],
  });

  assert.equal(state.deferrals.length, 0);
  assert.equal(result.deferred, 0);
  assert.equal(result.skipped, 1);
  assert.equal(result.results[0].reason, "item_not_eligible");
});
