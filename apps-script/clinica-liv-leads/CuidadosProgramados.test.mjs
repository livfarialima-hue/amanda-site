import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import { BIRTHDAY_CARE_TEXT, validateCareReceipt } from "../../netlify/functions/lib/scheduled-care.mjs";

function reviewHarness() {
  const h = harness(); h.clock.at = "2026-09-21T13:30:00Z";
  h.review = () => h.items().find(i => i.care.purpose === "google_review");
  return h;
}

test("Google invitation is optional, Amanda-only, attended-only and independent of praise or commercial outcome", () => {
  const h = reviewHarness(); const count = h.writes(); const item = h.review();
  assert.ok(item); assert.equal(item.automatico, false); assert.equal(h.writes(), count);
  assert.match(item.sugestao, /Se quiser compartilhar sua experiência com a Dra\. Amanda/);
  assert.match(item.sugestao, /placeid=ChIJ7-dPJgtXzpQRMfKy91PM_qs/);
  assert.doesNotMatch(item.sugestao, /5 estrelas|cinco estrelas|avaliação positiva|se gostou|desconto/i);
  for (const outcome of ["Fechado", "Não fechou", "Ainda pensando", ""]) {
    h.set("Resultado comercial", outcome); assert.equal(h.review()?.sourceKey, item.sourceKey);
  }
  for (const professional of ["Daniel", "Marina", ""]) { h.set("Profissional", professional); assert.equal(h.review(), undefined); }
  h.set("Profissional", "Amanda");
  for (const status of ["Agendada", "Cancelada", "Não compareceu", ""]) { h.set("Status", status); assert.equal(h.review(), undefined); }
  h.set("Status", "Realizada"); h.set("Data realizada", ""); assert.equal(h.review(), undefined);
});

test("Google invitation has one persistent key per phone across consultations and never returns after dismissal", () => {
  const h = reviewHarness(); const first = h.review(); assert.ok(first);
  h.set("ID da consulta", "second-consultation"); h.set("Data realizada", new h.Clock("2026-09-12T15:00:00Z"));
  assert.equal(h.review().sourceKey, first.sourceKey);
  const row = h.consultations.values[1].slice(); h.consultations.values.push(row);
  assert.equal(h.items().filter(i => i.care.purpose === "google_review").length, 1);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, h.review(), "dismiss", new h.Clock()).ok, true);
  assert.equal(h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).some(i => i.care.purpose === "google_review"), false);
});

test("Google invitation waits for a suitable care moment, without asking only satisfied patients", () => {
  const h = reviewHarness(); const item = h.review(); assert.ok(item);
  const check = (conversation, pref={}) => h.ctx.motivoBloqueioCuidado_(item, conversation, pref, new h.Clock(), null);
  assert.equal(check(h.conversation), "");
  for (const text of ["Gostei do atendimento", "Não gostei do atendimento"]) {
    const history=[{direcao:"IN",messageId:"feedback",dataHora:new h.Clock("2026-09-15T12:00:00Z"),texto:text},h.conversation[1]];
    assert.equal(check(history), "");
  }
  assert.equal(check(h.conversation,{neverFollowUp:true}), "contact_suspended");
  assert.equal(check(h.conversation,{neverBotReply:true}), "contact_suspended");
  const msg=(text,direction="IN")=>({direcao:direction,messageId:"history-review",dataHora:new h.Clock("2026-09-15T12:00:00Z"),texto:text});
  for (const text of ["Já avaliei no Google", "Não quero avaliar no Google", "Prefiro não deixar avaliação no Google"]) {
    assert.equal(check([msg(text), h.conversation[1]]), "google_review_already_addressed");
  }
  assert.equal(check([msg(item.sugestao,"OUT"),h.conversation[1]]), "google_review_already_addressed");
  assert.equal(check([...h.conversation,{...msg("Bom dia"),dataHora:new h.Clock()}]), "google_review_recent_contact");
  h.set("Data da cirurgia realizada", new h.Clock("2026-09-19T15:00:00Z")); assert.equal(h.review(), undefined);
  h.set("Data da cirurgia realizada", ""); h.set("Ficaram dúvidas?", "Sim"); assert.equal(h.review(), undefined);
});

test("Google invitation approval binds the original consultation and revalidates prior invitations", () => {
  const h = reviewHarness(); const item = h.review(); assert.ok(item);
  const decision = h.ctx.decidirCuidadoCentral_(h.spreadsheet,item,"approve",new h.Clock()); assert.equal(decision.ok,true,JSON.stringify(decision));
  h.set("ID da consulta", "replaced-consultation");
  assert.equal(h.ctx.obterMarcoCuidado_(h.spreadsheet,item.sourceKey,new h.Clock()),null);
});

test("Google invitation cannot start early, return as a stale solicitation or ignore a new question", () => {
  const h=reviewHarness(); h.clock.at="2026-09-16T13:30:00Z"; assert.equal(h.review(),undefined);
  h.clock.at="2026-09-21T13:30:00Z"; const item=h.review(); assert.ok(item);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet,{...item,deferUntil:new h.Clock("2026-11-02T12:00:00Z")},"defer",new h.Clock()).ok,true);
  h.clock.at="2026-11-02T12:00:00Z";
  assert.equal(h.review(),undefined);
  assert.equal(h.ctx.obterMarcoCuidado_(h.spreadsheet,item.sourceKey,new h.Clock()),null);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet,item,"approve",new h.Clock()).ok,false);
  const fresh=reviewHarness(); const offer=fresh.review();
  const approved=fresh.ctx.decidirCuidadoCentral_(fresh.spreadsheet,offer,"approve",new fresh.Clock()); assert.equal(approved.ok,true);
  fresh.clock.at=approved.scheduledAt.toISOString();
  fresh.conversation.push({direcao:"IN",messageId:"new-question",dataHora:new fresh.Clock(),texto:"Estou com uma dúvida, podem me ajudar?"});
  let sends=0; fresh.ctx.enviarRetomadaAutomatica_=()=>{sends++;return {ok:true,sent:true};};
  fresh.ctx.processarCuidadosProgramados_(new fresh.Clock(),"synthetic",fresh.ctx.PropertiesService.getScriptProperties()); assert.equal(sends,0);
});

