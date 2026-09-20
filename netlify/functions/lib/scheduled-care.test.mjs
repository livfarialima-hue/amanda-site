import assert from "node:assert/strict";
import test from "node:test";
import { handleScheduledCare, BIRTHDAY_CARE_TEXT, validateCareReceipt, sendBirthdayCare } from "./scheduled-care.mjs";

const now = new Date("2026-09-14T13:30:00Z");
const care = { ok: true, planId: "care:" + "a".repeat(43), patientPhone: "+5511900000000", professional: "amanda", opportunityId: "opp-test", purpose: "post_consult", body: "Olá! Ficou alguma dúvida para encaminhar à equipe?", referenceDate: "2026-09-11", approvedAt: "2026-09-14T12:00:00Z", checkedAt: now.toISOString(), contextSignature: "approved-snapshot", contextAnchorMessageId: "out-test" };
function setup(overrides = {}) {
  const records = new Map(); const count = { send: 0, read: 0, memory: 0, append: 0 };
  const store = { get: async key => records.get(key), setJSON: async (key, value, options) => { if (options?.onlyIfNew && records.has(key)) return { modified: false }; records.set(key, value); return { modified: true }; } };
  const deps = { env: { WHATSAPP_SCHEDULED_CARE_ENABLED: "true", WHATSAPP_BIRTHDAY_CARE_ENABLED: "true", YCLOUD_BIRTHDAY_TEMPLATE_NAME: "synthetic_birthday", YCLOUD_FOLLOWUP_TEMPLATE_NAME: "synthetic_followup", YCLOUD_API_KEY: "test" }, now, getStoreImpl: () => store,
    callSheetsImpl: async () => { count.read++; return { status: "completed", data: { ...care } }; },
    readMemoryImpl: async () => { count.memory++; return { status: "completed", turns: [] }; },
    getBusinessNumberImpl: async () => "+5511999999999",
    appendMemoryImpl: async () => { count.append++; },
    sendTemplateImpl: async () => { count.send++; return { status: "completed" }; },
    sendBirthdayImpl: async () => { count.send++; return { status: "completed" }; }, ...overrides,
  };
  return { deps, count, records, request: () => handleScheduledCare({ planId: care.planId }, deps) };
}

test("Google review delivery requires Amanda, a canonical individual approval and a single reserved attempt", async () => {
  const invitation = {...care,purpose:"google_review",body:"Convite individual aprovado no cadastro"};
  assert.equal(validateCareReceipt(invitation,now),"");
  assert.equal(validateCareReceipt({...invitation,professional:"daniel"},now),"google_review_professional_invalid");
  const h=setup({callSheetsImpl:async()=>({status:"completed",data:invitation})});
  assert.equal((await (await h.request()).json()).sent,true);
  assert.equal((await (await h.request()).json()).duplicate,true); assert.equal(h.count.send,1);
  const denied=setup({callSheetsImpl:async()=>({status:"completed",data:{...invitation,professional:"daniel"}})});
  assert.equal((await (await denied.request()).json()).error,"google_review_professional_invalid"); assert.equal(denied.count.send,0);
});

test("Google review cannot change purpose or professional during the last canonical check", async () => {
  for (const change of [{purpose:"post_consult"},{professional:"daniel"},{opportunityId:"other"}]) {
    let reads=0; const h=setup({callSheetsImpl:async()=>({status:"completed",data:{...care,purpose:"google_review",...(reads++ ? change : {})}})});
    assert.equal((await (await h.request()).json()).error,"care_context_changed"); assert.equal(h.count.send,0);
  }
});

test("uncertain Google invitations remain reserved and are never retried because the patient was silent", async () => {
  const h=setup({callSheetsImpl:async()=>({status:"completed",data:{...care,purpose:"google_review"}}),sendTemplateImpl:async()=>{throw new Error("timeout");}});
  assert.equal((await (await h.request()).json()).uncertain,true);
  const reads=h.count.read;
  assert.equal((await (await h.request()).json()).error,"care_delivery_requires_reconciliation"); assert.equal(h.count.read,reads);
});

test("delivery uses canonical recipient/text, rechecks after reservation, and deduplicates repeated requests", async () => {
  const h = setup();
  const first = await (await handleScheduledCare({ planId: care.planId, body: "injected", patientPhone: "+5511888888888" }, h.deps)).json();
  assert.equal(first.sent, true); assert.ok(first.effectiveBody.includes(care.body)); assert.equal(h.count.read, 2);
  assert.equal((await (await h.request()).json()).duplicate, true); assert.equal(h.count.send, 1);
});

