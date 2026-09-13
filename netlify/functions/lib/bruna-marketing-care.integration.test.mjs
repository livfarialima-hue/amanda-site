import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { runLeadClassifier } from "./lead-classifier.mjs";
import { applyAnsweredDiscoveryQuestionGuard } from "./openai-shadow.mjs";
import { buildHumanReviewEnvelope, formatHumanReviewEnvelope } from "./human-review-envelope.mjs";
import { ensureReviewAlertSuggestion, sendReviewAlertEmailCopy, sendYCloudReviewAlert } from "./ycloud-review-alert.mjs";

// Synthetic conversations only. No production identities or message identifiers.
function classification(overrides = {}) {
  return { recommendedStatus: "Qualificado", confidence: "high", professional: "amanda",
    procedure: "lifting_cervical", summary: "Solicitou informações.", nextAction: "Responder à solicitação.",
    expectedParty: "clinic", commercialReason: "Em andamento", evidence: "Pedido pessoal.",
    appointmentOutcome: "none", procedureMilestone: "none", ...overrides };
}
async function classify(messages, overrides = {}) {
  let request;
  const result = await runLeadClassifier({ phone: "+5511000000001", currentStatus: "Novo", messages }, {
    env: { OPENAI_API_KEY: "synthetic" },
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return new Response(JSON.stringify({ output_text: JSON.stringify(classification(overrides)) }));
    },
  });
  return { ...result, input: JSON.parse(request.input) };
}
function appsFunctions() {
  const base = "../../../apps-script/clinica-liv-leads/";
  const context = { Date, console };
  vm.runInNewContext(["Code.gs", "LeadClassification.gs"].map(file =>
    readFileSync(new URL(base + file, import.meta.url), "utf8")).join("\n"), context);
  return context;
}

function completionHarness({ latestMessageId = "synthetic-latest" } = {}) {
  const app = appsFunctions();
  const effects = { phases: [], appointments: [], milestones: [], emails: [], queue: [] };
  const leadValues = ["synthetic-opp", "Novo", "unknown", "bruna", "1", "Pessoa Teste", ""];
  const leads = { getLastColumn: () => leadValues.length, getRange: () => ({
    getDisplayValues: () => [leadValues], getDisplayValue: () => "", setValue() {},
  }) };
  const queue = { getRange: (_row, column) => ({
    getDisplayValue: () => column === 9 ? latestMessageId : "synthetic-lease",
    setValue: value => effects.queue.push([column, value]),
    setValues: values => effects.queue.push([column, values]),
  }) };
  const messages = { getLastRow: () => 2, getRange: () => ({ getValues: () => [[
    "+5511000000001", "OUT", new Date(), "synthetic-latest", "", "Vou conferir e retorno.",
    2, "synthetic-opp", "amanda", "Leads", "equipe_humana", "",
  ]] }) };
  const spreadsheet = { getSheetByName: name => name === "_WHATSAPP_MENSAGENS" ? messages : leads };
  app.SpreadsheetApp = { openById: () => spreadsheet, flush() {} };
  app.getOrCreateLeadAuxiliarySheet_ = () => queue;
  app.findClassificationQueueRow_ = () => 2;
  app.localizarLeadPorOportunidadeOuTelefone_ = () => 2;
  app.mapaCabecalhosOportunidade_ = () => ({ "Opportunity ID": 1, "Situação do lead": 2,
    "Relacionamento": 3, "Responsável atual": 4, "Versão da oportunidade": 5, "Nome": 6 });
  app.sincronizarFaseOportunidadeELead_ = (_spreadsheet, phase) => { effects.phases.push(phase); return { ok: true, stage: phase.stage }; };
  app.registrarMarcoAdministrativoClassificado_ = (_sheet, input) => { effects.appointments.push(input); return { updated: true }; };
  app.registrarMarcoOportunidade_ = (_sheet, input) => { effects.milestones.push(input); return { created: true }; };
  app.recordLeadStageEvent_ = () => {};
  app.registrarRevisaoClassificacaoBot_ = () => {};
  app.sendReviewAlertEmail_ = input => { effects.emails.push(input); return { sent: true }; };
  const job = { phone: "+5511000000001", professional: "amanda", opportunityId: "synthetic-opp",
    throughMessageId: "synthetic-latest", leaseToken: "synthetic-lease", claimedVersion: 1 };
  return { app, effects, job };
}