test("a prior invitation or decline is reread at approval and leaves other care available", () => {
  const h=reviewHarness(); const item=h.review();
  h.conversation.push({direcao:"OUT",messageId:"manual-invite",dataHora:new h.Clock("2026-09-15T13:00:00Z"),texto:item.sugestao});
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet,item,"approve",new h.Clock()).reason,"google_review_already_addressed");
  assert.equal(h.ctx.motivoBloqueioCuidado_({...item,care:{...item.care,purpose:"post_consult"}},h.conversation,{},new h.Clock(),null),"");
});

test("Google care receipt agrees with the owner and is accepted once after individual approval", () => {
  const h=reviewHarness(); const item=h.review(); assert.ok(item);
  const decision=h.ctx.decidirCuidadoCentral_(h.spreadsheet,item,"approve",new h.Clock()); assert.equal(decision.ok,true,JSON.stringify(decision));
  h.clock.at=decision.scheduledAt.toISOString(); let sends=0;
  h.ctx.registrarTurnoConversa_=()=>({ok:true});
  h.ctx.enviarRetomadaAutomatica_=payload=>{
    const receipt=h.ctx.validarEnvioCuidado_({planId:payload.planId});
    assert.equal(receipt.ok,true,JSON.stringify(receipt));
    assert.equal(validateCareReceipt(receipt,new h.Clock()),""); sends++; return {ok:true,sent:true};
  };
  h.ctx.processarCuidadosProgramados_(new h.Clock(),"synthetic",h.ctx.PropertiesService.getScriptProperties());
  h.ctx.processarCuidadosProgramados_(new h.Clock(),"synthetic",h.ctx.PropertiesService.getScriptProperties());
  assert.equal(sends,1);
});

test("Central, decision panel and daily email preserve the review invitation as an explicit individual choice", () => {
  const h=reviewHarness(); const item=h.review(); const before=h.writes();
  const projected=h.ctx.carregarCuidadosCentral_(h.consultations,{},new h.Clock()).find(i=>i.sourceKey===item.sourceKey);
  assert.ok(projected); assert.equal(projected.approvalBrunaEligible,true); assert.equal(h.writes(),before);
  const headers=vm.runInContext("CENTRAL_ATENDIMENTO_HEADERS",h.ctx);
  const fields={"Fila":"Ação manual hoje","Chave operacional":item.sourceKey,"Fonte":"Jornada de cuidado","Modo":"Manual","Status operacional":"Aberto","Mensagem final":item.sugestao,"Programar para":projected.programFor,"Elegibilidade da Bruna":"Elegível para aprovação","Próxima ação":item.categoria,"Telefone":item.telefone,"Paciente":"Paciente sintética"};
  const central=h.sheet("Central de Atendimento",[Array.from(headers),headers.map(header=>fields[header]||"")]);
  const list=h.ctx.listarItensPainelDecisoesCentral_(central,new h.Clock());
  assert.equal(list[0].approvalAvailable,true); assert.equal(list[0].dismissAvailable,true);
  const email=h.ctx.montarResumoPraticoCuidados_(list,"21/09","https://example.test/panel","https://example.test/central",[]);
  assert.ok(email.text.includes(item.sugestao)); assert.ok(email.html.includes("Convite para avaliação no Google"));
  assert.equal(h.writes(),before);
  const result=h.ctx.aprovarRetomadasMarcadasCentralInterno_(h.spreadsheet,central,new h.Clock(),[list[0].approvalDecision]);
  assert.equal(result.approved,1); assert.equal(h.ctx.carregarDecisoesCuidados_(h.spreadsheet)[item.sourceKey].row[1],"Programado");
});

test("a Google review invitation cannot become an unanswered commercial follow-up even when CRM is stale", () => {
  const h=reviewHarness(); const invitation=h.review().sugestao;
  const conversation=[{direcao:"IN",messageId:"old-interest",dataHora:new h.Clock("2026-09-18T12:00:00Z"),texto:"Gostaria de saber sobre lifting cervical"},
    {direcao:"OUT",messageId:"review-invite",dataHora:new h.Clock("2026-09-19T13:00:00Z"),texto:invitation}];
  assert.equal(h.ctx.criarCandidatoRetomada_("+5511900000000",{nome:"Paciente",status:"Qualificado",resumo:"lifting cervical"},conversation,new h.Clock(),"2026-09-21"),null);
});

