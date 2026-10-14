import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createHash } from "node:crypto";

const source = readFileSync(
  new URL("./KnowledgeBase.gs", import.meta.url),
  "utf8",
);

function runtime() {
  const context = vm.createContext({ console });
  vm.runInContext(source, context, { filename: "KnowledgeBase.gs" });
  return context;
}

function memorySheet(initial) {
  const rows = initial.map(row => [...row]);
  return { rows, getLastRow: () => rows.length, appendRow: row => rows.push([...row]),
    getRange: (r, c, n = 1, w = 1) => ({
      getValues: () => rows.slice(r - 1, r - 1 + n).map(row => Array.from({ length: w }, (_, i) => row[c - 1 + i] ?? "")),
      getValue: () => rows[r - 1][c - 1],
      createTextFinder: text => ({ matchEntireCell: () => ({ findNext: () => {
        const offset = rows.slice(r - 1, r - 1 + n).findIndex(row => String(row[c - 1]) === text);
        return offset < 0 ? null : { getRow: () => r + offset };
      } }) }),
      setValues: values => values.forEach((row, i) => row.forEach((value, j) => { rows[r - 1 + i] ||= []; rows[r - 1 + i][c - 1 + j] = value; })),
      setValue: value => { rows[r - 1][c - 1] = value; },
    }),
  };
}

function learningRuntime() {
  const c = runtime();
  const approved = memorySheet([Array(22).fill("")]), questions = memorySheet([Array(15).fill("")]);
  const messages = memorySheet([Array(14).fill("")]), reviews = memorySheet([Array(13).fill("")]);
  const props = new Map([["BRUNA_KB_SNAPSHOT", "kb-synthetic"]]);
  c.CONFIG = { spreadsheetId: "synthetic", messageSheetName: "_WHATSAPP_MENSAGENS" };
  c.SpreadsheetApp = { openById: () => ({ getSheetByName: name => name === "_WHATSAPP_MENSAGENS" ? messages : name === "Revisões do Bot" ? reviews : null }) };
  c.obterPlanilhaRespostasAprovadas_ = () => approved;
  c.obterPlanilhaDuvidasBot_ = () => questions;
  c.obterPlanilhaRevisoesBot_ = () => reviews;
  c.registrarCorrecaoRecenteConhecimento_ = () => false;
  c.Utilities = { formatDate: () => "20990101", getUuid: () => "synthetic-uuid",
    DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
    computeDigest: (algorithm, value) => Array.from(createHash(algorithm).update(value).digest()) };
  c.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props.get(k), setProperty: (k, v) => props.set(k, v) }) };
  c.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
  c.Session = { getActiveUser: () => ({ getEmail: () => "synthetic@example.org" }) };
  return { c, approved, questions, props, messages, reviews };
}

const PHONE = "+5511900000000";
function pendingRow(id, overrides = {}) {
  const row = [id, PHONE, "Pessoa Sintética", "2026-10-10T12:00:00Z", "Vocês fornecem nota?", "Nota fiscal", "", "Baixo", 0,
    "Aguardando resposta humana", "", "", "2026-10-10T12:00:01Z", "", ""];
  for (const [column, value] of Object.entries(overrides)) row[Number(column)] = value;
  return row;
}
function linkMessage(messages, eventId, { human = false, opportunityId = "opp-synthetic", professional = "amanda", relatedMessageId = "", at } = {}) {
  messages.appendRow([PHONE, human ? "OUT" : "IN", at || (human ? "2026-10-10T12:05:00Z" : "2026-10-10T12:00:00Z"),
    "message-" + eventId, eventId, human ? "Emitimos nota fiscal da consulta." : "Mensagem sintética", "", opportunityId, professional, "", human ? "human" : "patient", "", "text", relatedMessageId]);
  messages.rows.splice(1, messages.rows.length - 1, ...messages.rows.slice(1).sort((a, b) => Date.parse(a[2]) - Date.parse(b[2])));
}
function boundAnswer(c, row, eventId = "human-one") {
  return { phone: PHONE, humanAnswer: "Emitimos nota fiscal da consulta.", humanLearningProtocol: "human-learning-v2", eventId,
    sourceQuestionId: row[0], questionRevision: c.revisaoDuvidaConhecimento_(row),
    conversationRevision: c.hashRevisaoConhecimento_(c.SpreadsheetApp.openById().getSheetByName("_WHATSAPP_MENSAGENS").rows.slice(1)),
    opportunityId: "opp-synthetic", professional: "amanda" };
}
function safeProposal(input) {
  return { ...input, version: "learning-proposal-v2", answersQuestion: true, risk: "Baixo",
    subject: "Nota fiscal", question: "Emitem nota fiscal?", answer: "Emitimos nota fiscal da consulta.", boundaries: "Somente nota fiscal da consulta." };
}