test("completion obtains human authorship from the canonical history without expecting the worker to return messages", () => {
  const { app, effects, job } = completionHarness();
  const result = app.completeLeadClassification_(job, classification());
  assert.equal(result.status, "completed");
  assert.equal(effects.phases[0].owner, "human_team");
  assert.equal(effects.phases[0].relationship, "engaged_lead");
});

test("a new conversation revision prevents all classification effects", () => {
  const { app, effects, job } = completionHarness({ latestMessageId: "synthetic-newer" });
  const result = app.completeLeadClassification_(job, classification());
  assert.equal(result.error, "stale_conversation_revision");
  assert.equal(effects.phases.length + effects.appointments.length + effects.milestones.length, 0);
  assert.ok(effects.queue.some(([column, values]) => column === 5 && values[0][0] === "pending"));
});

test("low-confidence completion preserves the phase and sends review without writing appointment or surgery milestones", () => {
  const { app, effects, job } = completionHarness();
  const result = app.completeLeadClassification_(job, classification({ recommendedStatus: "Paciente convertido",
    confidence: "low", appointmentOutcome: "attended", procedureMilestone: "accepted" }));
  assert.equal(result.appliedStatus, "Novo");
  assert.equal(effects.appointments.length + effects.milestones.length, 0);
  assert.equal(effects.emails.length, 1);
  assert.equal(effects.phases[0].owner, "human_team");
  assert.equal(effects.phases[0].expectedParty, "clinic");
});

test("short procedure answers receive concrete context instead of the repeated discovery question", () => {
  for (const currentMessage of ["Cervicoplastia", "O pescoço", "Tudo por favor"]) {
    const decision = applyAnsweredDiscoveryQuestionGuard({ route: "standard_reply", confidence: "high",
      professional: "amanda", procedure: "lifting_cervical", automaticAllowed: true,
      suggestedReply: "Claro, estamos falando de cervicoplastia. O que você gostaria de entender primeiro sobre o procedimento?" }, {
      currentMessage, recentConversation: [{ role: "assistant", source: "bruna", text: "O que gostaria de entender primeiro?" }],
    });
    assert.doesNotMatch(decision.suggestedReply, /o que.*gostaria.*entender/i);
    assert.match(decision.suggestedReply, /pele, volumes e contorno/);
  }
});

test("removing repeated discovery preserves a useful answer that starts with an acknowledgement", () => {
  const result = applyAnsweredDiscoveryQuestionGuard({ route: "standard_reply", confidence: "high",
    professional: "amanda", procedure: "lifting_cervical", automaticAllowed: true,
    suggestedReply: "Entendi. A consulta custa R$ 500. O que você gostaria de entender primeiro sobre o procedimento?" }, {
    currentMessage: "Queria saber o preço da consulta.",
    recentConversation: [{ role: "assistant", text: "O que gostaria de entender primeiro?" }],
  });
  assert.match(result.suggestedReply, /R\$ 500/);
  assert.doesNotMatch(result.suggestedReply, /gostaria de entender/);
});

test("unanswered marketing prefill remains the clinic's responsibility without qualification", async () => {
  const result = await classify([{ direction: "IN", text: "Interesse na avaliação.", templateId: "procedure_evaluation_v1" }]);
  assert.equal(result.classification.recommendedStatus, "Novo");
  assert.equal(result.classification.expectedParty, "clinic");
  assert.match(result.classification.nextAction, /responder|acolher/i);
});

test("a prefill reply does not erase an explicit clinic commitment", async () => {
  const result = await classify([
    { direction: "IN", text: "Interesse na avaliação.", templateId: "procedure_evaluation_v1" },
    { direction: "OUT", source: "equipe_humana", text: "Vou conferir essa informação e retorno." },
  ], { nextAction: "Cumprir a informação prometida.", expectedParty: "clinic" });
  assert.equal(result.classification.recommendedStatus, "Novo");
  assert.equal(result.classification.expectedParty, "clinic");
  assert.match(result.classification.nextAction, /prometida/);
});