export function harness() {
  const clock = { at: "2026-09-14T12:00:00.000Z" };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock.at])); } static now() { return new Date(clock.at).getTime(); } }
  const sheets = new Map();
  let writes = 0;
  function sheet(title, values = []) {
    const s = { title, values,
      getLastRow: () => values.length, getLastColumn: () => Math.max(0, ...values.map(r => r.length)),
      getMaxColumns: () => 100, getMaxRows: () => 1000,
      getParent: () => spreadsheet,
      getDataRange: () => s.getRange(1, 1, values.length, s.getLastColumn()),
      setFrozenRows() {}, hideSheet() {},
      getRange(row, col, count = 1, width = 1) {
        const range = {
          getValues: () => Array.from({ length: count }, (_, i) => Array.from({ length: width }, (_, j) => values[row - 1 + i]?.[col - 1 + j] ?? "")),
          getDisplayValues: () => range.getValues(),
          getValue: () => range.getValues()[0][0],
          setValues(next) { writes++; next.forEach((r, i) => { values[row - 1 + i] ||= []; r.forEach((v, j) => { values[row - 1 + i][col - 1 + j] = v; }); }); return range; },
          setValue(v) { return range.setValues([[v]]); }, setNumberFormat() {}, setNote() {},
        }; return range;
      },
    }; sheets.set(title, s); return s;
  }
  const spreadsheet = { getSheetByName: name => sheets.get(name) || null, insertSheet: name => sheet(name) };
  const props = new Map([["LIV_CUIDADOS_PROGRAMADOS_ATIVOS", "true"]]);
  const ctx = vm.createContext({ console, Date: Clock, Set, Map, JSON,
    CONFIG: { spreadsheetId: "synthetic", danielSheetName: "Leads Dr. Daniel" },
    OPPORTUNITY_STORE_CONFIG: { sheetName: "_CRM_OPORTUNIDADES" },
    localizarOportunidadePorId_: (_sheet, id) => id === "opp-synthetic" ? { values: [id, "+5511900000000", "hash", "amanda", "", "", "active"] } : null,
    SpreadsheetApp: { openById: () => spreadsheet, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k), setProperty: (k, v) => props.set(k, v) }) },
    CalendarApp: { getCalendarById: () => ({ getEventById: () => ({ getStartTime: () => new Clock("2026-09-11T15:00:00Z") }) }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
      computeDigest: (_a, value) => crypto.createHash("sha256").update(value).digest(),
      computeHmacSha256Signature: (v, k) => crypto.createHmac("sha256", k).update(v).digest(),
      base64EncodeWebSafe: v => Buffer.from(v).toString("base64url"),
      formatDate(date, _tz, format) {
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map(p => [p.type, p.value]));
        const tokens = { yyyy: parts.year, MM: parts.month, dd: parts.day, HH: parts.hour, H: String(Number(parts.hour)), mm: parts.minute };
        return format.replace(/yyyy|MM|dd|HH|H|mm/g, t => tokens[t]);
      },
    },
  });
  for (const file of ["ContactPreferences", "Retomadas", "LembretesConsultas", "AgendaCuidados", "CentralAtendimento", "CuidadosProgramados", "PainelDecisoesDiarias"]) vm.runInContext(fs.readFileSync(new URL(`./${file}.gs`, import.meta.url), "utf8"), ctx);
  const record = { "ID da consulta": "consult-synthetic-1", "Telefone (E.164)": "+5511900000000", "Nome do paciente": "Paciente Teste", "Profissional": "Amanda", "Status": "Realizada", "Data realizada": new Clock("2026-09-11T15:00:00Z"), "Consentimento para contato": "Sim", "Canal preferido": "WhatsApp", "Próxima ação": "Ainda decidindo", "Data agendada": new Clock("2026-09-11T15:00:00Z"), "Horário agendado": "12:00", "Opportunity ID": "opp-synthetic", "Data de nascimento": new Clock("1986-09-14T12:00:00Z"), "Aniversário pelo bot": "Sim", "Último aniversário contatado": "" };
  const consultations = sheet("Consultas", [Object.keys(record), Object.values(record)]);
  sheet("Google Ads - Conversões", [["Telefone (E.164)"]]); sheet("_WHATSAPP_MENSAGENS", [["Telefone"]]);
  const conversation = [ { direcao: "IN", source: "patient", dataHora: new Clock("2026-09-10T12:00:00Z"), messageId: "in-1", texto: "Obrigada" }, { direcao: "OUT", source: "human", dataHora: new Clock("2026-09-10T12:01:00Z"), messageId: "out-1", texto: "Por nada!" } ];
  ctx.carregarLeadsRetomadas_ = () => ({ "+5511900000000": {} });
  ctx.carregarConversasRetomadas_ = () => ({ "+5511900000000": conversation });
  ctx.carregarPreferenciasContatoPorTelefone_ = () => ({});
  function set(name, value) { let i = consultations.values[0].indexOf(name); if (i < 0) { i = consultations.values[0].length; consultations.values[0].push(name); } consultations.values[1][i] = value; }
  const items = () => ctx.criarAgendaCuidadosConsultas_(consultations, new Clock(), { raw: true });
  const post = () => items().find(i => /3 dias/.test(i.categoria));
  return { ctx, clock, Clock, props, spreadsheet, consultations, conversation, items, post, set, sheet, writes: () => writes };
}

test("a care dismissal survives Central regeneration and calendar-day changes, without changing contact preferences", () => {
  const h = harness(); const care = h.post(); assert.ok(care);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, care, "dismiss", new h.Clock()).ok, true);
  const count = h.writes();
  h.clock.at = "2026-09-15T12:00:00Z";
  assert.equal(h.post().sourceKey, care.sourceKey);
  assert.equal(h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).some(i => i.sourceKey === care.sourceKey), false);
  assert.equal(h.writes(), count);
  h.set("ID da consulta", "consult-synthetic-2"); h.set("Data realizada", new h.Clock("2026-09-12T15:00:00Z"));
  assert.notEqual(h.post().sourceKey, care.sourceKey);
});

