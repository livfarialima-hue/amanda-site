import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const codeSource = readFileSync(new URL("./Code.gs", import.meta.url), "utf8");
const opportunitySource = readFileSync(
  new URL("./OpportunityStore.gs", import.meta.url),
  "utf8",
);
const classificationSource = readFileSync(
  new URL("./LeadClassification.gs", import.meta.url),
  "utf8",
);
const reconciliationSource = readFileSync(
  new URL("./ClassificationReconciliation.gs", import.meta.url),
  "utf8",
);

function loadFunctions() {
  const sandbox = { console, Date, JSON, Math, Number, Object, Set, String };
  vm.runInNewContext(
    `${codeSource}\n${opportunitySource}\n${classificationSource}\n` +
      `${reconciliationSource}\n` +
      "globalThis.__test = { candidatosReconciliacaoClassificacao_, " +
      "dataReconciliacaoClassificacao_, CLASSIFICATION_RECONCILIATION_CONFIG };",
    sandbox,
  );
  return sandbox.__test;
}

function opportunity(id, overrides = {}) {
  const row = Array(26).fill("");
  row[0] = id;
  row[1] = overrides.phone || "5511999999999";
  row[3] = overrides.professional || "amanda";
  row[4] = overrides.sheetName || "Google Ads - Conversões";
  row[6] = overrides.state || "open";
  row[7] = overrides.stage || "Novo";
  return row;
}

function queue(id, overrides = {}) {
  const row = Array(20).fill("");
  row[0] = overrides.phone || "5511999999999";
  row[4] = overrides.state || "done";
  row[7] = overrides.throughMessageId || "in-1";
  row[16] = id;
  row[17] = overrides.professional || "amanda";
  row[18] = overrides.sheetName || "Google Ads - Conversões";
  return row;
}

function message(id, messageId, at, overrides = {}) {
  const row = Array(12).fill("");
  row[0] = overrides.phone || "5511999999999";
  row[1] = overrides.direction || "OUT";
  row[2] = at;
  row[3] = messageId;
  row[5] = Object.hasOwn(overrides, "text") ? overrides.text : "Resposta";
  row[7] = id;
  row[8] = overrides.professional || "amanda";
  row[9] = overrides.sheetName || "Google Ads - Conversões";
  row[10] = overrides.source || "bruna";
  return row;
}

function auditEvent(id, at) {
  const row = Array(13).fill("");
  row[0] = at;
  row[2] = id;
  row[4] = "human_conversation_audit";
  row[10] = "human_override_applied";
  return row;
}

test("periodic reconciliation requeues a completed job after a newer outbound turn", () => {
  const { candidatosReconciliacaoClassificacao_ } = loadFunctions();
  const id = "opp_example_12345678";
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: [queue(id)],
    opportunityRows: [opportunity(id)],
    messageRows: [
      message(id, "in-1", "2026-09-10T12:00:00-03:00", {
        direction: "IN",
        source: "paciente",
      }),
      message(id, "out-2", "2026-09-10T12:02:00-03:00"),
    ],
    phaseEventRows: [],
    now: "2026-09-12T12:00:00-03:00",
    lookbackDays: 90,
    limit: 20,
  });

  assert.equal(plan.totalCandidates, 1);
  assert.equal(plan.candidates[0].latestMessageId, "out-2");
  assert.equal(plan.candidates[0].messageCount, 2);
  assert.equal(plan.candidates[0].latestDirection, "OUT");
});

test("current queue, running queue and closed opportunity are not requeued", () => {
  const { candidatosReconciliacaoClassificacao_ } = loadFunctions();
  const current = "opp_current_12345678";
  const running = "opp_running_12345678";
  const closed = "opp_closed_12345678";
  const rows = [
    message(current, "out-current", "2026-09-10T12:02:00-03:00"),
    message(running, "out-running", "2026-09-10T12:02:00-03:00"),
    message(closed, "out-closed", "2026-09-10T12:02:00-03:00"),
  ];
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: [
      queue(current, { throughMessageId: "out-current" }),
      queue(running, { state: "running" }),
      queue(closed),
    ],
    opportunityRows: [
      opportunity(current),
      opportunity(running),
      opportunity(closed, { state: "closed" }),
    ],
    messageRows: rows,
    phaseEventRows: [],
    now: "2026-09-12T12:00:00-03:00",
    lookbackDays: 90,
    limit: 20,
  });

  assert.equal(plan.totalCandidates, 0);
  assert.equal(plan.reasons.already_current, 1);
  assert.equal(plan.reasons.queue_not_done, 1);
  assert.equal(plan.reasons.opportunity_not_open, 1);
});

