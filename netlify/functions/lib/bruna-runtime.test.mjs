import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import { runOpenAIShadow } from "./openai-shadow.mjs";
import { runLeadClassifier } from "./lead-classifier.mjs";
import { reviewScheduledFollowupContext } from "./scheduled-followup-context-review.mjs";

const env = { OPENAI_API_KEY: "synthetic" };
const history = [
  { direction: "IN", role: "user", text: "Gostaria de entender a avaliação." },
  { direction: "OUT", role: "assistant", source: "bruna", text: "A avaliação é individual." },
];
function decision(suggestedReply) {
  return { route: "standard_reply", confidence: "high", automaticAllowed: true, urgent: false,
    professional: "amanda", procedure: "lifting_cervical", replyCode: "", suggestedReply, reviewReason: "",
    conversationState: { activeTopic: "lifting cervical", patientAct: "answer", refersToEventId: "",
      lastClinicQuestion: "", lastClinicOffer: "", unresolvedQuestions: [], factsAlreadyProvided: [],
      owner: "bruna", nextExpectedAction: "responder", ambiguity: "", contextConfidence: "high" } };
}
const useful = "Você não precisa chegar com a decisão de fazer uma cirurgia.";
const profiles = [
  { name: "conversation", oldTimeout: 8_000, timeout: 20_000,
    run: options => runOpenAIShadow({ phone: "+5511900000000", text: "Como funciona?", recentConversation: history }, options),
    response: decision(useful) },
  { name: "classification", oldTimeout: 10_000, timeout: 15_000,
    run: options => runLeadClassifier({ phone: "+5511900000000", messages: history }, options),
    response: { recommendedStatus: "Novo", confidence: "high", professional: "amanda", procedure: "unknown",
      summary: "Dúvida sobre avaliação.", nextAction: "Aguardar paciente.", expectedParty: "patient",
      commercialReason: "Em andamento", evidence: "Pergunta informativa.", appointmentOutcome: "none", procedureMilestone: "none" } },
  { name: "followup review", oldTimeout: 8_000, timeout: 12_000,
    run: options => reviewScheduledFollowupContext({ patientPhone: "+5511900000000", body: "Ficou alguma dúvida?",
      humanApproved: true, recentConversation: history }, options),
    response: { decision: "send_exact", reasonCode: "context_aligned", confidence: "high" } },
];

// Fake elapsed time exercises the actual abort signal and response parsing;
// no network request or real patient is involved.
function delayedFetch(delays, responses, calls) {
  return async (url, options) => {
    const index = calls.length;
    calls.push({ url, signal: options.signal, body: JSON.parse(options.body), startedAt: Date.now() });
    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Synthetic timeout", "AbortError"));
      };
      const timer = setTimeout(() => {
        options.signal.removeEventListener("abort", abort);
        resolve(new Response(JSON.stringify({ model: "gpt-6.1-sol", status: "completed",
          output_text: JSON.stringify(responses[index]) })));
      }, delays[index]);
      options.signal.addEventListener("abort", abort, { once: true });
      if (options.signal.aborted) abort();
    });
  };
}
async function advance(t, ms) {
  t.mock.timers.tick(ms);
  await nextTurn();
}
for (const profile of profiles) {
  test(`${profile.name} accepts a complete response beyond the old deadline without waiting for the new ceiling`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
    const calls = [];
    let outcome;
    const pending = profile.run({ env, fetchImpl: delayedFetch([profile.oldTimeout + 1_000], [profile.response], calls) })
      .then(result => { outcome = result; return result; });
    await advance(t, profile.oldTimeout);
    assert.equal(outcome, undefined);
    assert.equal(calls[0].signal.aborted, false);
    await advance(t, 1_000);
    assert.equal((await pending).status, "completed");
    assert.ok(Date.now() < profile.timeout);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.model, "gpt-6.1-sol");
    assert.equal(calls[0].body.reasoning.effort, "medium");
    assert.equal(calls[0].body.max_output_tokens, 4096);
    assert.equal(calls[0].body.text.verbosity, "low");
    await advance(t, 60_000);
    assert.equal(calls[0].signal.aborted, false, "completed requests must release the deadline timer");
  });

  test(`${profile.name} aborts at its total ceiling and fails closed without an API retry`, async t => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
    const calls = [];
    let outcome;
    const pending = profile.run({ env, fetchImpl: delayedFetch([profile.timeout + 1_000], [profile.response], calls) })
      .then(result => { outcome = result; return result; });
    await advance(t, profile.timeout - 1);
    assert.equal(outcome, undefined);
    assert.equal(calls[0].signal.aborted, false);
    await advance(t, 1);
    const result = await pending;
    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "timeout");
    assert.notEqual(result.allowed, true);
    assert.equal(calls[0].signal.aborted, true);
    await advance(t, 60_000);
    assert.equal(calls.length, 1);
  });
}