test("release diagnostics report the additive schema and existing decisions without changing or sending anything", () => {
  const h = harness();
  h.ctx.ScriptApp = { getProjectTriggers: () => [{ getHandlerFunction: () => "processarRetomadasAutomaticas" }] };
  h.ctx.decidirCuidadoCentral_(h.spreadsheet, h.post(), "dismiss", new h.Clock());
  const before = h.writes();
  const result = h.ctx.diagnosticarCuidadosProgramados();
  assert.equal(result.readOnly, true);
  assert.equal(result.ledgerPresent, true);
  assert.equal(result.missingHeaders.length, 3);
  assert.equal(result.existingFollowupTriggers, 1);
  assert.equal(Object.values(result.states).reduce((a, b) => a + b, 0), 1);
  assert.equal(h.writes(), before);
});

test("snooze persists and an overdue review does not disappear when the suggestion window ends", () => {
  const h = harness(); const item = h.post();
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...item, deferUntil: new h.Clock("2026-09-25T12:00:00Z") }, "defer", new h.Clock()).ok, true);
  assert.equal(h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).some(i => i.sourceKey === item.sourceKey), false);
  h.clock.at = "2026-09-26T12:00:00Z";
  assert.ok(h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).find(i => i.sourceKey === item.sourceKey));
});

test("a postponed milestone retains a usable draft and can be reviewed and delivered after its original window", () => {
  const h = harness(); const item = h.post();
  h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...item, deferUntil: new h.Clock("2026-09-25T12:00:00Z") }, "defer", new h.Clock());
  h.clock.at = "2026-09-25T12:00:00Z";
  const restored = h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).find(value => value.sourceKey === item.sourceKey);
  assert.equal(restored.sugestao, item.sugestao); assert.equal(restored.care.purpose, "post_consult");
  const approved = h.ctx.decidirCuidadoCentral_(h.spreadsheet, restored, "approve", new h.Clock());
  assert.equal(approved.ok, true, JSON.stringify(approved));
  h.clock.at = approved.scheduledAt.toISOString(); let sends = 0;
  h.ctx.enviarRetomadaAutomatica_ = () => { sends++; return { ok: true, sent: true }; };
  h.ctx.registrarTurnoConversa_ = () => ({ ok: true });
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties());
  assert.equal(sends, 1);
});

test("a changed consultation invalidates a postponed milestone rather than reviving its previous approval", () => {
  const h = harness(); const item = h.post();
  h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...item, deferUntil: new h.Clock("2026-09-25T12:00:00Z") }, "defer", new h.Clock());
  h.clock.at = "2026-09-25T12:00:00Z"; h.set("Status", "Cancelada");
  assert.equal(h.ctx.obterMarcoCuidado_(h.spreadsheet, item.sourceKey, new h.Clock()), null);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, item, "approve", new h.Clock()).ok, false);
});

test("discarding a follow-up cannot discard the internal commercial outcome review", () => {
  const h = harness(); const headers = vm.runInContext("CENTRAL_ATENDIMENTO_HEADERS", h.ctx);
  const fields = { "Fila": "Ação manual hoje", "Chave operacional": "care:internal-review", "Fonte": "Jornada de cuidado", "Modo": "Manual", "Status operacional": "Aberto", "Próxima ação": "Conferir fechamento pós-consulta — D+15", "Telefone": "+5511900000000" };
  const central = h.sheet("Central de Atendimento", [Array.from(headers), headers.map(header => fields[header] || "")]);
  assert.equal(h.ctx.listarItensPainelDecisoesCentral_(central, new h.Clock())[0].dismissAvailable, false);
});

test("late execution respects the care closing hour and weekdays, including the transport receipt", () => {
  const h = harness(); const item = h.post();
  const approved = h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...item, programFor: new h.Clock("2026-09-14T20:30:00Z") }, "approve", new h.Clock());
  assert.equal(approved.ok, true);
  h.clock.at = "2026-09-14T21:10:00Z"; let sends = 0;
  h.ctx.enviarRetomadaAutomatica_ = () => { sends++; return { ok: true, sent: true }; };
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties());
  assert.equal(sends, 0); assert.equal(h.ctx.carregarDecisoesCuidados_(h.spreadsheet)[item.sourceKey].row[17], "care_outside_send_window");
  assert.equal(h.ctx.janelaEnvioCuidadoPermitida_(new h.Clock("2026-09-19T13:30:00Z"), "post_consult"), false);
  assert.equal(h.ctx.janelaEnvioCuidadoPermitida_(new h.Clock("2026-09-19T13:30:00Z"), "birthday"), false);
});

test("approval keeps the exact reviewed message and validates Calendar, consent and later patient activity", () => {
  const h = harness(); h.set("ID da agenda Google", "calendar-synthetic"); h.set("ID do evento Google", "event-synthetic");
  h.set("Sincronização Google Agenda", "Sincronizado");
  const item = h.post(); const approved = h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...item, finalMessage: item.sugestao }, "approve", new h.Clock());
  assert.equal(approved.ok, true);
  let state = h.ctx.carregarDecisoesCuidados_(h.spreadsheet)[item.sourceKey];
  state.row[1] = "Enviando"; h.ctx.gravarDecisaoCuidado_(h.spreadsheet, state.row);
  h.clock.at = new Date(approved.scheduledAt).toISOString();
  const receipt = h.ctx.validarEnvioCuidado_({ planId: item.sourceKey });
  assert.equal(receipt.ok, true, JSON.stringify(receipt)); assert.equal(validateCareReceipt(receipt, new Date(h.clock.at)), "");
  h.set("Consentimento para contato", "Não");
  assert.equal(h.ctx.validarEnvioCuidado_({ planId: item.sourceKey }).ok, false);
  h.set("Consentimento para contato", "Sim");
  h.conversation.push({ direcao: "IN", texto: "Outra dúvida", messageId: "in-new", dataHora: new h.Clock(), source: "patient" });
  assert.equal(h.ctx.validarEnvioCuidado_({ planId: item.sourceKey }).ok, false);
});

