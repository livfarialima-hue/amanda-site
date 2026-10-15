import assert from "node:assert/strict";
import test from "node:test";
import { processClaimedJobs } from "../classify-leads.mjs";
import { runLeadClassifier } from "./lead-classifier.mjs";

test("personal qualification reaches the canonical writer without becoming scheduling consent", async () => {
  const calls = [];
  const classification = {
    recommendedStatus: "Qualificado", confidence: "high", professional: "amanda", procedure: "lifting cervical",
    summary: "Interesse pessoal em avaliação; recebeu as informações solicitadas.",
    nextAction: "Aguardar retorno da pessoa.", expectedParty: "patient", commercialReason: "Em andamento",
    evidence: "Procura pessoal de tratamento, além da mensagem de origem.",
    appointmentOutcome: "none", procedureMilestone: "none",
  };
  const job = {
    phone: "+551100000090", leaseToken: "lease-personal", opportunityId: "opp-personal",
    professional: "amanda", currentStatus: "Novo", conversationRevision: "revision-personal",
    patientRelationship: { found: true, relationshipState: "new_lead", hasPendingHumanTask: false },
    messages: [
      { direction: "IN", text: "Tenho flacidez no pescoço e procuro tratamento. Qual o valor da consulta?" },
      { direction: "OUT", text: "A consulta custa R$ 500. A indicação é definida na avaliação.", source: "equipe_humana" },
    ],
  };
  const results = await processClaimedJobs([job], {
    classifier: input => runLeadClassifier(input, {
      env: { OPENAI_API_KEY: "test-key" },
      fetchImpl: async (_url, options) => {
        const request = JSON.parse(options.body);
        assert.match(request.instructions, /Interesse pessoal compatível pode ser qualificado sem pedido de agenda/);
        assert.match(request.instructions, /Qualificado não é autorização de agenda/);
        assert.doesNotMatch(request.instructions, /Só qualifique quando houver pedido prático/);
        return new Response(JSON.stringify({ status: "completed", output_text: JSON.stringify(classification) }),
          { status: 200, headers: { "content-type": "application/json" } });
      },
    }),
    callSheets: async (action, payload) => { calls.push({ action, payload }); return { status: "completed" }; },
    waitImpl: async () => {},
  });
  assert.equal(results[0].recommendedStatus, "Qualificado");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, "complete_classification");
  assert.deepEqual(calls[0].payload.classification, classification);
  assert.equal(calls[0].payload.job.conversationRevision, job.conversationRevision);
  assert.equal(calls[0].payload.job.opportunityId, job.opportunityId);
});

test("the worker preserves short-acceptance context and exact opportunity identifiers at the canonical writer", async () => {
  for (const [offer, expectedStatus] of [
    ["Você gostaria de verificar os próximos horários disponíveis?", "Qualificado"],
    ["Posso explicar como funciona a avaliação?", "Novo"],
  ]) {
    const calls = [];
    const classification = {
      recommendedStatus: "Qualificado", confidence: "high", professional: "amanda", procedure: "avaliação",
      summary: "A pessoa respondeu à última oferta da clínica.", nextAction: "Verificar horários disponíveis.",
      expectedParty: "clinic", commercialReason: "Em andamento", evidence: "Resposta curta no contexto da oferta.",
      appointmentOutcome: "none", procedureMilestone: "none",
    };
    const job = {
      phone: "+551100000091", leaseToken: "lease-offer", opportunityId: "opp-offer", professional: "amanda",
      throughMessageId: "message-offer", claimedVersion: 7, currentStatus: "Novo", conversationRevision: "revision-offer",
      messages: [
        { direction: "OUT", source: "bruna", text: "Você gostaria de verificar os próximos horários disponíveis?" },
        { direction: "OUT", source: "equipe_humana", text: offer },
        { direction: "IN", text: "Sim", messageType: "text" },
      ],
    };
    await processClaimedJobs([job], {
      classifier: input => runLeadClassifier(input, {
        env: { OPENAI_API_KEY: "test-key" },
        fetchImpl: async () => new Response(JSON.stringify({ status: "completed", output_text: JSON.stringify(classification) }),
          { status: 200, headers: { "content-type": "application/json" } }),
      }),
      callSheets: async (action, payload) => { calls.push({ action, payload }); return { status: "completed" }; },
      waitImpl: async () => {},
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].action, "complete_classification");
    for (const key of ["opportunityId", "professional", "leaseToken", "claimedVersion", "conversationRevision", "throughMessageId"]) {
      assert.equal(calls[0].payload.job[key], job[key], key);
    }
    const persisted = calls[0].payload.classification;
    assert.equal(persisted.recommendedStatus, expectedStatus);
    assert.equal(persisted.expectedParty, expectedStatus === "Qualificado" ? "clinic" : "patient");
    assert.equal(persisted.appointmentOutcome, "none");
    assert.equal(persisted.procedureMilestone, "none");
  }
});