for (const hasPending of [false, true]) test(`an explicit correction suspends used knowledge even with another pending question: ${hasPending}`, () => {
  const c = runtime(), reviews = [];
  const now = new Date("2026-10-11T15:00:00Z");
  const original = "Emitimos nota fiscal da consulta.";
  const approved = memorySheet([Array(22).fill(""), ["KB-INVOICE", "Aprovada", "Automática", "Baixo", "Nota fiscal", "", original, "Somente consulta", "", "", "", "", 0, "", 0, "Revisão humana", "1", "active", "kb-synthetic"]]);
  const usage = memorySheet([Array(7).fill(""), [new Date(now.getTime() - 60000), "synthetic-send", "+5511900000000", "KB-INVOICE", "Emitem nota?", original, "Enviada"]]);
  c.obterPlanilhaUsoRespostas_ = () => usage;
  c.obterPlanilhaRespostasAprovadas_ = () => approved;
  c.registrarRevisaoBot_ = (_sheet, review) => reviews.push(review);
  const questions = memorySheet([Array(15).fill("")]);
  if (hasPending) questions.appendRow(["synthetic-pending", "+5511900000000", "Pessoa Sintética", "", "E o relatório?", "Relatório", "", "Baixo", 0, "Aguardando resposta humana", "", "", "", "", ""]);
  c.CONFIG = { spreadsheetId: "synthetic" };
  c.SpreadsheetApp = { openById: () => ({}) };
  c.obterPlanilhaDuvidasBot_ = () => questions;
  const result = c.registrarRespostaHumanaAprendizado_({ phone: "+5511900000000", humanLearningProtocol: "human-learning-v2", humanAnswer: "Corrigindo: vou conferir seu documento individualmente.", at: now.toISOString() });
  assert.equal(result.ok, true);
  assert.equal(approved.rows[1][1], "Revisar");
  assert.equal(approved.rows[1][17], "review");
  assert.equal(approved.rows[1][14], 1);
  assert.equal(approved.rows[1][6], original);
  assert.match(usage.rows[1][6], /revisar/);
  assert.equal(reviews.filter(review => review.type === "Correção de resposta").length, 1);
  assert.equal(c.regraConhecimentoAtiva_(approved.rows[1], now, "kb-synthetic"), false);
});

test("semantic lookup includes approved zero-overlap facts and excludes expired or unapproved rows", () => {
  const { c, approved } = learningRuntime();
  const row = ["KB-SYNTHETIC", "Aprovada", "Automática", "Baixo", "Estacionamento", "Vagas", "Há estacionamento.", "Somente localização", "", "", "", "", 0, "", 0, "Revisão humana", "1", "active", "kb-synthetic"];
  approved.appendRow(row);
  approved.appendRow(row.map((v, i) => i === 0 ? "EXPIRED" : i === 11 ? "2000-01-01" : v));
  approved.appendRow(row.map((v, i) => i === 0 ? "DRAFT" : i === 1 ? "Revisar" : v));
  const context = c.obterContextoConhecimentoBot_({ question: "Consigo parar meu automóvel aí?" });
  assert.equal(context.candidates.length, 1);
  assert.equal(context.candidates[0].score, 0);
  assert.equal(context.candidates[0].source, "Revisão humana");
  assert.equal(context.catalogTruncated, false);
  assert.equal(context.humanLearningProtocol, "human-learning-v2");
});

