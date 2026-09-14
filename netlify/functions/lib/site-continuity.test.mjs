import assert from "node:assert/strict";
import test from "node:test";
import { isDirectSiteRequest, getRecommendedSiteResource } from "./site-content.mjs";
import { decideConversationAction } from "./conversation-action-controller.mjs";
import { conformOutboundReplyToContract } from "./outbound-reply-gate.mjs";
import { buildConsultationInformationReply } from "./patient-replies.mjs";
import { runOpenAIShadow } from "./openai-shadow.mjs";

const page = "https://draamandaschroeder.com.br/lifting-facial/";
const opening = "Olá! Tenho interesse em lifting facial com a Dra. Amanda e gostaria de entender melhor como funciona a avaliação.\n\nRef. SITE-lifting-facial\nJID: J1_synthetic_context";
const plan = { route: "standard_reply", reason: "consultation_information_request", professional: "amanda", procedure: "lifting_facial", automaticAllowed: true, marketingPrefill: true };
const context = { procedure: "lifting_facial", referenceCategory: "google_click_id", currentMessage: opening, currentTemplateId: "procedure_evaluation_v1", recentConversation: [] };

test("SITE reference is origin context, not a resource request", () => {
  assert.equal(isDirectSiteRequest(opening), false);
  assert.equal(getRecommendedSiteResource(context), null);
});

test("mentioning a prior visit does not ask for another link", () => {
  for (const text of ["Vim pelo site e quero entender a avaliação", "Já li a página. Como funciona a consulta?", "Vi no site o lifting facial", "Não precisa mandar o link, pode explicar aqui?"]) {
    assert.equal(isDirectSiteRequest(text), false, text);
  }
});

test("explicit requests survive transport metadata and allow a site visitor to request material", () => {
  for (const currentMessage of ["Pode me mandar o link novamente?", "Tem material sobre recuperação?", "Quero ver antes e depois", "Qual é o site?"]) {
    assert.equal(isDirectSiteRequest(currentMessage + "\nRef. SITE-lifting-facial"), true);
    assert.ok(getRecommendedSiteResource({ ...context, referenceCategory: "site_page", currentMessage }));
  }
});

test("paid acquisition retains website context on subsequent patient turns", () => {
  const recentConversation = [{ role: "patient", text: opening }, { role: "assistant", text: "O que gostaria de entender?" }];
  assert.equal(getRecommendedSiteResource({ ...context, recentConversation, currentMessage: "Estou pesquisando como funciona a avaliação", currentTemplateId: "" }), null);
});

test("resource intent is not inferred from SITE metadata", () => {
  const action = decideConversationAction({ text: opening, plan });
  assert.equal(action.action, "respond");
  assert.equal(action.replyContract.unresolvedIntents.includes("resource"), false);
  assert.equal(action.replyContract.allowAppointmentConfirmation, false);
});

test("consultation fallback explains the evaluation and continues in WhatsApp", () => {
  const body = buildConsultationInformationReply({ procedure: "lifting_facial", introduceBruna: true, siteRequested: isDirectSiteRequest(opening), siteResource: getRecommendedSiteResource(context) });
  assert.match(body, /avaliação/);
  assert.equal((body.match(/\?/g) || []).length, 1);
  assert.doesNotMatch(body, /https?:|manhã|tarde|quais dias/i);
});

test("model context separates paid source from website entry and does not approve the origin page", async () => {
  let input;
  await runOpenAIShadow({ phone: "+5511990000000", text: opening, platform: "Google", procedure: "lifting_facial", referenceCategory: "google_click_id", templateId: "procedure_evaluation_v1" }, {
    env: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (_url, options) => {
      input = JSON.parse(JSON.parse(options.body).input);
      return new Response("{}", { status: 200 });
    },
  });
  assert.equal(input.source, "Google");
  assert.equal(input.cameFromWebsite, true);
  assert.equal(input.siteResource, null);
});

test("final outbound conformity removes a spontaneous origin-page sentence even if the model ignores guidance", () => {
  const body = `A avaliação começa com uma conversa sobre seus objetivos.\n\nSe ajudar, veja a página: ${page}\n\nO que gostaria de melhorar ou preservar no rosto?`;
  const reply = conformOutboundReplyToContract({ body, currentText: opening, recentConversation: [], conversationAction: { replyContract: { maxLinks: 1 } } });
  assert.doesNotMatch(reply, /https?:|Se ajudar/);
  assert.match(reply, /avaliação começa/);
  assert.match(reply, /preservar no rosto\?/);
});

test("same-page guard normalizes tracking, anchors, www and missing trailing slash", () => {
  for (const url of [page + "?utm_source=example#resultados", "https://www.draamandaschroeder.com.br/lifting-facial", page + "."]) {
    const reply = conformOutboundReplyToContract({ body: `Posso explicar por aqui.\nVeja ${url}`, currentText: opening, conversationAction: { replyContract: { maxLinks: 1 } } });
    assert.equal(reply, "Posso explicar por aqui.");
  }
});

test("a declined procedure does not suppress an explicit request for another page", () => {
  assert.equal(isDirectSiteRequest("Não quero botox. Pode me mandar o link do lifting facial?"), true);
});

test("explicit resend and a useful new price guide or Maps are preserved", () => {
  for (const [currentText, url] of [["Pode reenviar o link?", page], [opening, "https://maps.google.com/?q=clinica"], [opening, "https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/"]]) {
    const body = `Informação solicitada: ${url}`;
    assert.equal(conformOutboundReplyToContract({ body, currentText, recentConversation: [{ role: "patient", text: opening }], conversationAction: { replyContract: { maxLinks: 1 } } }), body);
  }
});

test("an already shared page cannot reappear spontaneously on the next turn", () => {
  const reply = conformOutboundReplyToContract({ body: `A consulta é individual.\nVeja ${page}`, currentText: "Como funciona a consulta?", recentConversation: [{ role: "assistant", text: `Veja ${page}` }], conversationAction: { replyContract: { maxLinks: 1 } } });
  assert.equal(reply, "A consulta é individual.");
});