test("Calendar rescheduling and a changed draft block approval instead of inventing a safe confirmation", () => {
  const h = harness(); h.set("ID da agenda Google", "calendar-synthetic"); h.set("ID do evento Google", "event-synthetic");
  h.set("Sincronização Google Agenda", "Sincronizado");
  h.ctx.CalendarApp.getCalendarById = () => ({ getEventById: () => null });
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, h.post(), "approve", new h.Clock()).reason, "calendar_event_missing");
  h.set("ID da agenda Google", ""); h.set("ID do evento Google", "");
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...h.post(), finalMessage: "Pode tomar o medicamento." }, "approve", new h.Clock()).reason, "care_message_requires_human_send");
});

test("past Calendar dates alone do not become attended consultations or postoperative milestones", () => {
  const h = harness(); h.set("Status", "Agendada");
  assert.equal(h.post(), undefined);
  assert.equal(h.items().some(i => /pós-cirúrgica/.test(i.categoria)), false);
});

test("birthdays are manual reminders regardless of legacy bot opt-in and cannot be activated or approved", () => {
  const h = harness(); const birthday = h.items().find(i => i.care.purpose === "birthday");
  assert.equal(birthday.sugestao, BIRTHDAY_CARE_TEXT);
  h.set("Aniversário pelo bot", "Não");
  assert.ok(h.items().find(i => i.care.purpose === "birthday"));
  h.props.set("LIV_ANIVERSARIOS_AUTOMATICOS_ATIVOS", "true"); h.props.set("LIV_ANIVERSARIOS_ATIVADOS_EM", "2026-09-14T03:00:01Z");
  const props = h.ctx.PropertiesService.getScriptProperties();
  assert.equal(h.ctx.planejarAniversariosCuidados_(h.spreadsheet, new h.Clock(), props), 0);
  h.props.set("LIV_ANIVERSARIOS_ATIVADOS_EM", "2026-09-13T12:00:00Z");
  assert.equal(h.ctx.entregaCuidadoAtiva_("birthday"), false);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, birthday, "approve", new h.Clock()).reason, "birthday_manual_only");
  assert.equal(h.ctx.ativarAniversariosAutomaticos().reason, "birthday_manual_only");
  assert.equal(h.ctx.planejarAniversariosCuidados_(h.spreadsheet, new h.Clock(), props), 0);
  assert.equal(h.writes(), 0);
});

test("birthday reminder is once per phone/year, only today, and dismissal survives duplicate consultations", () => {
  const h = harness(); const original = h.items().find(i => i.care.purpose === "birthday");
  const copy = h.consultations.values[1].slice(); copy[0] = "consult-synthetic-2";
  h.consultations.values.push(copy);
  assert.equal(h.items().filter(i => i.care.purpose === "birthday").length, 1);
  h.ctx.decidirCuidadoCentral_(h.spreadsheet, original, "dismiss", new h.Clock());
  const projected = () => h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock());
  assert.equal(projected().some(i => i.care.purpose === "birthday"), false);
  h.clock.at = "2026-09-13T12:00:00Z"; assert.equal(h.items().some(i => i.care.purpose === "birthday"), false);
  h.clock.at = "2026-09-15T12:00:00Z"; assert.equal(projected().some(i => i.care.purpose === "birthday"), false);
  h.clock.at = "2027-09-14T12:00:00Z"; assert.ok(projected().find(i => i.care.purpose === "birthday"));
});

test("manual birthdays respect refusal, previous contact, valid birth dates and established patient status", () => {
  const h = harness(); const birthdays = () => h.items().filter(i => i.care.purpose === "birthday");
  h.set("Consentimento para contato", "Não"); assert.equal(birthdays().length, 0);
  h.set("Consentimento para contato", "Sim"); h.set("Aniversário pelo bot", ""); assert.equal(birthdays().length, 1);
  h.set("Status", "Cancelada"); assert.equal(birthdays().length, 0);
  h.set("Status", "Realizada"); h.set("Data de nascimento", "31/02/1986"); assert.equal(birthdays().length, 0);
  h.set("Data de nascimento", "1986-09-14"); h.set("Último aniversário contatado", new h.Clock()); assert.equal(birthdays().length, 0);
  h.set("Último aniversário contatado", ""); h.ctx.carregarPreferenciasContatoPorTelefone_ = () => ({ "+5511900000000": { neverFollowUp: true } }); assert.equal(birthdays().length, 0);
});