test("the new receiver rejects legacy or unknown learning protocols before any writes", () => {
  const { c, questions, approved } = learningRuntime();
  questions.appendRow(pendingRow("question-one"));
  let corrections = 0;
  c.registrarCorrecaoRecenteConhecimento_ = () => { corrections++; return true; };
  const before = JSON.stringify(questions.rows);
  for (const protocol of [undefined, "human-learning-v1", "human-learning-v3"]) {
    const result = c.registrarRespostaHumanaAprendizado_({ phone: PHONE, answer: "Corrigindo: emitimos nota.",
      humanAnswer: "Corrigindo: emitimos nota.", humanLearningProtocol: protocol });
    assert.equal(result.captured, false);
    assert.equal(result.reason, "human_learning_protocol_unavailable");
  }
  const legacyField = c.registrarRespostaHumanaAprendizado_({ phone: PHONE, answer: "Emitimos nota.", humanLearningProtocol: "human-learning-v2" });
  assert.equal(legacyField.error, "invalid_human_learning_answer");
  assert.equal(corrections, 0);
  assert.equal(JSON.stringify(questions.rows), before);
  assert.equal(approved.rows.length, 1);
});

test("general proposals consolidate equal facts without importing individual answers or approving them", () => {
  const { c, approved, questions, messages } = learningRuntime();
  const one = pendingRow("question-one"); questions.appendRow(one);
  linkMessage(messages, "question-one"); linkMessage(messages, "human-one", { human: true });
  const input = boundAnswer(c, one);
  const first = c.registrarRespostaHumanaAprendizado_({ ...input, proposal: safeProposal(input) });
  assert.equal(first.proposalCreated, true);
  assert.equal(approved.rows[1][1], "Revisar");
  assert.equal(approved.rows[1][6], "Emitimos nota fiscal da consulta.");
  assert.equal(questions.rows[1][9], "Resposta capturada");
  assert.equal(c.regraConhecimentoAtiva_(approved.rows[1], new Date(), "kb-synthetic"), false);
  const two = pendingRow("question-two"); questions.appendRow(two);
  linkMessage(messages, "question-two"); linkMessage(messages, "human-two", { human: true });
  const next = boundAnswer(c, two, "human-two");
  const replay = c.registrarRespostaHumanaAprendizado_({ ...next, eventId: "human-one", proposal: safeProposal(next) });
  assert.equal(replay.duplicate, true);
  assert.equal(questions.rows[2][9], "Aguardando resposta humana");
  const second = c.registrarRespostaHumanaAprendizado_({ ...next, proposal: safeProposal(next) });
  assert.equal(second.consolidated, true);
  assert.equal(second.ruleId, first.ruleId);
  assert.equal(approved.rows.length, 2);
  const three = pendingRow("question-three"); questions.appendRow(three);
  linkMessage(messages, "question-three"); linkMessage(messages, "human-three", { human: true });
  const third = boundAnswer(c, three, "human-three");
  const stale = c.registrarRespostaHumanaAprendizado_({ ...third, proposal: safeProposal(next) });
  assert.equal(stale.captured, false);
  const personal = safeProposal(third); personal.answer = "Pessoa, isso está combinado para seu caso.";
  assert.equal(c.validarPropostaConhecimento_(personal, three), null);
  c.registrarRespostaHumanaAprendizado_({ ...third, humanAnswer: "Uma resposta individual sem proposta reutilizável." });
  assert.equal(questions.rows[3][9], "Aguardando resposta humana");
  assert.equal(approved.rows.length, 2);
});