test("the worker keeps conflicting professionals separate for the canonical human review", async () => {
  const calls = [];
  const classification = { ...completedClassification().classification, professional: "daniel" };
  const results = await processClaimedJobs([{
    phone: "+551100000092", leaseToken: "lease-conflict", opportunityId: "opp-amanda-conflict",
    professional: "amanda", throughMessageId: "message-conflict", claimedVersion: 4, conversationRevision: "revision-conflict",
  }], {
    classifier: async () => ({ ...completedClassification(), classification }),
    callSheets: async (action, payload) => {
      calls.push({ action, payload });
      return { status: "completed", reviewRequired: true, reason: "professional_mismatch", appliedStatus: "Novo" };
    },
    waitImpl: async () => {},
  });
  assert.equal(results[0].status, "completed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, "complete_classification");
  assert.equal(calls[0].payload.job.professional, "amanda");
  assert.equal(calls[0].payload.classification.professional, "daniel");
  assert.equal(calls[0].payload.job.opportunityId, "opp-amanda-conflict");
  assert.equal(calls[0].payload.job.leaseToken, "lease-conflict");
});

test("an unresponsive classifier releases its exact lease instead of waiting for lease expiry", { timeout: 250 }, async () => {
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-deadline", opportunityId: "opp-deadline", professional: "amanda" }], {
    classifier: () => new Promise(() => {}), classificationTimeoutMs: 10,
    callSheets: async (action, payload) => { writes.push({ action, payload }); return { status: "completed" }; },
  });
  assert.equal(result[0].status, "failed");
  assert.equal(result[0].errorCode, "classification_timeout");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].action, "fail_classification");
  assert.equal(writes[0].payload.job.leaseToken, "lease-deadline");
  assert.equal(writes[0].payload.job.opportunityId, "opp-deadline");
});

test("an unexpected classifier rejection releases the lease with a technical reason", async () => {
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-rejection" }], {
    classifier: async () => { throw new Error("private unexpected payload"); },
    callSheets: async (action, payload) => { writes.push({ action, payload }); return { status: "completed" }; },
  });
  assert.equal(result[0].errorCode, "classification_exception");
  assert.equal(writes[0].action, "fail_classification");
  assert.equal(writes[0].payload.job.leaseToken, "lease-rejection");
  assert.doesNotMatch(JSON.stringify(result), /private unexpected payload/);
});

test("a classifier result arriving after its deadline cannot complete the released lease", async () => {
  let finish;
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-late" }], {
    classifier: () => new Promise(resolve => { finish = resolve; }), classificationTimeoutMs: 10,
    callSheets: async (action) => { writes.push(action); return { status: "completed" }; },
  });
  finish(completedClassification());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(result[0].status, "failed");
  assert.deepEqual(writes, ["fail_classification"]);
});

test("an unresponsive completion is bounded and falls back to the same lease release", async () => {
  const { withClassificationDeadline } = await import("../classify-leads.mjs");
  const writes = [];
  const result = await processClaimedJobs([{ phone: "+551100000099", leaseToken: "lease-write" }], {
    classifier: async () => completedClassification(), waitImpl: async () => {},
    deadline: operation => withClassificationDeadline(operation, 10),
    callSheets: async (action, payload) => { writes.push({ action, payload }); return action === "complete_classification" ? new Promise(() => {}) : { status: "completed" }; },
  });
  assert.equal(result[0].status, "failed");
  assert.equal(writes.length, 4);
  assert.equal(writes.at(-1).action, "fail_classification");
  assert.equal(writes.at(-1).payload.job.leaseToken, "lease-write");
  assert.equal(writes.at(-1).payload.job.errorCode, "complete_timeout");
});