test("new human activity arriving between approval and delivery cancels care", async () => {
  const h = setup({ readMemoryImpl: async () => ({ status: "completed", turns: [{ at: "2026-09-14T13:29:00Z", source: "human" }] }) });
  assert.equal((await (await h.request()).json()).error, "care_context_changed"); assert.equal(h.count.send, 0);
});

test("a changed canonical snapshot during final reread prevents the send", async () => {
  let reads = 0;
  const h = setup({ callSheetsImpl: async () => ({ status: "completed", data: { ...care, contextSignature: reads++ ? "changed" : care.contextSignature } }) });
  assert.equal((await (await h.request()).json()).error, "care_context_changed"); assert.equal(h.count.send, 0);
});

test("concurrent callers cannot both pass the delivery reservation", async () => {
  const h = setup(); const results = await Promise.all([h.request(), h.request()]);
  const bodies = await Promise.all(results.map(r => r.json()));
  assert.equal(h.count.send, 1); assert.equal(bodies.filter(r => r.sent).length, 1);
});

test("timeouts retain an uncertain receipt and never become automatic retries", async () => {
  let attempts = 0;
  const h = setup({ sendTemplateImpl: async () => { attempts++; throw new Error("timeout"); } });
  assert.equal((await (await h.request()).json()).uncertain, true);
  assert.equal((await (await h.request()).json()).uncertain, true); assert.equal(attempts, 1);
});

test("missing memory and missing canonical confirmation both fail closed", async () => {
  const h = setup({ readMemoryImpl: async () => ({ status: "failed" }) });
  assert.equal((await (await h.request()).json()).sent, false); assert.equal(h.count.send, 0);
  const missing = setup({ callSheetsImpl: async () => ({ status: "failed", errorCode: "timeout" }) });
  assert.equal((await (await missing.request()).json()).sent, false); assert.equal(missing.count.send, 0);
});

test("birthday is refused before reservation even with an approved template and enabled legacy flags", async () => {
  const birthday = { ...care, purpose: "birthday", referenceDate: "2026-09-14", body: BIRTHDAY_CARE_TEXT };
  assert.equal(validateCareReceipt(birthday, now), "birthday_manual_only");
  const h = setup({ callSheetsImpl: async () => ({ status: "completed", data: birthday }) });
  assert.equal((await (await h.request()).json()).error, "birthday_manual_only");
  assert.equal(h.count.send, 0); assert.equal(h.records.size, 0); assert.equal(h.count.append, 0);
  delete h.deps.env.YCLOUD_BIRTHDAY_TEMPLATE_NAME;
  assert.equal((await (await h.request()).json()).error, "birthday_manual_only"); assert.equal(h.count.send, 0);
});

test("status-only receipt reconciliation never starts a patient send", async () => {
  const h = setup(); const result = await (await handleScheduledCare({ planId: care.planId, statusOnly: true }, h.deps)).json();
  assert.equal(result.status, "not_attempted"); assert.equal(h.count.send, 0); assert.equal(h.count.read, 0);
});

test("the transport blocks care after 18h and weekend milestones and always keeps birthdays manual", async () => {
  const evening = new Date("2026-09-14T21:10:00Z");
  assert.equal(validateCareReceipt({ ...care, checkedAt: evening.toISOString() }, evening), "care_outside_send_window");
  const weekend = new Date("2026-09-19T13:30:00Z");
  const fresh = { ...care, checkedAt: weekend.toISOString(), approvedAt: "2026-09-19T12:00:00Z" };
  assert.equal(validateCareReceipt(fresh, weekend), "care_outside_send_window");
  assert.equal(validateCareReceipt({ ...fresh, purpose: "birthday", body: BIRTHDAY_CARE_TEXT, referenceDate: "2026-09-19" }, weekend), "birthday_manual_only");
});

test("the legacy birthday adapter cannot call the provider", async () => {
  let captured;
  const result = await sendBirthdayCare({ from: "+5511999999999", to: care.patientPhone, eventId: "synthetic" }, { env: setup().deps.env, fetchImpl: async (_url, options) => { captured = JSON.parse(options.body); return new Response("{}", { status: 200 }); } });
  assert.equal(result.status, "failed"); assert.equal(result.errorCode, "birthday_manual_only"); assert.equal(captured, undefined);
});