test("a stale birthday approval or scheduled row cannot send or move the reminder to tomorrow", () => {
  const h = harness(); const item = h.items().find(i => i.care.purpose === "birthday");
  const headers = vm.runInContext("CENTRAL_ATENDIMENTO_HEADERS", h.ctx);
  const fields = { "Fila": "Ação manual hoje", "Chave operacional": item.sourceKey, "Fonte": "Jornada de cuidado", "Modo": "Manual", "Status operacional": "Aberto", "Mensagem final": item.sugestao, "Programar para": new h.Clock("2026-09-14T13:30:00Z"), "Elegibilidade da Bruna": "Elegível para aprovação", "Próxima ação": "Aniversário", "Telefone": item.telefone };
  const central = h.sheet("Central de Atendimento", [Array.from(headers), headers.map(header => fields[header] || "")]);
  const decision = h.ctx.listarItensPainelDecisoesCentral_(central, new h.Clock())[0];
  assert.equal(decision.approvalAvailable, false); assert.equal(decision.dismissAvailable, true); assert.equal(decision.deferAvailable, false);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, { ...item, deferUntil: new h.Clock("2026-09-15T12:00:00Z") }, "defer", new h.Clock()).reason, "birthday_manual_only");
  const row = Array(22).fill(""); row[0] = item.sourceKey; row[1] = "Programado"; row[3] = item.telefone; row[7] = "birthday"; row[8] = "2026-09-14"; row[9] = item.sugestao; row[10] = new h.Clock(); row[11] = new h.Clock(); row[20] = "Aniversário";
  h.ctx.gravarDecisaoCuidado_(h.spreadsheet, row);
  let sends = 0; h.ctx.enviarRetomadaAutomatica_ = () => { sends++; throw new Error("must not send"); };
  h.props.set("LIV_ANIVERSARIOS_AUTOMATICOS_ATIVOS", "true");
  assert.equal(h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).find(i => i.sourceKey === item.sourceKey).automatico, false);
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties());
  assert.equal(sends, 0);
  h.clock.at = "2026-09-15T12:00:00Z";
  assert.equal(h.ctx.projetarDecisoesCuidados_(h.spreadsheet, h.items(), new h.Clock()).some(i => i.sourceKey === item.sourceKey), false);
});

test("every birthday draft is in the daily email even after the first six manual decisions", () => {
  const h = harness();
  const items = Array.from({ length: 8 }, (_, i) => ({ sourceKey: "care:synthetic-" + i, name: "Paciente sintética " + i, nextAction: "Aniversário", finalMessage: BIRTHDAY_CARE_TEXT, owner: "Equipe", manualToday: true }));
  const result = h.ctx.montarResumoPraticoCuidados_(items, "14/09", "https://example.test/panel", "https://example.test/central", []);
  assert.ok(result.html.includes("Aniversariantes de hoje — envio manual"));
  assert.equal(result.html.split(BIRTHDAY_CARE_TEXT).length - 1, 8);
  assert.ok(result.text.includes("Envio manual por você"));
  assert.equal(result.automatic, 0); assert.equal(result.represented, 8);
});

test("clinical concern, opt-out, unresolved human commitment and active conversation block proactive care", () => {
  const h = harness(); const care = h.post();
  assert.equal(h.ctx.motivoBloqueioCuidado_(care, h.conversation, { neverBotReply: true }, new h.Clock()), "contact_suspended");
  h.conversation.push({ direcao: "IN", messageId: "in-2", dataHora: new h.Clock(), texto: "Estou com dor e febre" });
  assert.ok(h.ctx.motivoBloqueioCuidado_(care, h.conversation, {}, new h.Clock()));
});

test("an approved care send uses the owner ledger and records the effective template once", () => {
  const h = harness(); const item = h.post(); const approved = h.ctx.decidirCuidadoCentral_(h.spreadsheet, item, "approve", new h.Clock());
  h.clock.at = approved.scheduledAt.toISOString(); let sends = 0, records = 0;
  h.ctx.enviarRetomadaAutomatica_ = () => { sends++; return { ok: true, sent: true, effectiveBody: "Mensagem completa do modelo" }; };
  h.ctx.registrarTurnoConversa_ = payload => { records++; assert.equal(payload.opportunityId, "opp-synthetic"); assert.equal(payload.text, "Mensagem completa do modelo"); return { ok: true }; };
  assert.equal(h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties()).sent, 1);
  assert.equal(h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties()).sent, 0);
  assert.equal(sends, 1); assert.equal(records, 1);
});

test("uncertain delivery never retries or accepts another approval", () => {
  const h = harness(); const item = h.post(); const approval = h.ctx.decidirCuidadoCentral_(h.spreadsheet, item, "approve", new h.Clock());
  h.clock.at = approval.scheduledAt.toISOString(); let sends = 0;
  h.ctx.enviarRetomadaAutomatica_ = () => { sends++; return { ok: false, uncertain: true, error: "request_failed" }; };
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties());
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "synthetic", h.ctx.PropertiesService.getScriptProperties());
  assert.equal(sends, 1); assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, item, "approve", new h.Clock()).reason, "delivery_requires_reconciliation");
});

test("practical email lists every item and exposes the full reviewed text in the panel", () => {
  const h = harness(); const items = Array.from({ length: 20 }, (_, i) => ({ sourceKey: "care:" + i, name: "Paciente sintética " + i, nextAction: "Follow-up pós-consulta", finalMessage: "Mensagem " + i, owner: "Equipe", manualToday: true, programFor: new h.Clock("2026-09-14T13:30:00Z") }));
  const result = h.ctx.montarResumoPraticoCuidados_(items, "14/09", "https://example.test/panel", "https://example.test/central", []);
  assert.equal(result.represented, 20); for (const item of items) assert.ok(result.html.includes(item.name));
  assert.ok(result.html.includes("Dispensar esta sugestão")); assert.ok(result.text.includes("Mensagem 19"));
  assert.equal(h.ctx.textoPrevistoCuidado_(items[0]), "Retomando nosso contato pela Clínica LIV:\n\nMensagem 0\n\nSe preferir não receber novas mensagens, é só me avisar.");
});

