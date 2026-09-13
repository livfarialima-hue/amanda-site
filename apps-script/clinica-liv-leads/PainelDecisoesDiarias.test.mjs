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
    permanentStops: [],
    pendingPlanStops: [],
    dismissals: [],
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
    marcarNuncaRetomarPorTelefone_(_spreadsheet, phone, reason) {
      state.permanentStops.push({ phone, reason });
      return { ok: true, alreadyBlocked: false };
    },
    cancelarPlanosPendentesRetomadas_(_spreadsheet, phone) {
      state.pendingPlanStops.push(phone);
      return 1;
    },
    dispensarItensCentralInterno_(_spreadsheet, _sheet, _now, decisions) {
      state.dismissals.push(...decisions);
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
  assert.match(output.content, /Copiar mensagem/);
  assert.match(output.content, /function copiarMensagem/);
  assert.match(output.content, /value="never_follow_up"/);
  assert.match(output.content, /Cancelar retomadas definitivamente/);
  assert.match(output.content, /Lembretes de consulta confirmada continuam/);
  assert.doesNotMatch(output.content, /<input[^>]*\schecked(?:\s|=|>)/i);
  assert.match(output.content, /Nunca retomar/);
});

test("copy-ready text is escaped in HTML and read from the rendered message", () => {
  const { context } = loadContext();
  const html = context.montarCardItemPainelDecisoes_(
    {
      itemToken: "opaque-token",
      sourceKey: "followup:copy",
      phone: "+5511999999999",
      finalMessage: 'Oi, Ana! Use "este" ponto <com calma> & segurança.',
      approvalAvailable: false,
      cancellationAvailable: false,
      deferAvailable: false,
    },
    "2026-09-13",
  );

  assert.match(html, /data-copy-source/);
  assert.match(html, /Copiar mensagem/);
  assert.match(html, /&quot;este&quot;/);
  assert.match(html, /&lt;com calma&gt; &amp; segurança/);
  assert.doesNotMatch(html, /<com calma>/);
});

test("care cards show and copy the exact approvable draft without an email-only envelope", () => {
  const { context } = loadContext({
    textoPrevistoCuidado_: () => "Envelope que não será aprovado",
  });
  const html = context.montarCardItemPainelDecisoes_(
    {
      sourceKey: "care:synthetic",
      itemToken: "care-token",
      phone: "+5511999999999",
      name: "Marina",
      nextAction: "Acompanhamento pós-consulta",
      finalMessage: "Oi, Marina! Ficou alguma dúvida após a consulta?",
    },
    currentDay(context),
  );

  assert.match(html, /Oi, Marina! Ficou alguma dúvida após a consulta\?/);
  assert.doesNotMatch(html, /Envelope que não será aprovado/);
  assert.match(html, /data-copy-source/);
});

test("the copy control sends exactly the rendered message to the clipboard", async () => {
  const { context } = loadContext();
  const page = context.paginaPainelDecisoesDiarias_(
    [],
    "2026-09-13",
    "daily-token",
    "",
  );
  const script = page.match(/<script>([\s\S]+)<\/script>/);
  assert.ok(script);

  let copied = "";
  const feedback = { textContent: "" };
  const sourceNode = {
    textContent: "Oi, Marina! Esta é a mensagem exata.\nCom segunda linha.",
  };
  const messageNode = {
    querySelector(selector) {
      if (selector === "[data-copy-source]") return sourceNode;
      if (selector === ".copy-result") return feedback;
      return null;
    },
  };
  const button = {
    textContent: "Copiar mensagem",
    closest: () => messageNode,
  };
  const browser = {
    Boolean,
    navigator: {
      clipboard: {
        writeText(value) {
          copied = value;
          return Promise.resolve();
        },
      },
    },
    document: {},
    window: {},
    google: { script: { run: {} } },
  };
  vm.createContext(browser);
  vm.runInContext(script[1], browser);
  browser.copiarMensagem(button);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(copied, sourceNode.textContent);
  assert.equal(feedback.textContent, "Mensagem copiada.");
  assert.equal(button.textContent, "Copiada ✓");
});

test("the copy control has a working fallback when clipboard permission is unavailable", () => {
  const { context } = loadContext();
  const page = context.paginaPainelDecisoesDiarias_(
    [],
    "2026-09-13",
    "daily-token",
    "",
  );
  const script = page.match(/<script>([\s\S]+)<\/script>/);
  assert.ok(script);

  let temporaryArea = null;
  const feedback = { textContent: "" };
  const sourceNode = { textContent: "Mensagem preservada no fallback." };
  const messageNode = {
    querySelector(selector) {
      return selector === "[data-copy-source]" ? sourceNode : feedback;
    },
  };
  const button = {
    textContent: "Copiar mensagem",
    closest: () => messageNode,
  };
  const browser = {
    Boolean,
    navigator: {},
    window: {},
    google: { script: { run: {} } },
    document: {
      createElement() {
        temporaryArea = {
          value: "",
          style: {},
          setAttribute() {},
          focus() {},
          select() {},
        };
        return temporaryArea;
      },
      body: {
        appendChild() {},
        removeChild() {},
      },
      execCommand(command) {
        return command === "copy";
      },
    },
  };
  vm.createContext(browser);
  vm.runInContext(script[1], browser);
  browser.copiarMensagem(button);

  assert.equal(temporaryArea.value, sourceNode.textContent);
  assert.equal(feedback.textContent, "Mensagem copiada.");
  assert.equal(button.textContent, "Copiada ✓");
});