test("promotion rejects invalid selections without partial changes and one review keeps active facts", () => {
  const { c, approved, props } = learningRuntime();
  const row = id => [id, "Aprovada", "Automática", "Baixo", "Assunto", "Pergunta", "Fato geral", "Somente dúvida geral", "", "", "", "", 0, "", 0, "Revisão", "1", "active", "kb-synthetic", "", "", ""];
  approved.appendRow(row("EXISTING"));
  const next = row("NEW"); next[1] = "Revisar"; next[17] = ""; approved.appendRow(next);
  const baseline = JSON.stringify(approved.rows);
  assert.throws(() => c.promoverSnapshotConhecimentoBot("kb-next", ["EXISTING", "MISSING"]), /precisam/);
  assert.equal(JSON.stringify(approved.rows), baseline);
  assert.throws(() => c.promoverSnapshotConhecimentoBot("kb-next", ["NEW"], { id: "NEW", reviewed: "stale", keepActive: true }), /mudou/);
  assert.equal(JSON.stringify(approved.rows), baseline);
  const result = c.promoverSnapshotConhecimentoBot("kb-next", ["NEW"], { id: "NEW", reviewed: JSON.stringify(next.slice(0, 12)), keepActive: true });
  assert.equal(result.promoted, 2);
  assert.equal(approved.rows[2][1], "Aprovada");
  assert.equal(props.get("BRUNA_KB_SNAPSHOT"), "kb-next");
});

test("pending lookup requires one canonical question, event, opportunity and professional", () => {
  const { c, questions, messages } = learningRuntime();
  questions.appendRow(pendingRow("question-one"));
  linkMessage(messages, "question-one"); linkMessage(messages, "human-one", { human: true });
  const lookup = overrides => c.obterContextoConhecimentoBot_({ phone: PHONE, eventId: "human-one", forLearning: true, ...overrides }).pendingQuestion;
  assert.equal(lookup().eventId, "question-one");
  assert.match(lookup().questionRevision, /^[a-f0-9]{64}$/);
  assert.equal(lookup({ professional: "daniel" }), null);
  assert.equal(lookup({ opportunityId: "another-opportunity" }), null);
  assert.equal(lookup({ eventId: "not-persisted" }), null);
  questions.appendRow(pendingRow("question-two")); linkMessage(messages, "question-two");
  assert.equal(lookup(), null, "never select the newest of two questions");
  assert.equal(lookup({ sourceQuestionId: "question-one" }).eventId, "question-one");
  const human = messages.rows.find(row => row[4] === "human-one");
  human[13] = "message-question-two";
  assert.equal(lookup().eventId, "question-two");
  assert.equal(lookup({ relatedMessageId: "message-question-one" }), null, "caller cannot forge a quoted message");
  human[13] = "";
  messages.rows.find(row => row[4] === "question-two")[8] = "daniel";
  assert.equal(lookup(), null, "a human echo is ambiguous across professionals too");
  messages.rows[1][7] = "";
  assert.equal(lookup({ sourceQuestionId: "question-one" }), null, "legacy missing identity stays unresolved");
});

for (const scenario of ["null", "promise", "partial", "question_changed", "risk_changed", "professional_changed", "old_human", "missing_time", "missing_revision", "clinical", "new_patient", "new_human", "message_edited", "author_edited", "answer_mismatch", "missing_conversation_revision"]) {
  test(`unsafe learning preserves the pending question and approved catalog: ${scenario}`, () => {
    const { c, questions, messages, approved } = learningRuntime();
    const row = pendingRow("question-one"); questions.appendRow(row);
    linkMessage(messages, "question-one"); linkMessage(messages, "human-one", { human: true });
    const input = boundAnswer(c, row); input.proposal = safeProposal(input);
    if (scenario === "null") input.proposal = null;
    if (scenario === "promise") {
      input.humanAnswer = messages.rows[2][5] = "Vou conferir com a equipe.";
      input.conversationRevision = input.proposal.conversationRevision = c.hashRevisaoConhecimento_(messages.rows.slice(1));
    }
    if (scenario === "partial") input.proposal.answersQuestion = false;
    if (scenario === "question_changed") questions.rows[1][4] += " E o relatório?";
    if (scenario === "risk_changed") questions.rows[1][7] = "Alto";
    if (scenario === "professional_changed") messages.rows[2][8] = "daniel";
    if (scenario === "old_human") messages.rows[2][2] = "2026-10-10T11:59:00Z";
    if (scenario === "missing_time") questions.rows[1][12] = "";
    if (scenario === "missing_revision") input.questionRevision = "";
    if (scenario === "missing_conversation_revision") input.conversationRevision = "";
    if (scenario === "new_patient") linkMessage(messages, "later-patient", { at: "2026-10-10T12:06:00Z" });
    if (scenario === "new_human") linkMessage(messages, "later-human", { human: true, at: "2026-10-10T12:06:00Z" });
    if (scenario === "message_edited") messages.rows[1][5] = "A pergunta foi editada sem atualizar a dúvida.";
    if (scenario === "author_edited") messages.rows[2][10] = "bruna";
    if (scenario === "answer_mismatch") input.humanAnswer = "Enviamos todos os documentos solicitados.";
    if (scenario === "clinical") {
      questions.rows[1][7] = "Médio";
      input.questionRevision = c.revisaoDuvidaConhecimento_(questions.rows[1]);
      input.proposal.questionRevision = input.questionRevision;
    }
    const before = JSON.stringify(questions.rows);
    assert.equal(c.registrarRespostaHumanaAprendizado_(input).captured, false);
    assert.equal(JSON.stringify(questions.rows), before);
    assert.equal(approved.rows.length, 1);
  });
}

