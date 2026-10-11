import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

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
  const props = new Map([["BRUNA_KB_SNAPSHOT", "kb-synthetic"]]);
  c.CONFIG = { spreadsheetId: "synthetic" };
  c.SpreadsheetApp = { openById: () => ({}) };
  c.obterPlanilhaRespostasAprovadas_ = () => approved;
  c.obterPlanilhaDuvidasBot_ = () => questions;
  c.registrarRevisaoBot_ = () => ({ ok: true });
  c.registrarCorrecaoRecenteConhecimento_ = () => false;
  c.Utilities = { formatDate: () => "20990101", getUuid: () => "synthetic-uuid" };
  c.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props.get(k), setProperty: (k, v) => props.set(k, v) }) };
  c.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
  c.Session = { getActiveUser: () => ({ getEmail: () => "synthetic@example.org" }) };
  return { c, approved, questions, props };
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
  const result = c.registrarRespostaHumanaAprendizado_({ phone: "+5511900000000", answer: "Corrigindo: vou conferir seu documento individualmente.", at: now.toISOString() });
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
});

test("general proposals consolidate equal facts without importing individual answers or approving them", () => {
  const { c, approved, questions } = learningRuntime();
  const pending = id => [id, "+5511900000000", "Pessoa Sintética", "", "Vocês fornecem nota?", "Nota fiscal", "", "Baixo", 0, "Aguardando resposta humana", "", "", "", "", ""];
  const proposal = id => ({ version: "learning-proposal-v1", risk: "Baixo", sourceQuestionId: id, subject: "Nota fiscal", question: "Emitem nota fiscal?", answer: "Emitimos nota fiscal da consulta.", boundaries: "Somente nota fiscal da consulta." });
  questions.appendRow(pending("question-one"));
  const first = c.registrarRespostaHumanaAprendizado_({ phone: "+5511900000000", answer: "Oi, Pessoa. Emitimos nota da consulta.", proposal: proposal("question-one") });
  assert.equal(first.proposalCreated, true);
  assert.equal(approved.rows[1][1], "Revisar");
  assert.equal(approved.rows[1][6], "Emitimos nota fiscal da consulta.");
  questions.appendRow(pending("question-two"));
  const second = c.registrarRespostaHumanaAprendizado_({ phone: "+5511900000000", answer: "Sim, emitimos.", proposal: proposal("question-two") });
  assert.equal(second.consolidated, true);
  assert.equal(second.ruleId, first.ruleId);
  assert.equal(approved.rows.length, 2);
  questions.appendRow(pending("question-three"));
  const stale = c.registrarRespostaHumanaAprendizado_({ phone: "+5511900000000", answer: "Sim", proposal: proposal("question-two") });
  assert.equal(stale.captured, false);
  const personal = proposal("question-three"); personal.answer = "Pessoa, isso está combinado para seu caso.";
  assert.equal(c.validarPropostaConhecimento_(personal, pending("question-three")), null);
  c.registrarRespostaHumanaAprendizado_({ phone: "+5511900000000", answer: "Uma resposta individual sem proposta reutilizável." });
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
  for(const text of ["Qual o endereço?","Onde fica a clínica?","Qual o valor da consulta?","Parcelam a consulta?","Como funciona a avaliação?"]){
    assert.ok(c.classificarPerguntaAdministrativaSegura_(text,"amanda"),text);
    assert.equal(c.classificarPerguntaAdministrativaSegura_(text,"daniel"),null,text);
  }
  for(const text of ["Quanto custa a cirurgia?","Qual o endereço e posso operar tomando remédio?","Estou com febre","Não quero saber o endereço","Qual o endereço da outra clínica?","Pode confirmar amanhã às 10?"])
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