test("classifier retains newest content and human authorship when history exceeds budget", async () => {
  const messages = Array.from({ length: 24 }, (_, index) => ({ direction: index === 23 ? "OUT" : "IN",
    source: index === 23 ? "equipe_humana" : "paciente", at: new Date(Date.UTC(2026, 0, 1, 12, index)).toISOString(),
    text: "Texto sintético. ".repeat(100) + (index === 23 ? "COMPROMISSO_FINAL" : "") }));
  const result = await classify(messages.reverse());
  assert.match(result.input.messages.at(-1).text, /COMPROMISSO_FINAL/);
  assert.equal(result.input.messages.at(-1).source, "equipe_humana");
  assert.ok(result.input.messages.reduce((sum, m) => sum + m.text.length, 0) <= 16000);
});

test("unreadable patient media is represented and cannot be treated as an isolated prefill", async () => {
  const result = await classify([
    { direction: "IN", text: "Interesse.", templateId: "procedure_evaluation_v1" },
    { direction: "OUT", source: "bruna", text: "Qual sua dúvida?" },
    { direction: "IN", text: "", messageId: "synthetic-media" },
  ], { recommendedStatus: "Novo", nextAction: "Revisar conteúdo não textual.", expectedParty: "clinic" });
  assert.equal(result.input.messages.at(-1).contentUnavailable, true);
  assert.equal(result.classification.expectedParty, "clinic");
  assert.match(result.classification.nextAction, /não textual/);
});

test("canonical collection sorts before applying the history limit", () => {
  const app = appsFunctions();
  const rows = [2, 3, 1].map(i => ["+5511000000001", "IN", new Date(Date.UTC(2026, 0, 1, 12, i)),
    `synthetic-${i}`, `synthetic-event-${i}`, `turn-${i}`, 2, "synthetic-opp", "amanda", "Leads", "paciente", ""]);
  const sheet = { getLastRow: () => 4, getRange: () => ({ getValues: () => rows }) };
  const messages = app.collectLeadMessagesForOpportunity_(sheet, "synthetic-opp", "+5511000000001", "amanda", 2);
  assert.deepEqual(Array.from(messages, m => m.text), ["turn-2", "turn-3"]);
});

test("classification cannot advance a phase on uncertain administrative evidence", () => {
  const app = appsFunctions();
  assert.equal(app.shouldApplyLeadStatus_("Novo", "Consulta agendada", "low", true), false);
  assert.equal(app.shouldApplyLeadStatus_("Qualificado", "Paciente convertido", "low", true), false);
  assert.equal(app.relationshipFromClassification_("Consulta realizada", { confidence: "low", procedureMilestone: "completed" }, "known_patient"), "known_patient");
});

test("classification preserves human responsibility and active care without treating replies as takeover release", () => {
  const app = appsFunctions();
  assert.equal(app.ownerFromClassificationContext_({ confidence: "high" }, { messages: [
    { direction: "OUT", source: "equipe_humana" }, { direction: "OUT", source: "bruna" },
  ] }, "new_lead", "bruna"), "human_team");
  assert.equal(app.ownerFromClassificationContext_({ confidence: "high" }, {}, "active_postop", "bruna"), "human_team");
  assert.equal(app.ownerFromClassificationContext_({ confidence: "high" }, {}, "new_lead", "bruna"), "bruna");
});

test("email carries the complete review packet and full draft through both adapters", async () => {
  const draft = "Obrigada por avisar. A equipe vai conferir o documento solicitado antes de orientar o próximo passo.";
  const packet = formatHumanReviewEnvelope(buildHumanReviewEnvelope({ professional: "amanda",
    reason: "document_review", contextSummary: "Contexto sintético administrativo. ".repeat(65), suggestedReply: draft }));
  let sent;
  await sendReviewAlertEmailCopy({ eventId: "synthetic-review", patientPhone: "+5511000000001", messageText: packet }, {
    env: { GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test", GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic" },
    fetchImpl: async (_url, options) => { sent = JSON.parse(options.body).alert; return new Response('{"ok":true}'); },
  });
  assert.ok(sent.messageText.includes(draft));
  assert.ok(sent.messageText.includes("Contexto sintético administrativo. ".repeat(30).trim()));
  const app = appsFunctions();
  const emails = [];
  app.getOrCreateAlertEmailSheet_ = () => ({ appendRow() {} });
  app.findAlertEmailEvent_ = () => null;
  app.SpreadsheetApp = { openById: () => ({}) };
  app.MailApp = { sendEmail: input => emails.push(input) };
  app.sendReviewAlertEmail_(sent);
  assert.ok(emails[0].body.includes(draft));
  assert.equal(emails[0].body.includes("Contexto sintético administrativo. ".repeat(30).trim()), true);
});