test("the decision token changes when the care message or schedule changes", () => {
  const h = harness(); h.props.set("LEADS_INGEST_SECRET", "synthetic");
  const item = { sourceKey: "care:synthetic", finalMessage: "Texto aprovado", programFor: new h.Clock("2026-09-14T13:30:00Z"), status: "Aberto", context: "Contexto" };
  const signature = v => h.ctx.assinaturaItemPainelDecisoesDiarias_("2026-09-14", v.sourceKey, h.ctx.revisaoCuidadoPainel_(v));
  assert.notEqual(signature(item), signature({ ...item, finalMessage: "Texto diferente" }));
  assert.notEqual(signature(item), signature({ ...item, programFor: new h.Clock("2026-09-15T13:30:00Z") }));
});

test("schema preparation appends columns without changing existing positions or empty legacy slots", () => {
  const h = harness(); const before = h.consultations.values.map(row => row.slice());
  h.ctx.prepararEstruturaCuidadosProgramados();
  assert.deepEqual(h.consultations.values[0].slice(0, before[0].length), before[0]);
  assert.deepEqual(h.consultations.values[1].slice(0, before[1].length), before[1]);
  const count = h.consultations.values[0].length; h.ctx.prepararEstruturaCuidadosProgramados(); assert.equal(h.consultations.values[0].length, count);
});

test("quote milestones need a confirmed sending date and stop after closure or surgery", () => {
  const h = harness(); h.set("Nome do paciente", "Marina Souza"); h.set("Data do orçamento enviado", new h.Clock("2026-09-11T12:00:00Z"));
  const quote = h.items().find(i => i.care.purpose === "quote");
  assert.ok(quote); assert.match(quote.sugestao, /^Oi, Marina!/);
  h.set("Resultado comercial", "Não fechou"); assert.equal(h.items().some(i => i.care.purpose === "quote"), false);
  h.set("Resultado comercial", "Procedimento fechado"); assert.equal(h.items().some(i => i.care.purpose === "quote"), false);
  h.set("Resultado comercial", "Pendente"); h.set("Data da cirurgia realizada", new h.Clock("2026-09-12T12:00:00Z"));
  assert.equal(h.items().some(i => i.care.purpose === "quote"), false);
  const postSurgery = h.items().find(i => i.care.purpose === "post_surgery");
  assert.ok(postSurgery); assert.match(postSurgery.sugestao, /^Oi, Marina!/);
});

test("surgery and quote milestones keep a neutral greeting when the stored name is unsafe", () => {
  const h = harness(); h.set("Nome do paciente", "+5511900000000"); h.set("Data do orçamento enviado", new h.Clock("2026-09-11T12:00:00Z"));
  assert.match(h.items().find(i => i.care.purpose === "quote").sugestao, /^Olá!/);
  h.set("Data do orçamento enviado", ""); h.set("Data da cirurgia realizada", new h.Clock("2026-09-12T12:00:00Z"));
  assert.match(h.items().find(i => i.care.purpose === "post_surgery").sugestao, /^Olá!/);
});

test("birthday blocks contradictory birth dates and an explicit refusal on a duplicated consultation", () => {
  const h = harness(); const birthday = h.items().find(i => i.care.purpose === "birthday");
  const copy = h.consultations.values[1].slice(); copy[h.consultations.values[0].indexOf("Data de nascimento")] = new h.Clock("1987-09-14T12:00:00Z");
  h.consultations.values.push(copy);
  assert.equal(h.ctx.validarCadastroAniversario_(h.spreadsheet, birthday), "birthday_identity_conflict");
  copy[h.consultations.values[0].indexOf("Consentimento para contato")] = "Não";
  assert.equal(h.ctx.validarCadastroAniversario_(h.spreadsheet, birthday), "contact_suspended");
});

test("invalid birth dates and missing opportunity identity do not enter automated delivery", () => {
  const h = harness(); assert.equal(h.ctx.dataNascimentoCuidado_("31/02/1986"), null); assert.equal(h.ctx.dataNascimentoCuidado_("1986-13-14"), null);
  assert.ok(h.ctx.dataNascimentoCuidado_("29/02/1988"));
  h.set("Opportunity ID", ""); assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, h.post(), "approve", new h.Clock()).reason, "identity_requires_review");
  h.set("Opportunity ID", "opp-wrong"); assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, h.post(), "approve", new h.Clock()).reason, "opportunity_identity_mismatch");
});

test("a burst of messages is not evidence of a preferred time; three distinct days are", () => {
  const h = harness(); const burst = [0, 1, 2].map(i => ({ direcao: "IN", dataHora: new h.Clock("2026-09-10T18:0" + i + ":00Z") }));
  assert.equal(h.ctx.janelaRespostaCuidado_(new h.Clock(), burst, "post_consult").toISOString(), "2026-09-14T13:30:00.000Z");
  const days = [10, 11, 12].map(d => ({ direcao: "IN", dataHora: new h.Clock("2026-09-" + d + "T18:00:00Z") }));
  assert.equal(h.ctx.janelaRespostaCuidado_(new h.Clock(), days, "post_consult").toISOString(), "2026-09-14T18:30:00.000Z");
});

test("a stale suggested hour is refreshed read-only and the approval carries the displayed hour", () => {
  const h = harness(); h.clock.at = "2026-09-14T16:00:00Z";
  const headers = vm.runInContext("CENTRAL_ATENDIMENTO_HEADERS", h.ctx);
  const values = { "Chave operacional": h.post().sourceKey, "Fonte": "Jornada de cuidado", "Modo": "Manual", "Status operacional": "Aberto", "Mensagem final": h.post().sugestao, "Programar para": new h.Clock("2026-09-14T13:30:00Z"), "Elegibilidade da Bruna": "Elegível para aprovação", "Próxima ação": "Follow-up pós-consulta — 3 dias", "Telefone": "+5511900000000" };
  const row = headers.map(header => values[header] || ""); const writes = h.writes();
  const decision = h.ctx.prepararAprovacaoRetomadaCentral_(row, 2, h.ctx.mapearCabecalhosCentral_(headers), new h.Clock());
  assert.equal(decision.eligible, true); assert.equal(decision.programFor.toISOString(), "2026-09-14T19:30:00.000Z"); assert.equal(h.writes(), writes);
});