const continuityInput = { phone: "+5511900000000", text: "No pescoço", procedure: "lifting_cervical",
  recentConversation: [
    { role: "assistant", source: "bruna", text: "Na avaliação, a Dra. Amanda observa a região para entender as possibilidades. O que você gostaria de entender primeiro?" },
    { role: "user", text: "Tenho dúvidas se esse é o meu caso." },
    { role: "assistant", source: "bruna", text: "Entendo a sua dúvida. A indicação depende de uma avaliação presencial, em que a Dra. Amanda examina a região e conversa sobre possibilidades e limites. O que mais chamou sua atenção no pescoço?" },
    { role: "user", text: "Tenho algumas linhas de expressão que me incomodam." },
  ], replyContract: { maxLinks: 0, maxQuestions: 1, allowCta: false } };
const redundant = "Entendo a preocupação com as linhas no pescoço. Só a avaliação presencial permite entender se faz sentido para o seu caso e conversar sobre possibilidades e limites.";
const continuityEnv = { ...env, BRUNA_CONVERSION_EXPERIENCE_V1: "enabled" };

test("a late repetitive draft skips the paid rewrite when fewer than eight seconds remain", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const calls = [];
  const pending = runOpenAIShadow(continuityInput, { env: continuityEnv,
    fetchImpl: delayedFetch([12_001, 1], [decision(redundant), decision(useful)], calls) });
  await advance(t, 12_001);
  const result = await pending;
  assert.equal(calls.length, 1);
  assert.equal(result.decision.route, "human_review");
  assert.equal(result.decision.automaticAllowed, false);
  assert.equal(result.decision.suggestedReply, "");
  await advance(t, 60_000);
  assert.equal(calls.length, 1);
});

test("one useful rewrite can finish within the remaining eight seconds", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const calls = [];
  const pending = runOpenAIShadow(continuityInput, { env: continuityEnv,
    fetchImpl: delayedFetch([12_000, 7_999], [decision(redundant), decision(useful)], calls) });
  await advance(t, 12_000);
  assert.equal(calls.length, 2);
  assert.ok(JSON.parse(calls[1].body.input).continuityRevision);
  assert.equal(calls[0].signal, calls[1].signal);
  await advance(t, 7_999);
  const result = await pending;
  assert.equal(result.decision.suggestedReply, useful);
  assert.equal(result.decision.automaticAllowed, true);
});

test("a rewrite is cut off by the original deadline rather than receiving twenty more seconds", async t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const calls = [];
  let outcome;
  const pending = runOpenAIShadow(continuityInput, { env: continuityEnv,
    fetchImpl: delayedFetch([12_000, 8_001], [decision(redundant), decision(useful)], calls) })
    .then(result => { outcome = result; return result; });
  await advance(t, 12_000);
  assert.equal(calls.length, 2);
  await advance(t, 7_999);
  assert.equal(outcome, undefined);
  await advance(t, 1);
  const result = await pending;
  assert.equal(calls[0].signal, calls[1].signal);
  assert.equal(calls[1].signal.aborted, true);
  assert.equal(result.decision.route, "human_review");
  assert.equal(result.decision.automaticAllowed, false);
  assert.equal(result.decision.suggestedReply, "");
  await advance(t, 60_000);
  assert.equal(calls.length, 2);
});