test("clarification revalidates the question and its receipt prevents duplicate merges", () => {
  const { c, questions, messages } = learningRuntime();
  const row = pendingRow("question-one", { 9: "Aguardando esclarecimento" }); questions.appendRow(row);
  linkMessage(messages, "question-one"); linkMessage(messages, "clarification", { at: "2099-01-01T12:00:00Z" });
  const originalRevision = c.revisaoDuvidaConhecimento_(row);
  const input = { phone: PHONE, eventId: "clarification", sourceQuestionId: "question-one", questionRevision: originalRevision,
    conversationRevision: c.hashRevisaoConhecimento_(messages.rows.slice(1)),
    opportunityId: "opp-synthetic", professional: "amanda", question: "A nota é referente à consulta.", risk: "Baixo" };
  assert.equal(c.registrarDuvidaBot_(input).updated, true);
  assert.match(questions.rows[1][4], /Esclarecimento/);
  assert.notEqual(c.revisaoDuvidaConhecimento_(questions.rows[1]), originalRevision);
  const after = JSON.stringify(questions.rows);
  assert.equal(c.registrarDuvidaBot_(input).duplicate, true);
  assert.equal(JSON.stringify(questions.rows), after);
  linkMessage(messages, "another-clarification", { at: "2099-01-01T12:01:00Z" });
  assert.equal(c.registrarDuvidaBot_({ ...input, eventId: "another-clarification" }).created, true);
  assert.equal(JSON.stringify(questions.rows.slice(0, 2)), after);
  assert.equal(questions.rows[2][0], "another-clarification");
});

for (const failure of ["before_question_update", "after_question_update"]) test(`clarification receipt recovers partial failure without losing or duplicating the question: ${failure}`, () => {
  const { c, questions, messages, reviews } = learningRuntime();
  const row = pendingRow("question-one", { 9: "Aguardando esclarecimento" }); questions.appendRow(row);
  linkMessage(messages, "question-one"); linkMessage(messages, "clarification", { at: "2099-01-01T12:00:00Z" });
  const input = { phone: PHONE, eventId: "clarification", sourceQuestionId: "question-one",
    questionRevision: c.revisaoDuvidaConhecimento_(row), conversationRevision: c.hashRevisaoConhecimento_(messages.rows.slice(1)),
    opportunityId: "opp-synthetic", professional: "amanda", question: "A nota é da consulta.", risk: "Baixo", status: "Aguardando resposta humana" };
  const target = failure === "before_question_update" ? questions : reviews;
  const getRange = target.getRange;
  let failed = false;
  target.getRange = (...args) => {
    const range = getRange(...args);
    const method = failure === "before_question_update" ? "setValues" : "setValue";
    const original = range[method];
    range[method] = value => {
      if (!failed && args[0] === 2 && args[1] === (failure === "before_question_update" ? 5 : 9)) {
        failed = true; throw new Error("synthetic sheet write failure");
      }
      return original(value);
    };
    return range;
  };
  assert.throws(() => c.registrarDuvidaBot_(input), /synthetic sheet write failure/);
  assert.equal(reviews.rows[1][8], "Em preparo");
  assert.equal(questions.rows[1][4].includes("Esclarecimento"), failure === "after_question_update");
  assert.equal(c.registrarDuvidaBot_(input).updated, true);
  assert.equal(reviews.rows[1][8], "Aplicado");
  assert.equal(questions.rows.length, 2);
  assert.equal(questions.rows[1][4].split("Esclarecimento:").length, 2);
  assert.equal(reviews.rows.filter(row => row[11] === "unknown-response:clarification").length, 1);
  assert.equal(c.registrarDuvidaBot_(input).duplicate, true);
  assert.equal(questions.rows.length, 2);
});