test("an explicit no-safe-draft decision cannot be replaced with an invented appointment draft", () => {
  const packet = formatHumanReviewEnvelope(buildHumanReviewEnvelope({ professional: "daniel",
    reason: "known_patient_active_care", contextSummary: "Revisar agenda de retorno com o Dr. Daniel." }));
  const result = ensureReviewAlertSuggestion({ messageText: packet });
  assert.match(result, /SEM SUGESTÃO PRONTA/);
  assert.doesNotMatch(result, /avaliação com a Dra\. Amanda|Quais dias/);
});

test("email review remains available when the optional WhatsApp alert is not configured", async () => {
  let emailCalls = 0;
  await sendYCloudReviewAlert({ eventId: "synthetic-email-only", patientPhone: "+5511000000001", messageText: "SEM SUGESTÃO PRONTA: revisar o documento." }, {
    env: { GOOGLE_SHEETS_WEBHOOK_URL: "https://sheets.example.test", GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic" },
    getHumanResumeControlImpl: async () => null,
    fetchImpl: async () => { emailCalls++; return new Response('{"ok":true}'); },
  });
  assert.equal(emailCalls, 1);
});

test("unavailable content cannot promote an otherwise prefill-only lead", async () => {
  const result = await classify([
    { direction: "IN", text: "Interesse.", templateId: "procedure_evaluation_v1" },
    { direction: "IN", text: "" },
  ], { recommendedStatus: "Paciente convertido", procedureMilestone: "accepted" });
  assert.equal(result.classification.recommendedStatus, "Novo");
  assert.equal(result.classification.procedureMilestone, "none");
  assert.equal(result.classification.confidence, "low");
  assert.equal(result.classification.expectedParty, "clinic");
});

test("a linked message still needs matching patient and professional identity", () => {
  const app = appsFunctions();
  const row = (phone, professional, id) => [phone, "IN", new Date(), id, "", "Sintético", 2, "synthetic-opp", professional];
  const rows = [row("+5511000000002", "amanda", "wrong-person"),
    row("+5511000000001", "daniel", "wrong-professional"),
    row("+5511000000001", "amanda", "correct")];
  const sheet = { getLastRow: () => 4, getRange: () => ({ getValues: () => rows }) };
  assert.deepEqual(Array.from(app.collectLeadMessagesForOpportunity_(sheet,
    "synthetic-opp", "+5511000000001", "amanda", 24), m => m.messageId), ["correct"]);
});

test("a draft above the envelope limit is not presented as complete", () => {
  const envelope = buildHumanReviewEnvelope({ professional: "amanda", suggestedReply: "Texto sintético. ".repeat(150) });
  assert.equal(envelope.suggestedReply, "");
  assert.match(formatHumanReviewEnvelope(envelope), /SEM SUGESTÃO PRONTA/);
});

test("a prepared hospital draft is preserved without adding a second suggestion", () => {
  const text = "NÃO RESPONDER AUTOMATICAMENTE. Sugestão para revisar e copiar:\nVamos conferir o orçamento hospitalar pendente.";
  assert.equal(ensureReviewAlertSuggestion({ messageText: text }), text);
});

test("a short draft survives an abbreviated WhatsApp alert without carrying the long context", () => {
  const draft = "Obrigada pela mensagem. A equipe vai conferir a pendência administrativa informada.";
  const packet = formatHumanReviewEnvelope(buildHumanReviewEnvelope({ professional: "amanda",
    reason: "document_review", suggestedReply: draft, contextSummary: "Contexto sintético. ".repeat(150) }));
  const alert = ensureReviewAlertSuggestion({ messageText: packet });
  assert.ok(alert.length <= 1024);
  assert.ok(alert.includes(draft));
  assert.doesNotMatch(alert, /SEM SUGESTÃO PRONTA/);
});
