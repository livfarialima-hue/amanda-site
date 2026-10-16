import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import webhook from "../ycloud-webhook.mjs";

for (const scenario of ["parking", "transit", "semantic_veto"]) {
  test(`actual inbound answers known clinic logistics without a holding: ${scenario}`, async t => {
    const settings={YCLOUD_WEBHOOK_SECRET:"synthetic-logistics-secret",YCLOUD_API_KEY:"synthetic",GOOGLE_SHEETS_WEBHOOK_URL:"https://sheets.example.test/webhook",GOOGLE_SHEETS_WEBHOOK_SECRET:"synthetic",WHATSAPP_AUTOMATION_MODE:"active",WHATSAPP_HUMAN_REPLY_GUARD_MS:"0",WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS:"0",WHATSAPP_REPLY_DEBOUNCE_AI_MS:"0",OPENAI_API_KEY:"synthetic",WHATSAPP_ALERT_NUMBER:""};
    const saved=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));Object.assign(process.env,settings);
    t.after(()=>{for(const[k,v]of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
    const logs=[];t.mock.method(console,"log",line=>logs.push(String(line)));
    const sent=[],text=scenario==="transit"?"Tem metrô perto?":"Tem estacionamento ai",phone=scenario==="parking"?"+5511900000072":scenario==="transit"?"+5511900000073":"+5511900000074";
    const history=[{role:"user",source:"paciente",text:"Gostaria de informações sobre a consulta com a Dra. Amanda.",at:"2026-08-19T16:00:00Z"}];
    t.mock.method(globalThis,"fetch",async(url,options)=>{
      const data=JSON.parse(options.body);
      if(url===settings.GOOGLE_SHEETS_WEBHOOK_URL){
        if(data.action==="get_conversation_context")return Response.json({ok:true,turns:history,professional:"amanda"});
        if(data.action==="get_bot_knowledge_context")return Response.json({ok:true,candidates:[]});
        return Response.json({ok:true,routed:true,routeStatus:"resolved",professional:"amanda",patientRelationship:{found:false,state:"new_lead"}});
      }
      if(url==="https://api.openai.com/v1/responses"){
        const input=JSON.parse(data.input),h=input.policyHints;
        assert.match(h.deterministicReplyCode,/^ADMIN-SIDE-(?:PARKING|TRANSIT)-01$/);
        assert.doesNotMatch(h.deterministicReplyPreview,/recebi|retorno|avisad/i);
        return Response.json({model:"synthetic",output_text:JSON.stringify({route:scenario==="semantic_veto"?"human_review":"standard_reply",confidence:"high",automaticAllowed:scenario!=="semantic_veto",urgent:false,professional:"amanda",procedure:"unknown",replyCode:h.deterministicReplyCode,suggestedReply:h.deterministicReplyPreview,reviewReason:scenario==="semantic_veto"?"wait_for_team":"",
          conversationState:{activeTopic:"logística da clínica",patientAct:"question",refersToEventId:"",lastClinicQuestion:"",lastClinicOffer:"",unresolvedQuestions:[],factsAlreadyProvided:[],owner:scenario==="semantic_veto"?"human_team":"bruna",nextExpectedAction:"responder pergunta",ambiguity:"",contextConfidence:"high"}})});
      }
      assert.equal(url,"https://api.ycloud.com/v2/whatsapp/messages");sent.push(data);return Response.json({status:"accepted"});
    });
    const payload={id:`synthetic-logistics-${scenario}`,type:"whatsapp.inbound_message.received",createTime:"2026-08-19T17:00:00Z",whatsappInboundMessage:{id:`synthetic-logistics-message-${scenario}`,from:phone,to:"+5511900000098",sendTime:"2026-08-19T17:00:00Z",type:"text",text:{body:text}}};
    const body=JSON.stringify(payload),timestamp="1787158800",signature=createHmac("sha256",settings.YCLOUD_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex");
    const response=await webhook(new Request("http://localhost/api/ycloud/webhook",{method:"POST",headers:{"YCloud-Signature":`t=${timestamp},s=${signature}`},body}));
    const result=await response.json(),replies=sent.filter(m=>m.to===phone);
    assert.equal(replies.length,scenario==="semantic_veto"?0:1,JSON.stringify({result,logs}));
    if(replies.length){assert.match(replies[0].text.body,scenario==="transit"?/estação Pinheiros/:/estacionamento pago/);assert.doesNotMatch(replies[0].text.body,/recebi|retorno|avisad|\?/i);}
  });
}

test("actual webhook ignores unavailable content after an older supplier offer", async t => {
  const settings={YCLOUD_WEBHOOK_SECRET:"synthetic-supplier-secret",YCLOUD_API_KEY:"synthetic",GOOGLE_SHEETS_WEBHOOK_URL:"https://sheets.example.test/webhook",GOOGLE_SHEETS_WEBHOOK_SECRET:"synthetic",WHATSAPP_AUTOMATION_MODE:"active",WHATSAPP_HUMAN_REPLY_GUARD_MS:"0",WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS:"0",OPENAI_API_KEY:""};
  const saved=Object.fromEntries(Object.keys(settings).map(k=>[k,process.env[k]]));Object.assign(process.env,settings);
  t.after(()=>{for(const[k,v]of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
  t.mock.method(console,"log",()=>{});
  const calls=[],history=[{role:"user",direction:"IN",source:"paciente",text:"Sou Ana, da Empresa Exemplo. Ajudamos clínicas a vender mais e gostaria de apresentar nossos serviços.",at:"2026-08-01T12:00:00Z"}];
  t.mock.method(globalThis,"fetch",async(url,options)=>{
    const body=JSON.parse(options.body);calls.push({url,body});
    assert.equal(url,settings.GOOGLE_SHEETS_WEBHOOK_URL,"no model or WhatsApp destination is allowed");
    if(body.action==="get_conversation_context")return Response.json({ok:true,turns:history});
    return Response.json({ok:true,routed:false,routeStatus:"pending",professional:"unknown",patientRelationship:{found:false}});
  });
  const payload={id:"synthetic-old-supplier-empty-event",type:"whatsapp.inbound_message.received",createTime:"2026-08-19T17:00:00Z",whatsappInboundMessage:{id:"synthetic-old-supplier-empty-message",from:"+5511900000071",to:"+5511900000098",sendTime:"2026-08-19T17:00:00Z",type:"unsupported",unsupported:{}}};
  const body=JSON.stringify(payload),timestamp="1787158800",signature=createHmac("sha256",settings.YCLOUD_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex");
  const response=await webhook(new Request("http://localhost/api/ycloud/webhook",{method:"POST",headers:{"YCloud-Signature":`t=${timestamp},s=${signature}`},body}));
  const result=await response.json();
  assert.equal(response.status,200);assert.equal(result.automation.route,"ignore",JSON.stringify(result));
  assert.notEqual(result.missingTextClarificationSent,true);
  assert.equal(calls.filter(x=>x.body.action==="send_review_alert_email").length,0);
});

test("a text event with an omitted body receives one safe clarification", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_HUMAN_REPLY_GUARD_MS",
    "WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS",
    "WHATSAPP_ALERT_NUMBER",
    "OPENAI_API_KEY",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];

  process.env.YCLOUD_WEBHOOK_SECRET = "missing-text-secret";
  process.env.YCLOUD_API_KEY = "ycloud-key";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL =
    "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  process.env.WHATSAPP_AUTOMATION_MODE = "active";
  process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS = "0";
  process.env.WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS = "0";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.OPENAI_API_KEY;
  console.log = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const requestBody = JSON.parse(options.body);
      if (requestBody.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }),
          { status: 200 },
        );
      }

      return new Response('{"ok":true}', { status: 200 });
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const payload = {
      id: "evt-missing-text-real-shape",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-08-19T23:50:31.000Z",
      whatsappInboundMessage: {
        id: "provider-message-without-body",
        wamid: "wamid.missing-text-real-shape",
        from: "+5511900000099",
        to: "+5511961957144",
        sendTime: "2026-08-19T23:50:31.000Z",
        type: "text",
        text: {},
        customerProfile: { name: "Paciente Teste" },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = "1787183431";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
    );
    const responseBody = await response.json();
    const patientMessages = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((body) => body.to === payload.whatsappInboundMessage.from);

    assert.equal(response.status, 200);
    assert.equal(responseBody.leadRouted, false);
    assert.equal(responseBody.automation.route, "human_review");
    assert.equal(responseBody.missingInboundText, true);
    assert.equal(responseBody.missingTextClarificationQueued, true);
    assert.equal(responseBody.missingTextClarificationSent, true);
    assert.equal(patientMessages.length, 1);
    assert.match(
      patientMessages[0].text.body,
      /Eu sou a Bruna, concierge da Clínica LIV Faria Lima/i,
    );
    assert.match(
      patientMessages[0].text.body,
      /A Dra\. Amanda Schroeder é cirurgiã plástica/i,
    );
    assert.match(
      patientMessages[0].text.body,
      /o que você gostaria de avaliar ou melhorar/i,
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

test("an unsupported inbound event receives one safe clarification without inferred routing", async () => {
  const environmentKeys = [
    "YCLOUD_WEBHOOK_SECRET",
    "YCLOUD_API_KEY",
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "GOOGLE_SHEETS_WEBHOOK_SECRET",
    "WHATSAPP_AUTOMATION_MODE",
    "WHATSAPP_HUMAN_REPLY_GUARD_MS",
    "WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS",
    "WHATSAPP_ALERT_NUMBER",
    "OPENAI_API_KEY",
  ];
  const savedEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  const operationalLogs = [];

  process.env.YCLOUD_WEBHOOK_SECRET = "unsupported-event-secret";
  process.env.YCLOUD_API_KEY = "ycloud-key";
  process.env.GOOGLE_SHEETS_WEBHOOK_URL =
    "https://sheets.example.test/webhook";
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "sheets-secret";
  process.env.WHATSAPP_AUTOMATION_MODE = "active";
  process.env.WHATSAPP_HUMAN_REPLY_GUARD_MS = "0";
  process.env.WHATSAPP_REPLY_DEBOUNCE_DETERMINISTIC_MS = "0";
  delete process.env.WHATSAPP_ALERT_NUMBER;
  delete process.env.OPENAI_API_KEY;
  console.log = (line) => operationalLogs.push(String(line));
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url === process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const requestBody = JSON.parse(options.body);
      if (requestBody.action === "append_lead") {
        return new Response(
          JSON.stringify({
            ok: true,
            inserted: false,
            updated: false,
            routed: false,
            routeStatus: "pending",
            professional: "unknown",
            patientRelationship: {
              found: false,
              relationshipState: "unknown",
            },
          }),
          { status: 200 },
        );
      }

      return new Response('{"ok":true}', { status: 200 });
    }

    if (url === "https://api.ycloud.com/v2/whatsapp/messages") {
      return new Response('{"status":"accepted"}', { status: 200 });
    }

    throw new Error(`unexpected destination: ${url}`);
  };

  try {
    const payload = {
      id: "evt-unsupported-content",
      type: "whatsapp.inbound_message.received",
      createTime: "2026-08-22T18:08:56.000Z",
      whatsappInboundMessage: {
        id: "provider-message-unsupported",
        wamid: "wamid.unsupported-content",
        from: "+5511900000098",
        to: "+5511961957144",
        sendTime: "2026-08-22T18:08:56.000Z",
        type: "unsupported",
        unsupported: {},
        errors: [
          {
            code: 131060,
            title: "Synthetic provider error",
            message: "Synthetic content that must not appear in logs",
          },
        ],
        customerProfile: { name: "Rosana" },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = "1787422136";
    const signature = createHmac(
      "sha256",
      process.env.YCLOUD_WEBHOOK_SECRET,
    )
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const response = await webhook(
      new Request("http://localhost/api/ycloud/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "YCloud-Signature": `t=${timestamp},s=${signature}`,
        },
        body: rawBody,
      }),
    );
    const responseBody = await response.json();
    const patientMessages = requests
      .filter(
        (request) =>
          request.url === "https://api.ycloud.com/v2/whatsapp/messages",
      )
      .map((request) => JSON.parse(request.options.body))
      .filter((body) => body.to === payload.whatsappInboundMessage.from);
    const processingLog = operationalLogs
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .find((entry) => entry?.category === "inbound_processing");

    assert.equal(response.status, 200);
    assert.equal(responseBody.leadRouted, false);
    assert.equal(responseBody.automation.route, "human_review");
    assert.equal(responseBody.missingInboundText, false);
    assert.equal(responseBody.unsupportedInboundContent, true);
    assert.equal(responseBody.unavailableInboundContent, true);
    assert.equal(responseBody.missingTextClarificationQueued, true);
    assert.equal(responseBody.missingTextClarificationSent, true);
    assert.equal(patientMessages.length, 1);
    assert.equal(
      patientMessages[0].text.body,
      "Olá, Rosana! Eu sou a Bruna, concierge da Clínica LIV Faria Lima.\n\n" +
        "A Dra. Amanda Schroeder é cirurgiã plástica e atende aqui na clínica. " +
        "Me conta: o que você gostaria de avaliar ou melhorar?",
    );
    assert.equal(
      (patientMessages[0].text.body.match(/\?/g) || []).length,
      1,
    );
    assert.doesNotMatch(
      patientMessages[0].text.body,
      /lifting|procedimento|M26|131060|incomplet|reenvi|falha/i,
    );
    assert.equal(processingLog?.inboundAvailability, "upstream_unsupported");
    assert.equal(processingLog?.unsupportedSubtype, "unknown");
    assert.deepEqual(processingLog?.unsupportedErrorCodes, ["131060"]);
    assert.doesNotMatch(
      JSON.stringify(processingLog),
      /Synthetic provider error|Synthetic content|Rosana/i,
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