test("clarification without a conversation revision preserves both questions separately", () => {
  const { c, questions, messages } = learningRuntime();
  const row = pendingRow("question-one", { 9: "Aguardando esclarecimento" }); questions.appendRow(row);
  linkMessage(messages, "question-one"); linkMessage(messages, "clarification", { at: "2099-01-01T12:00:00Z" });
  const result = c.registrarDuvidaBot_({ phone: PHONE, eventId: "clarification", sourceQuestionId: "question-one",
    questionRevision: c.revisaoDuvidaConhecimento_(row), question: "A nota é da consulta.", risk: "Baixo" });
  assert.equal(result.created, true);
  assert.equal(questions.rows[1][4], row[4]);
  assert.equal(questions.rows[2][4], "A nota é da consulta.");
});

test("knowledge matching ignores common words and prioritizes the subject", () => {
  const context = runtime();
  const score = vm.runInContext(
    `pontuarConhecimento_(
      "A clínica tem estacionamento?",
      "Estacionamento da clínica",
      "Onde estacionar; tem estacionamento",
      ""
    )`,
    context,
  );

  assert.ok(score > 0.8);
});

test("only promoted rules from the active snapshot become candidates", () => {
  const context = runtime();
  const active = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-1", "Aprovada", "Automática", "Baixo", "Assunto", "", "Resposta",
      "", "", "", "", "", "", "", "", "", "1", "active", "kb-2026-08-11"
    ], new Date("2026-08-09T12:00:00Z"), "kb-2026-08-11")`,
    context,
  );
  const highRisk = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-2", "Aprovada", "Automática", "Alto", "Assunto", "", "Resposta",
      "", "", "", "", "", "", "", "", "", "1", "active", "kb-2026-08-11"
    ], new Date("2026-08-09T12:00:00Z"), "kb-2026-08-11")`,
    context,
  );

  assert.equal(active, true);
  assert.equal(highRisk, false);
  const draft = vm.runInContext(
    `regraConhecimentoAtiva_([
      "KB-3", "Aprovada", "Automática", "Baixo", "Assunto", "", "Resposta",
      "", "", "", "", "", "", "", "", "", "1", "review", "kb-2026-08-11"
    ], new Date("2026-08-09T12:00:00Z"), "kb-2026-08-11")`,
    context,
  );
  assert.equal(draft, false);
});

test("captured human answers default to safer modes by risk", () => {
  const context = runtime();

  assert.equal(
    vm.runInContext(`modoPadraoConhecimento_("Baixo")`, context),
    "Automática",
  );
  assert.equal(
    vm.runInContext(`modoPadraoConhecimento_("Médio")`, context),
    "Sugestão interna",
  );
  assert.equal(
    vm.runInContext(`modoPadraoConhecimento_("Alto")`, context),
    "Nunca automática",
  );
});

test("unknown reviews keep a draft only for low or medium internal use", () => {
  const context = runtime();
  const input = {
    suggestedReply:
      "Resposta contextual para a equipe conferir antes de copiar.",
  };

  assert.equal(
    context.rascunhoInternoAprendizadoSeguro_(input, "Médio"),
    input.suggestedReply,
  );
  assert.equal(
    context.rascunhoInternoAprendizadoSeguro_(input, "Alto"),
    "",
  );
});