test("a newer human conversation audit protects its reviewed result", () => {
  const { candidatosReconciliacaoClassificacao_ } = loadFunctions();
  const id = "opp_audited_12345678";
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: [queue(id)],
    opportunityRows: [opportunity(id)],
    messageRows: [message(id, "out-2", "2026-09-10T12:02:00-03:00")],
    phaseEventRows: [auditEvent(id, "2026-09-11T09:00:00-03:00")],
    now: "2026-09-12T12:00:00-03:00",
    lookbackDays: 90,
    limit: 20,
  });

  assert.equal(plan.totalCandidates, 0);
  assert.equal(plan.reasons.human_audit_is_current, 1);
});

test("periodic cutover ignores legacy backlog and accepts later messages", () => {
  const { candidatosReconciliacaoClassificacao_ } = loadFunctions();
  const legacy = "opp_legacy_12345678";
  const future = "opp_future_12345678";
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: [queue(legacy), queue(future)],
    opportunityRows: [opportunity(legacy), opportunity(future)],
    messageRows: [
      message(legacy, "out-legacy", "2026-09-11T12:00:00-03:00"),
      message(future, "out-future", "2026-09-12T12:01:00-03:00"),
    ],
    phaseEventRows: [],
    now: "2026-09-12T13:00:00-03:00",
    notBefore: "2026-09-12T12:00:00-03:00",
    lookbackDays: 90,
    limit: 20,
  });

  assert.equal(plan.totalCandidates, 1);
  assert.equal(plan.candidates[0].opportunityId, future);
  assert.equal(plan.reasons.before_activation, 1);
});

test("empty media-only activity and messages outside the lookback fail closed", () => {
  const { candidatosReconciliacaoClassificacao_ } = loadFunctions();
  const media = "opp_media_12345678";
  const old = "opp_old_12345678";
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: [queue(media), queue(old)],
    opportunityRows: [opportunity(media), opportunity(old)],
    messageRows: [
      message(media, "media-2", "2026-09-10T12:02:00-03:00", { text: "" }),
      message(old, "out-old", "2026-01-01T12:02:00-03:00"),
    ],
    phaseEventRows: [],
    now: "2026-09-12T12:00:00-03:00",
    lookbackDays: 90,
    limit: 20,
  });

  assert.equal(plan.totalCandidates, 0);
  assert.equal(plan.reasons.latest_message_without_text, 1);
  assert.equal(plan.reasons.no_recent_message, 1);
});

test("backlog is oldest-first and bounded per execution", () => {
  const { candidatosReconciliacaoClassificacao_, CLASSIFICATION_RECONCILIATION_CONFIG } =
    loadFunctions();
  const ids = ["opp_late_12345678", "opp_early_12345678"];
  const plan = candidatosReconciliacaoClassificacao_({
    queueRows: ids.map((id) => queue(id)),
    opportunityRows: ids.map((id) => opportunity(id)),
    messageRows: [
      message(ids[0], "late", "2026-09-11T12:00:00-03:00"),
      message(ids[1], "early", "2026-09-10T12:00:00-03:00"),
    ],
    phaseEventRows: [],
    now: "2026-09-12T12:00:00-03:00",
    lookbackDays: 90,
    limit: 1,
  });

  assert.equal(plan.totalCandidates, 2);
  assert.equal(plan.candidates.length, 1);
  assert.equal(plan.candidates[0].opportunityId, ids[1]);
  assert.equal(plan.deferred, 1);
  assert.equal(CLASSIFICATION_RECONCILIATION_CONFIG.intervalMinutes, 15);
  assert.equal(CLASSIFICATION_RECONCILIATION_CONFIG.maximumRequeuesPerRun, 20);
});