function completedClassification(status = "Qualificado") {
  return {
    status: "completed",
    model: "test-model",
    classification: {
      recommendedStatus: status,
      confidence: "high",
    },
    usage: null,
  };
}

test("classifies in parallel but persists completions sequentially", async () => {
  let activeClassifiers = 0;
  let peakClassifiers = 0;
  let activeWrites = 0;
  let peakWrites = 0;
  const calls = [];
  const results = await processClaimedJobs(
    [
      { phone: "+551100000001", leaseToken: "lease-1" },
      { phone: "+551100000002", leaseToken: "lease-2" },
      { phone: "+551100000003", leaseToken: "lease-3" },
    ],
    {
      classifier: async () => {
        activeClassifiers += 1;
        peakClassifiers = Math.max(peakClassifiers, activeClassifiers);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeClassifiers -= 1;
        return completedClassification();
      },
      callSheets: async (action, payload) => {
        activeWrites += 1;
        peakWrites = Math.max(peakWrites, activeWrites);
        await new Promise((resolve) => setTimeout(resolve, 2));
        activeWrites -= 1;
        calls.push({ action, payload });
        return { status: "completed" };
      },
      waitImpl: async () => {},
    },
  );

  assert.equal(peakClassifiers, 1);
  assert.equal(peakWrites, 1);
  assert.equal(results.every((item) => item.status === "completed"), true);
  assert.deepEqual(
    calls.map((call) => call.payload.job.leaseToken),
    ["lease-1"],
  );
});

test("a completion failure releases the same lease for retry", async () => {
  const calls = [];
  const results = await processClaimedJobs(
    [{
      phone: "+551100000004",
      throughMessageId: "message-4",
      leaseToken: "lease-4",
    }],
    {
      classifier: async () => completedClassification(),
      callSheets: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "complete_classification") {
          return { status: "failed", errorCode: "busy_retry" };
        }
        return { status: "completed" };
      },
      waitImpl: async () => {},
    },
  );

  assert.equal(results[0].status, "failed");
  assert.deepEqual(
    calls.map((call) => call.action),
    [
      "complete_classification",
      "complete_classification",
      "complete_classification",
      "fail_classification",
    ],
  );
  assert.equal(calls.at(-1).payload.job.leaseToken, "lease-4");
  assert.equal(
    calls.at(-1).payload.job.errorCode,
    "complete_busy_retry",
  );
});

test("an ignored stale completion is not reported as success", async () => {
  const calls = [];
  const results = await processClaimedJobs(
    [{ phone: "+551100000005", leaseToken: "stale-lease" }],
    {
      classifier: async () => completedClassification(),
      callSheets: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "complete_classification") {
          return {
            status: "completed",
            data: { status: "ignored", error: "stale_lease" },
          };
        }
        return { status: "completed" };
      },
      waitImpl: async () => {},
    },
  );

  assert.equal(results[0].status, "failed");
  assert.equal(results[0].errorCode, "stale_lease");
  assert.deepEqual(
    calls.map((call) => call.action),
    ["complete_classification", "fail_classification"],
  );
});


test("a timeout retries the same classification reservation instead of claiming another lead", async () => {
  const {claimClassificationBatch}=await import("../classify-leads.mjs");
  const calls=[];
  const result=await claimClassificationBatch({now:()=>1789693200000,uuid:()=>"00000000-0000-4000-8000-000000000001",waitImpl:async()=>{},
    callSheets:async(action,payload,options)=>{calls.push({action,payload,options});return calls.length===1?{status:"failed",errorCode:"timeout"}:{status:"completed",data:{jobs:[]}};}});
  assert.equal(result.status,"completed"); assert.equal(calls.length,2); assert.deepEqual(calls[0],calls[1]);
  assert.equal(calls[0].payload.limit,1); assert.equal(calls[0].options.timeoutMs,60000);
});