test("permanent cancellation is offered for proactive follow-ups but not appointment reminders", () => {
  const { context } = loadContext();
  const followUp = {
    itemToken: "followup-token",
    sourceKey: "followup:synthetic",
    phone: "+5511999999999",
    nextAction: "1ª retomada — cerca de 24h",
  };
  const care = {
    itemToken: "care-token",
    sourceKey: "care:post-consult",
    phone: "+5511888888888",
    nextAction: "Follow-up pós-consulta — 3 dias",
  };
  const reminder = {
    itemToken: "appointment-token",
    sourceKey: "care:appointment-reminder",
    phone: "+5511777777777",
    nextAction: "Lembrete de consulta",
  };

  assert.match(
    context.montarOpcoesItemPainelDecisoes_(followUp, "2026-09-13"),
    /value="never_follow_up"/,
  );
  assert.match(
    context.montarOpcoesItemPainelDecisoes_(care, "2026-09-13"),
    /value="never_follow_up"/,
  );
  assert.doesNotMatch(
    context.montarOpcoesItemPainelDecisoes_(reminder, "2026-09-13"),
    /value="never_follow_up"/,
  );
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

test("permanent cancellation requires an explicit confirmation flag before locking", () => {
  const { context, state } = loadContext();
  const day = currentDay(context);
  const result = context.processarDecisoesPainelDiario({
    day,
    token: context.assinaturaPainelDecisoesDiarias_(day),
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "followup:permanent",
        ),
        action: "never_follow_up",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "permanent_confirmation_required");
  assert.equal(state.lockAttempts, 0);
  assert.equal(state.spreadsheetReads, 0);
  assert.equal(state.permanentStops.length, 0);
  assert.equal(state.pendingPlanStops.length, 0);
});

test("confirmed permanent cancellation blocks only the re-read contact and pending plans", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "followup:permanent",
          rowNumber: 12,
          phone: "+5511999999999",
          nextAction: "2ª retomada — cerca de 72h",
          approvalAvailable: false,
          cancellationAvailable: true,
          deferAvailable: true,
        },
      ];
    },
  });
  const day = currentDay(context);
  const result = context.processarDecisoesPainelDiario({
    day,
    token: context.assinaturaPainelDecisoesDiarias_(day),
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "followup:permanent",
        ),
        action: "never_follow_up",
        confirmedPermanent: true,
      },
    ],
  });

  assert.equal(result.stopped, 1);
  assert.equal(result.skipped, 0);
  assert.deepEqual(state.permanentStops.map((item) => item.phone), [
    "+5511999999999",
  ]);
  assert.deepEqual(state.pendingPlanStops, ["+5511999999999"]);
  assert.match(state.permanentStops[0].reason, /painel diário/i);
  assert.match(result.results[0].message, /Nunca retomar/);
  assert.match(result.results[0].message, /lembretes de consulta confirmada continuam/i);
});

test("a permanent cancellation that cannot find the lead fails closed and keeps plans", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "followup:not-found",
          rowNumber: 13,
          phone: "+5511666666666",
          nextAction: "1ª retomada — cerca de 24h",
        },
      ];
    },
    marcarNuncaRetomarPorTelefone_(_spreadsheet, phone, reason) {
      state.permanentStops.push({ phone, reason });
      return { ok: false, error: "lead_not_found" };
    },
  });
  const day = currentDay(context);
  const result = context.processarDecisoesPainelDiario({
    day,
    token: context.assinaturaPainelDecisoesDiarias_(day),
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "followup:not-found",
        ),
        action: "never_follow_up",
        confirmedPermanent: true,
      },
    ],
  });

  assert.equal(result.stopped, 0);
  assert.equal(result.skipped, 1);
  assert.equal(result.results[0].reason, "lead_not_found");
  assert.equal(state.pendingPlanStops.length, 0);
});

test("permanent cancellation also dismisses the selected proactive care item", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "care:post-consult",
          rowNumber: 21,
          phone: "+5511555555555",
          nextAction: "Follow-up pós-consulta — 14 dias",
        },
      ];
    },
  });
  const day = currentDay(context);
  const item = {
    sourceKey: "care:post-consult",
  };
  const result = context.processarDecisoesPainelDiario({
    day,
    token: context.assinaturaPainelDecisoesDiarias_(day),
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          item.sourceKey,
          context.revisaoCuidadoPainel_(item),
        ),
        action: "never_follow_up",
        confirmedPermanent: true,
      },
    ],
  });

  assert.equal(result.stopped, 1);
  assert.deepEqual(
    state.dismissals.map((item) => [item.rowNumber, item.sourceKey]),
    [[21, "care:post-consult"]],
  );
});

test("a crafted permanent action cannot block an appointment reminder", () => {
  const { context, state } = loadContext({
    listarItensPainelDecisoesCentral_() {
      state.listReads += 1;
      return [
        {
          sourceKey: "care:appointment-reminder",
          rowNumber: 22,
          phone: "+5511444444444",
          nextAction: "Lembrete de consulta — revisão humana",
        },
      ];
    },
  });
  const day = currentDay(context);
  const careRevision = context.revisaoCuidadoPainel_({
    sourceKey: "care:appointment-reminder",
  });
  const result = context.processarDecisoesPainelDiario({
    day,
    token: context.assinaturaPainelDecisoesDiarias_(day),
    decisions: [
      {
        itemToken: context.assinaturaItemPainelDecisoesDiarias_(
          day,
          "care:appointment-reminder",
          careRevision,
        ),
        action: "never_follow_up",
        confirmedPermanent: true,
      },
    ],
  });

  assert.equal(result.stopped, 0);
  assert.equal(result.results[0].reason, "item_not_eligible");
  assert.equal(state.permanentStops.length, 0);
  assert.equal(state.dismissals.length, 0);
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
