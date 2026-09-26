import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import webhook, { handleYCloudWebhook } from "../ycloud-webhook.mjs";

const WEBHOOK_SECRET = "price-holding-webhook-secret";
const SHEETS_URL = "https://sheets.example.test/webhook";
const YCLOUD_URL =
  "https://api.ycloud.com/v2/whatsapp/messages";

test("a polite range acceptance supplies the approved draft and sends exactly that continuation", async (t) => {
  const settings={YCLOUD_WEBHOOK_SECRET:WEBHOOK_SECRET,YCLOUD_API_KEY:"synthetic",
    GOOGLE_SHEETS_WEBHOOK_URL:SHEETS_URL,GOOGLE_SHEETS_WEBHOOK_SECRET:"synthetic",
    WHATSAPP_AUTOMATION_MODE:"active",WHATSAPP_INBOUND_BACKGROUND_ENABLED:"true",
    WHATSAPP_HUMAN_REPLY_GUARD_MS:"0",WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS:"0",
    OPENAI_API_KEY:"synthetic",WHATSAPP_ALERT_NUMBER:"+5511900000002",
    YCLOUD_ALERT_TEMPLATE_NAME:"synthetic_review",YCLOUD_ALERT_TEMPLATE_LANGUAGE:"pt_BR"};
  const previous=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));
  Object.assign(process.env,settings);
  t.after(()=>{for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
  t.mock.method(console,"log",()=>{});
  const sent=[];
  const turns=[
    {role:"user",source:"patient",eventId:"synthetic-courtesy-origin",at:"2026-09-25T18:51:00Z",text:"Quero saber o valor do lifting facial.",messageType:"text"},
    {role:"assistant",source:"bruna",eventId:"synthetic-courtesy-offer",at:"2026-09-25T18:53:00Z",text:"Este material explica a composicao: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/\nSe você quiser, posso te passar uma faixa geral de valores como ponto de partida.",messageType:"text"},
  ];
  t.mock.method(globalThis,"fetch",async(url,options)=>{
    const data=JSON.parse(options.body);
    if(url===SHEETS_URL)return new Response(JSON.stringify(data.action==="get_conversation_context"
      ? {ok:true,turns,professional:"amanda",opportunityId:"synthetic-courtesy"}
      : {ok:true,updated:true,duplicate:false,routed:true,routeStatus:"resolved",professional:"amanda",opportunityId:"synthetic-courtesy",humanTakeoverToday:false,patientRelationship:{found:false}}),{status:200});
    if(url==="https://api.openai.com/v1/responses"){
      const input=JSON.parse(data.input);
      assert.equal(input.policyHints.deterministicReplyCode,"LIFTING-PRICE-RANGE-01","the model must receive the approved range, not generic triage");
      assert.match(input.policyHints.deterministicReplyPreview,/R\$ 26 mil.*R\$ 42 mil/);
      return new Response(JSON.stringify({model:"synthetic",output_text:JSON.stringify({route:"standard_reply",confidence:"high",automaticAllowed:true,urgent:false,professional:"amanda",procedure:"lifting_facial",replyCode:"LIFTING-PRICE-RANGE-01",suggestedReply:input.policyHints.deterministicReplyPreview,reviewReason:"lifting_price_range_direct",conversationState:{activeTopic:"faixa de lifting facial",patientAct:"answer",refersToEventId:"synthetic-courtesy-offer",lastClinicQuestion:"",lastClinicOffer:"faixa geral",unresolvedQuestions:["faixa geral"],factsAlreadyProvided:["guia de composicao"],owner:"bruna",nextExpectedAction:"responder faixa aprovada",ambiguity:"",contextConfidence:"high"}})}),{status:200});
    }
    assert.equal(url,YCLOUD_URL,"all external destinations are mocked");
    sent.push(data);return new Response('{"status":"accepted"}',{status:200});
  });
  const response=await handleYCloudWebhook(requestFor({id:"synthetic-courtesy-inbound",type:"whatsapp.inbound_message.received",createTime:"2026-09-25T18:57:00Z",whatsappInboundMessage:{id:"synthetic-courtesy-message",from:"+5511900000000",to:"+5511900000001",sendTime:"2026-09-25T18:57:00Z",type:"text",text:{body:"Por favor"}}}),{livInboundBackground:true},{registerInboundRecoveryImpl:async()=>({status:"completed"})});
  const result=await response.json();
  assert.equal(response.status,200);
  const replies=sent.filter(m=>m.to==="+5511900000000");
  assert.equal(replies.length,1,JSON.stringify(result));
  assert.match(replies[0].text.body,/R\$ 26 mil.*R\$ 42 mil/);
  assert.doesNotMatch(replies[0].text.body,/https:|qual procedimento|posso te passar|\?/i);
  assert.equal(result.approvedPriceReplySent,true);
  assert.equal(result.approvedPriceReplyKind,"lifting_range");
});