test("an accepted delivery with failed ledger recording stays visible and cannot send twice", () => {
  const h = harness(); const item = h.post(); const approval = h.ctx.decidirCuidadoCentral_(h.spreadsheet, item, "approve", new h.Clock()); h.clock.at = approval.scheduledAt.toISOString();
  let sends = 0; h.ctx.enviarRetomadaAutomatica_ = () => { sends++; return { ok: true, sent: true }; }; h.ctx.registrarTurnoConversa_ = () => ({ ok: false });
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "test", h.ctx.PropertiesService.getScriptProperties());
  assert.equal(h.ctx.carregarDecisoesCuidados_(h.spreadsheet)[item.sourceKey].row[1], "Reconciliar");
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "test", h.ctx.PropertiesService.getScriptProperties()); assert.equal(sends, 1);
  assert.equal(h.ctx.decidirCuidadoCentral_(h.spreadsheet, item, "dismiss", new h.Clock()).reason, "delivery_requires_reconciliation");
});

test("Central projects a care approval into the persistent queue and the sender consumes it", () => {
  const h = harness(); const item = h.post(); const headers = vm.runInContext("CENTRAL_ATENDIMENTO_HEADERS", h.ctx);
  const fields = { "Fila": "Ação manual hoje", "Chave operacional": item.sourceKey, "Fonte": "Jornada de cuidado", "Modo": "Manual", "Status operacional": "Aberto", "Mensagem final": item.sugestao, "Programar para": new h.Clock("2026-09-14T13:30:00Z"), "Elegibilidade da Bruna": "Elegível para aprovação", "Próxima ação": item.categoria, "Telefone": item.telefone, "Paciente": "Paciente sintética" };
  const central = h.sheet("Central de Atendimento", [Array.from(headers), headers.map(header => fields[header] || "")]);
  const list = h.ctx.listarItensPainelDecisoesCentral_(central, new h.Clock());
  assert.equal(list[0].approvalAvailable, true); assert.equal(list[0].dismissAvailable, true);
  const result = h.ctx.aprovarRetomadasMarcadasCentralInterno_(h.spreadsheet, central, new h.Clock(), [list[0].approvalDecision]);
  assert.equal(result.approved, 1); assert.equal(h.ctx.carregarDecisoesCuidados_(h.spreadsheet)[item.sourceKey].row[1], "Programado");
  h.clock.at = "2026-09-14T13:30:00Z"; let sent = 0;
  h.ctx.enviarRetomadaAutomatica_ = () => { sent++; return { ok: true, sent: true }; }; h.ctx.registrarTurnoConversa_ = () => ({ ok: true });
  h.ctx.processarCuidadosProgramados_(new h.Clock(), "test", h.ctx.PropertiesService.getScriptProperties()); assert.equal(sent, 1);
});

test("the practical email reads existing pending items and registers new plans only once", () => {
  const h = harness(); let registrations = 0, email;
  h.ctx.atualizarCentralAtendimentoInterno_ = () => ({});
  h.ctx.linkCentralAtendimentoRetomadas_ = () => "https://example.test/central";
  h.ctx.linkPainelDecisoesDiarias_ = () => "https://example.test/panel";
  h.ctx.garantirEstruturaPreferenciasContato_ = () => {};
  h.ctx.criarAgendaCuidadosConsultas_ = () => [];
  h.ctx.carregarAgendaCompromissosPendentes_ = () => [];
  h.ctx.obterPlanilhaControleRetomadas_ = () => h.sheet("Synthetic plans");
  h.ctx.obterChavesRetomadasEnviadas_ = () => new Set(); h.ctx.obterIdentidadesRetomadasRegistradas_ = () => new Set();
  h.ctx.criarCandidatoRetomada_ = () => ({ telefone: "+5511900000000", chaveDiaria: "new-plan", etapa: { numero: 1 }, ultimaMensagem: { messageId: "out-1" }, lead: {}, horario: "16:30" });
  h.ctx.atribuirHorariosRetomadas_ = () => {}; h.ctx.responsavelRetomada_ = () => "equipe";
  h.ctx.registrarRetomadasEnviadas_ = () => { registrations++; };
  h.ctx.listarItensPainelDecisoesCentral_ = () => [{ sourceKey: "followup:old", name: "Pendência sintética antiga", nextAction: "Revisar", finalMessage: "Rascunho completo", owner: "Equipe", manualToday: true }];
  h.ctx.montarTextoEmailRetomadas_ = () => "fallback"; h.ctx.montarHtmlEmailRetomadas_ = () => "fallback";
  h.ctx.converterRetomadaParaCuidadoEmail_ = () => ({ nome: "Contato sintético", telefone: "+5511900000000" });
  h.ctx.limparControleRetomadasAntigo_ = () => {};
  h.ctx.MailApp = { sendEmail: payload => { email = payload; } };
  h.ctx.enviarEmailDiarioRetomadasInterno_(new h.Clock());
  assert.equal(registrations, 1); assert.ok(email.htmlBody.includes("Pendência sintética antiga")); assert.ok(email.body.includes("Rascunho completo"));
});