test("an unanswered unknown creates an operational response review with context", () => {
  const context = runtime();
  let recorded = null;
  context.registrarRevisaoBot_ = (_spreadsheet, input) => {
    recorded = input;
    return { ok: true, created: true, row: 2 };
  };
  const result = context.registrarRevisaoDuvidaBot_(
    {},
    {
      eventId: "evt-synthetic",
      phone: "+5511999999999",
      patientName: "Paciente Teste",
      receivedAt: new Date("2026-08-20T12:19:00-03:00"),
      subject: "comparação de técnicas",
      status: "Aguardando resposta humana",
      suggestedReply: "Rascunho seguro para conferência.",
      confidence: "low",
    },
    "Médio",
    "Qual é a diferença entre as técnicas?",
    "bruna: Posso te orientar.",
    new Date("2026-08-20T12:19:10-03:00"),
  );

  assert.equal(result.ok, true);
  assert.equal(recorded.type, "Resposta");
  assert.equal(recorded.priority, "Alta");
  assert.equal(recorded.status, "Aberta");
  assert.equal(recorded.key, "unknown-response:evt-synthetic");
  assert.match(recorded.context, /Pergunta da paciente:/);
  assert.equal(recorded.suggestion, "Rascunho seguro para conferência.");
});


test("administrative catalog matches an isolated question and rejects broader or clinical requests",()=>{
  const c=runtime();
  for(const text of ["Envia oendereco.por fafor.","Pode enviar o endereço, porfavor?","Qual o endereço?","Onde fica a clínica?","Qual o valor da consulta?","Parcelam a consulta?","Como funciona a avaliação?"]){
    assert.ok(c.classificarPerguntaAdministrativaSegura_(text,"amanda"),text);
    assert.equal(c.classificarPerguntaAdministrativaSegura_(text,"daniel"),null,text);
  }
  for(const text of ["Envia o endereço e remarca para as 10h","Envia o endereço. Estou com falta de ar","Quanto custa a cirurgia?","Qual o endereço e posso operar tomando remédio?","Estou com febre","Não quero saber o endereço","Qual o endereço da outra clínica?","Pode confirmar amanhã às 10?"])
    assert.equal(c.classificarPerguntaAdministrativaSegura_(text,"amanda"),null,text);
});

test("approved catalog publication is idempotent and refuses unrelated or edited knowledge",()=>{
  const rows=[Array(22).fill("")],props=new Map();
  const sheet={getLastRow:()=>rows.length,getRange:(r,c,n=1,w=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w))}),appendRow:row=>rows.push(row)};
  const c=runtime(); c.CONFIG={spreadsheetId:"synthetic"};c.SpreadsheetApp={openById:()=>({getSheetByName:()=>sheet}),flush(){}};
  c.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})};
  c.PropertiesService={getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})};
  c.obterPlanilhaRespostasAprovadas_=()=>sheet;
  assert.equal(c.diagnosticarBibliotecaAdministrativa20260918().existing,0);
  const first=c.publicarBibliotecaAdministrativa20260918();assert.equal(first.created,5);
  assert.equal(c.publicarBibliotecaAdministrativa20260918().created,0);
  assert.equal(props.get("BRUNA_KB_SNAPSHOT"),"kb-2026-09-18.1");
  const original=rows[1][6];rows[1][6]="Resposta alterada pela equipe";
  assert.equal(c.diagnosticarBibliotecaAdministrativa20260918().conflicts,1);
  assert.throws(()=>c.publicarBibliotecaAdministrativa20260918(),/knowledge_catalog_changed/);
  assert.equal(rows[1][6],"Resposta alterada pela equipe");rows[1][6]=original;
  rows.push(["unrelated-rule"]);assert.throws(()=>c.publicarBibliotecaAdministrativa20260918(),/knowledge_catalog_changed/);
});