for (const scenario of ["unavailable", "cervical", "human_takeover"]) {
  test(`background price continuation preserves ${scenario} context`, async (t) => {
    const settings = {
      YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET, YCLOUD_API_KEY: "synthetic",
      GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL, GOOGLE_SHEETS_WEBHOOK_SECRET: "synthetic",
      WHATSAPP_AUTOMATION_MODE: "active", WHATSAPP_INBOUND_BACKGROUND_ENABLED: "true",
      WHATSAPP_HUMAN_REPLY_GUARD_MS: "0", WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS: "0",
      OPENAI_API_KEY: scenario === "cervical" ? "synthetic" : "", WHATSAPP_ALERT_NUMBER: "+5511900000002",
      YCLOUD_ALERT_TEMPLATE_NAME: "synthetic_review", YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    };
    const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
    Object.assign(process.env, settings);
    t.after(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    });
    t.mock.method(console, "log", () => {});
    const sent = [];
    const priorTurn = {
      role: "user", source: "patient", eventId: `synthetic-${scenario}-prior`,
      at: scenario === "cervical" ? "2026-09-25T16:30:00.000Z" : "2026-09-25T17:00:00.000Z",
      text: scenario === "cervical" ? "Quero saber sobre lifting cervical com a Dra. Amanda." : "",
      messageType: scenario === "cervical" ? "text" : "unsupported",
    };
    t.mock.method(globalThis, "fetch", async (url, options) => {
      const input = JSON.parse(options.body);
      if (url === SHEETS_URL) {
        const body = input.action === "get_conversation_context"
          ? { ok: true, turns: [priorTurn], professional: "amanda", opportunityId: `synthetic-${scenario}` }
          : { ok: true, updated: true, duplicate: false, routed: true, routeStatus: "resolved",
            professional: "amanda", opportunityId: `synthetic-${scenario}`,
            humanTakeoverToday: scenario === "human_takeover", patientRelationship: { found: false } };
        return new Response(JSON.stringify(body), { status: 200 });
      }
      if (url === "https://api.openai.com/v1/responses") {
        assert.equal(scenario, "cervical");
        return new Response(JSON.stringify({model: "synthetic", output: [{type: "message", content: [{
          type: "output_text", text: JSON.stringify({
            route: "standard_reply", confidence: "high", automaticAllowed: true, urgent: false,
            professional: "amanda", procedure: "lifting_cervical", replyCode: "LIFTING-PRICE-RANGE-01",
            suggestedReply: JSON.parse(input.input).policyHints.deterministicReplyPreview, reviewReason: "lifting_price_range_direct",
            conversationState: {activeTopic: "preco do lifting cervical", patientAct: "question",
              refersToEventId: priorTurn.eventId, lastClinicQuestion: "", lastClinicOffer: "",
              unresolvedQuestions: ["valor da cirurgia"], factsAlreadyProvided: ["lifting cervical"],
              owner: "bruna", nextExpectedAction: "responder preco inicial", ambiguity: "", contextConfidence: "high"},
          }),
        }]}]}), {status: 200});
      }
      assert.equal(url, YCLOUD_URL, "all external destinations must be mocked");
      sent.push(input);
      return new Response('{"status":"accepted"}', { status: 200 });
    });
    const response = await handleYCloudWebhook(requestFor({
      id: `synthetic-${scenario}-price`, type: "whatsapp.inbound_message.received",
      createTime: "2026-09-25T17:00:06.000Z",
      whatsappInboundMessage: {
        id: `synthetic-${scenario}-message`, from: "+5511900000000", to: "+5511900000001",
        sendTime: "2026-09-25T17:00:06.000Z", type: "text", text: { body: "E o preço" },
      },
    }), { livInboundBackground: true }, {
      registerInboundRecoveryImpl: async () => ({ status: "completed" }),
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    const replies = sent.filter(message => message.to === "+5511900000000");
    if (scenario === "human_takeover") {
      assert.equal(replies.length, 0);
      assert.equal(result.priceHoldingSent, false);
      return;
    }
    assert.equal(replies.length, 1, JSON.stringify(result));
    const reply = replies[0].text.body;
    assert.doesNotMatch(reply, /qual região|pálpebras, rosto/);
    if (scenario === "unavailable") {
      assert.doesNotMatch(reply, /R\$\s*\d/);
      assert.match(reply, /mensagem anterior não apareceu completa/);
      assert.match(reply, /reenviar só o nome do procedimento/);
      assert.doesNotMatch(reply, /cirurgia facial|papada/);
      assert.equal((reply.match(/\?/g) || []).length, 1);
      assert.equal(result.priceHoldingSent, true);
    } else {
      assert.equal(result.approvedPriceReplyKind, "lifting_range");
      assert.equal(result.approvedPriceReplySent, true);
      assert.match(reply, /R\$ 18 mil e R\$ 26 mil/);
      assert.doesNotMatch(reply, /qual procedimento|nome do procedimento|mensagem anterior/);
    }
  });
}

test("reprocessing an answered inbound cannot create a contradictory holding or commitment", async () => {
  const settings={YCLOUD_WEBHOOK_SECRET:WEBHOOK_SECRET,YCLOUD_API_KEY:"synthetic",GOOGLE_SHEETS_WEBHOOK_URL:SHEETS_URL,GOOGLE_SHEETS_WEBHOOK_SECRET:"synthetic",WHATSAPP_AUTOMATION_MODE:"active",OPENAI_API_KEY:"synthetic"};
  const saved=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));
  const originalFetch=globalThis.fetch, originalLog=console.log, actions=[];
  Object.assign(process.env,settings);console.log=()=>{};
  globalThis.fetch=async (url,options)=>{
    assert.equal(String(url),SHEETS_URL,"no provider or model side effect after a delivered answer");
    const data=JSON.parse(options.body);actions.push(data.action);
    return new Response(JSON.stringify({ok:true,duplicate:true,updated:true,humanTakeoverToday:false,patientRelationship:{found:false},opportunityId:"synthetic-answered",professional:"amanda",routeStatus:"resolved",routed:true}),{status:200});
  };
  try {
    const response=await handleYCloudWebhook(requestFor({id:"synthetic-answered-root",type:"whatsapp.inbound_message.received",createTime:"2026-09-20T15:00:00Z",whatsappInboundMessage:{id:"synthetic-answered-message",from:"+5511900000000",to:"+5511900000001",sendTime:"2026-09-20T15:00:00Z",type:"text",text:{body:"Pode me passar a faixa de valor do lifting facial"}}}),{}, {readOutboundReplyStatusImpl:async()=>"sent"});
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.priceHoldingQueued,false);
    assert.equal(body.commitmentSyncStatus,"skipped");
    assert.equal(body.aiActiveQueued,false);
    assert.ok(!actions.includes("record_patient_commitment"));
  } finally {
    globalThis.fetch=originalFetch;console.log=originalLog;
    for(const [k,v] of Object.entries(saved)) {if(v===undefined) delete process.env[k];else process.env[k]=v;}
  }
});

function requestFor(payload) {
  const rawBody = JSON.stringify(payload);
  const timestamp = "1721908800";
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return new Request("http://localhost/api/ycloud/webhook", {
    method: "POST",
    headers: {
      "YCloud-Signature": `t=${timestamp},s=${signature}`,
    },
    body: rawBody,
  });
}

test("a first lifting price question receives the approved range without an alert", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
    "HUMAN_RESUME_TIME_ZONE",
    "HUMAN_RESUME_START_HOUR",
    "HUMAN_RESUME_END_HOUR",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      return new Response(
        JSON.stringify({
          ok: true,
          inserted: true,
          updated: false,
          duplicate: false,
          humanTakeoverToday: false,
          patientRelationship: { found: false },
          opportunityId: "opp-daytime-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify({
          model: "test-model",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    route: "standard_reply",
                    confidence: "high",
                    automaticAllowed: true,
                    urgent: false,
                    professional: "amanda",
                    procedure: "lifting_facial",
                    replyCode: "LIFTING-PRICE-RANGE-01",
                    suggestedReply: JSON.parse(JSON.parse(options.body).input).policyHints.deterministicReplyPreview,
                    reviewReason: "lifting_price_range_direct",
                    conversationState: {
                      activeTopic: "preço do lifting facial",
                      patientAct: "question",
                      refersToEventId: "",
                      lastClinicQuestion: "",
                      lastClinicOffer: "",
                      unresolvedQuestions: ["valor da cirurgia"],
                      factsAlreadyProvided: [],
                      owner: "bruna",
                      nextExpectedAction: "responder preço inicial",
                      ambiguity: "",
                      contextConfidence: "high",
                    },
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url === YCLOUD_URL) {
      return new Response('{"status":"accepted"}', {
        status: 200,
      });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "daytime-price-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-07-29T11:10:00.000Z",
        whatsappInboundMessage: {
          id: "daytime-price-message",
          from: "+5511900000000",
          to: "+5511961957144",
          sendTime: "2026-07-29T11:10:00.000Z",
          type: "text",
          customerProfile: { name: "Van" },
          text: {
            body: "Quanto custa o lifting facial?",
          },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.priceHoldingQueued, false);
    assert.equal(body.priceHoldingSent, false);
    assert.equal(body.approvedPriceReplyKind, "lifting_range");
    assert.equal(body.approvedPriceReplyQueued, true);
    assert.equal(body.approvedPriceReplySent, true);
    assert.equal(body.aiActiveQueued, true);
    assert.equal(body.directLiftingPriceQueued, true);
    assert.equal(body.directLiftingPriceSent, true);
    assert.equal(body.overnightHandoffQueued, false);

    const ycloudRequests = requests.filter(
      (request) => request.url === YCLOUD_URL,
    );
    assert.equal(ycloudRequests.length, 1);

    const messages = ycloudRequests.map(
      (request) => JSON.parse(request.options.body),
    );
    const patientRequest = messages.find(
      (request) => request.to === "+5511900000000",
    );
    assert.equal(patientRequest.type, "text");
    assert.match(patientRequest.text.body, /R\$ 26 mil e R\$ 42 mil/);
    assert.equal(
      (patientRequest.text.body.match(/https?:\/\//g) || []).length,
      0,
    );
    assert.match(patientRequest.text.body, /Eu sou a Bruna/);
    assert.doesNotMatch(
      patientRequest.text.body,
      /[\u200B-\u200D\u2060\uFEFF]/,
    );
    assert.match(patientRequest.text.body, /estimativa geral/i);
    assert.match(patientRequest.text.body, /valor final é definido após avaliação/i);
    assert.equal((patientRequest.text.body.match(/\?/g) || []).length, 0);
    assert.doesNotMatch(patientRequest.text.body, /o que mais te incomoda/i);
    assert.match(patientRequest.text.body, /técnica.*hospital.*anestesia.*materiais/i);
    assert.doesNotMatch(patientRequest.text.body, /posso te passar uma faixa/is);
    assert.ok(Array.from(patientRequest.text.body).length <= 650);
    assert.doesNotMatch(
      patientRequest.text.body,
      /Se quiser, posso te explicar o que costuma aproximar/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("an accepted otoplasty range offer is delivered once through the full webhook", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
    "HUMAN_RESUME_TIME_ZONE",
    "HUMAN_RESUME_START_HOUR",
    "HUMAN_RESUME_END_HOUR",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
    HUMAN_RESUME_TIME_ZONE: "America/Sao_Paulo",
    HUMAN_RESUME_START_HOUR: "8",
    HUMAN_RESUME_END_HOUR: "20",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      const input = JSON.parse(options.body);
      if (input.action === "get_conversation_context") {
        return new Response(
          JSON.stringify({
            ok: true,
            opportunityId: "opp-otoplasty-price",
            professional: "amanda",
            turns: [
              {
                role: "user",
                source: "patient",
                text: "Tenho interesse em otoplastia em adultos.",
                eventId: "otoplasty-prefill",
                at: "2026-08-19T19:53:00.000Z",
              },
              {
                role: "assistant",
                source: "bruna",
                text: "Entendo — é natural querer saber o valor antes de decidir. Como cada cirurgia é planejada de forma individual, a Dra. Amanda confirma o valor exato após a avaliação. Este conteúdo explica o orçamento: https://draamandaschroeder.com.br/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/ Se você quiser, posso te passar uma faixa geral como referência inicial.",
                eventId: "otoplasty-initial-price",
                at: "2026-08-19T19:59:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (input.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: true,
            duplicate: false,
            humanTakeoverToday: false,
            patientRelationship: {
              found: true,
              state: "engaged_lead",
              procedureTopic: "otoplastia",
            },
            opportunityId: "opp-otoplasty-price",
            professional: "amanda",
            routeStatus: "resolved",
            routed: true,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, duplicate: false }),
        { status: 200 },
      );
    }

    if (url === "https://api.openai.com/v1/responses") {
      return new Response(
        JSON.stringify({
          model: "test-model",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    route: "standard_reply",
                    confidence: "high",
                    automaticAllowed: true,
                    urgent: false,
                    professional: "amanda",
                    procedure: "otoplastia",
                    replyCode: "OTOPLASTY-PRICE-RANGE-01",
                    suggestedReply: "A paciente aceitou a faixa oferecida.",
                    reviewReason: "otoplasty_price_range_direct",
                    conversationState: {
                      activeTopic: "preço da otoplastia",
                      patientAct: "acceptance",
                      refersToEventId: "otoplasty-initial-price",
                      lastClinicQuestion: "",
                      lastClinicOffer: "faixa geral como referência inicial",
                      unresolvedQuestions: ["faixa da otoplastia"],
                      factsAlreadyProvided: ["guia de composição do orçamento"],
                      owner: "bruna",
                      nextExpectedAction: "informar faixa aprovada",
                      ambiguity: "",
                      contextConfidence: "high",
                    },
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }

    if (url === YCLOUD_URL) {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "otoplasty-range-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-08-19T20:00:00.000Z",
        whatsappInboundMessage: {
          id: "otoplasty-range-message",
          from: "+5511900000001",
          to: "+5511961957144",
          sendTime: "2026-08-19T20:00:00.000Z",
          type: "text",
          customerProfile: { name: "Maria" },
          text: { body: "Pode me passar a faixa, sim" },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.approvedPriceReplyKind, "otoplasty_range");
    assert.equal(body.approvedPriceReplyQueued, true);
    assert.equal(body.approvedPriceReplySent, true);
    assert.equal(body.directOtoplastyPriceQueued, true);
    assert.equal(body.directOtoplastyPriceSent, true);
    assert.equal(body.directLiftingPriceSent, false);
    assert.equal(body.reviewAlertQueued, false);

    const patientRequests = requests
      .filter((request) => request.url === YCLOUD_URL)
      .map((request) => JSON.parse(request.options.body))
      .filter((request) => request.to === "+5511900000001");
    assert.equal(patientRequests.length, 1);
    assert.match(
      patientRequests[0].text.body,
      /otoplastia costuma ficar entre R\$ 8 mil e R\$ 14 mil/i,
    );
    assert.match(patientRequests[0].text.body, /pode ficar fora dessa faixa/i);
    assert.match(patientRequests[0].text.body, /não representa honorários isolados/i);
    assert.equal((patientRequests[0].text.body.match(/https?:\/\//g) || []).length, 0);
    assert.equal((patientRequests[0].text.body.match(/\?/g) || []).length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("an acknowledgement of a pending human price return stays silent without AI or a duplicate alert", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
    "WHATSAPP_ALERT_NUMBER",
    "YCLOUD_ALERT_TEMPLATE_NAME",
    "YCLOUD_ALERT_TEMPLATE_LANGUAGE",
    "WHATSAPP_AUTOMATION_MODE",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const pending = [];

  Object.assign(process.env, {
    YCLOUD_WEBHOOK_SECRET: WEBHOOK_SECRET,
    YCLOUD_API_KEY: "ycloud-test-key",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEETS_URL,
    GOOGLE_SHEETS_WEBHOOK_SECRET: "sheets-test-secret",
    OPENAI_API_KEY: "openai-test-key",
    WHATSAPP_ALERT_NUMBER: "+5511967743374",
    YCLOUD_ALERT_TEMPLATE_NAME: "alerta_revisao_liv_v1",
    YCLOUD_ALERT_TEMPLATE_LANGUAGE: "pt_BR",
    WHATSAPP_AUTOMATION_MODE: "active",
  });
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === SHEETS_URL) {
      const input = JSON.parse(options.body);
      if (input.action === "append_lead") {
        return new Response(JSON.stringify({
          ok: true,
          inserted: false,
          updated: true,
          duplicate: false,
          humanTakeoverToday: false,
          pendingCommitments: [{
            eventId: "original-price-review",
            kind: "procedure_price",
            summary: "Conferir a faixa atual e responder manualmente.",
            owner: "Amanda/equipe",
            dueAt: "2026-08-29T18:00:00.000Z",
            status: "pending",
          }],
          patientRelationship: {
            found: false,
            state: "engaged_lead",
          },
          opportunityId: "opp-pending-price",
          professional: "amanda",
          routeStatus: "resolved",
          routed: true,
        }), { status: 200 });
      }
      if (input.action === "get_conversation_context") {
        return new Response(JSON.stringify({
          ok: true,
          opportunityId: "opp-pending-price",
          professional: "amanda",
          turns: [{
            role: "assistant",
            source: "bruna",
            text: "Vou confirmar a faixa atual com a equipe e te retorno por aqui.",
            eventId: "original-price-holding",
            at: "2026-08-29T13:58:00.000Z",
          }],
          pendingCommitments: [{
            eventId: "original-price-review",
            kind: "procedure_price",
            summary: "Conferir a faixa atual e responder manualmente.",
            status: "pending",
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (
      url === "https://api.openai.com/v1/responses" ||
      url === YCLOUD_URL
    ) {
      throw new Error(`unexpected patient-side request: ${url}`);
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const response = await webhook(
      requestFor({
        id: "pending-price-ack-event",
        type: "whatsapp.inbound_message.received",
        createTime: "2026-08-29T14:00:00.000Z",
        whatsappInboundMessage: {
          id: "pending-price-ack-message",
          from: "+5511900000099",
          to: "+5511961957144",
          sendTime: "2026-08-29T14:00:00.000Z",
          type: "text",
          customerProfile: { name: "Karina" },
          text: { body: "Tudo bem, aguardo o retorno" },
        },
      }),
      { waitUntil: (promise) => pending.push(promise) },
    );
    const body = await response.json();
    await Promise.all(pending);

    assert.equal(response.status, 200);
    assert.equal(body.conversationAction.action, "wait_team");
    assert.equal(
      body.conversationAction.reason,
      "pending_human_commitment_acknowledged",
    );
    assert.equal(body.conversationAction.unresolvedRequest, false);
    assert.equal(body.reviewAlertQueued, false);
    assert.equal(body.priceHoldingQueued, false);
    assert.equal(body.patientReplyQueued, false);
    assert.equal(body.aiActiveQueued, false);
    assert.equal(body.aiAssessmentOnlyQueued, false);
    assert.equal(body.semanticAssessmentAttempted, false);
    assert.equal(body.commitmentSyncStatus, "skipped");
    assert.equal(
      requests.some((request) => request.url === YCLOUD_URL),
      false,
    );
    assert.equal(
      requests.some(
        (request) => request.url === "https://api.openai.com/v1/responses",
      ),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;

    for (const [key, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
