import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policyUrl = new URL("./", import.meta.url);

async function readJson(name) {
  return JSON.parse(
    await readFile(new URL(name, policyUrl), "utf8"),
  );
}

async function readJsonLines(name) {
  const text = await readFile(new URL(name, policyUrl), "utf8");

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("missing-content transport delegates its response to the current welcoming policy", async () => {
  const rules = await readJsonLines("rules.jsonl");
  const transport = rules.find((rule) => rule.id === "missing_inbound_text");
  const response = rules.find((rule) => rule.id === transport.responsePolicy);
  assert.equal(response?.id, "missing_content_welcoming_without_technical_gap");
  assert.match(response.rule, /Não dizer que a mensagem veio incompleta, não solicitar reenvio/);
  assert.doesNotMatch(transport.rule, /enviar.*dizendo que a mensagem não apareceu completa/);
  assert.match(transport.rule, /idempotência/);
});

test("every locked Bruna scenario remains unique and executable", async () => {
  const [baseline, conversationEvals, rules] = await Promise.all([
    readJson("regression-baseline.json"),
    readJsonLines("conversation-evals.jsonl"),
    readJsonLines("rules.jsonl"),
  ]);
  const locked = baseline.lockedScenarioIds;
  const availableIds = new Set(
    [...conversationEvals, ...rules].map((entry) => entry.id),
  );
  const deprecated = new Map(
    baseline.deprecatedScenarioIds.map((entry) => [
      entry.id,
      entry,
    ]),
  );

  assert.ok(locked.length >= 47);
  assert.equal(new Set(locked).size, locked.length);

  for (const scenarioId of locked) {
    if (availableIds.has(scenarioId)) continue;

    const deprecation = deprecated.get(scenarioId);
    assert.ok(
      deprecation &&
        String(deprecation.reason || "").trim() &&
        String(deprecation.replacementScenarioId || "").trim() &&
        availableIds.has(deprecation.replacementScenarioId),
      `locked scenario disappeared without a valid replacement: ${scenarioId}`,
    );
  }
});

async function publishedReceipt(manifest, candidate, read = readJson) {
  const pending = manifest.pendingRelease;
  if (pending.changeId === candidate.changeId) {
    assert.equal(candidate.status, "published_verified");
    return { ...candidate.release, status: candidate.status, changeId: candidate.changeId };
  }
  // An independent site release must keep the closed Bruna release identity.
  // A different active candidate is never evidence that Bruna was published.
  assert.equal(pending.status, "published_verified");
  assert.match(pending.changeId, /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/);
  const receipt = await read(`../../../../auditorias/${pending.changeId.toLowerCase()}/PUBLICACAO.json`);
  assert.equal(receipt.status, "published_verified");
  assert.equal(receipt.changeId, pending.changeId);
  assert.equal(receipt.bundleVersion, manifest.bundleVersion);
  assert.equal(receipt.approvedCommit, manifest.release.functionalCommit);
  assert.equal(receipt.netlifyDeployId, manifest.release.functionalDeployId);
  assert.equal(receipt.liveModel.status, "passed");
  assert.equal(receipt.liveModel.passed, pending.liveModelScenarioCount);
  assert.equal(receipt.liveModel.total, pending.liveModelScenarioCount);
  assert.equal(receipt.liveModel.fullHistoryPassed, 2);
  assert.equal(receipt.liveAudio.status, "passed");
  assert.equal(receipt.liveAudio.passed, 3);
  assert.equal(receipt.liveAudio.total, 3);
  return receipt;
}

test("the published manifest matches the current bundle and closes its own candidate receipt", async () => {
  const [manifest, baseline] = await Promise.all([
    readJson("manifest.json"),
    readJson("regression-baseline.json"),
  ]);

  assert.equal(
    manifest.regressionBaselinePath,
    "netlify/functions/lib/bruna-policy/regression-baseline.json",
  );
  assert.equal(
    manifest.regressionBaselineVersion,
    baseline.baselineVersion,
  );
  assert.equal(
    manifest.identityRole,
    "assistente_ou_concierge_da_clinica_liv",
  );
  assert.equal(manifest.release.status, "published");
  assert.equal(manifest.promptVersion, `bruna-concierge-${manifest.bundleVersion}`);
  if (manifest.pendingRelease) {
    assert.equal(manifest.pendingRelease.bundleVersion, manifest.bundleVersion);
    const candidate = await readJson("../../../../ops/CHANGE-CANDIDATE.json");
    if (manifest.pendingRelease.status === "published_verified") {
      // Retain the production build gates after closeout. Deleting this marker
      // would make the next Git production build silently skip the live checks.
      const receipt = await publishedReceipt(manifest, candidate);
      assert.equal(manifest.release.bundleVersion, manifest.bundleVersion);
      assert.equal(manifest.pendingRelease.sourceCommit, manifest.release.functionalCommit);
      assert.equal(receipt.approvedCommit, manifest.release.functionalCommit);
      assert.equal(receipt.netlifyDeployId, manifest.release.functionalDeployId);
      assert.equal(manifest.pendingRelease.liveModelCheckRequired, true);
      assert.equal(manifest.pendingRelease.audioTranscriptionCheckRequired, true);
      assert.equal(manifest.pendingRelease.fullHistoryCheckRequired, true);
      assert.equal(manifest.pendingRelease.liveModelScenarioCount, 25);
    } else {
      assert.equal(manifest.pendingRelease.changeId, candidate.changeId);
      assert.notEqual(manifest.release.bundleVersion, manifest.bundleVersion);
      assert.ok(["implementing_local", "tested_local", "committed"].includes(candidate.status));
    }
  } else {
    assert.equal(manifest.release.bundleVersion, manifest.bundleVersion);
  }
  assert.equal(manifest.release.candidateStatus, "published_verified");
});

test("a different active candidate cannot hide a missing or altered Bruna publication receipt", async () => {
  const manifest = {
    bundleVersion: "test-bundle",
    pendingRelease: { changeId: "BRUNA-TEST", status: "published_verified", liveModelScenarioCount: 19 },
    release: { functionalCommit: "a".repeat(40), functionalDeployId: "b".repeat(24) },
  };
  const candidate = { changeId: "INDEPENDENT-SITE-CANDIDATE", status: "tested_local" };
  const receipt = {
    status: "published_verified", changeId: "BRUNA-TEST", bundleVersion: "test-bundle",
    approvedCommit: "a".repeat(40), netlifyDeployId: "b".repeat(24),
    liveModel: { status: "passed", passed: 19, total: 19, fullHistoryPassed: 2 },
    liveAudio: { status: "passed", passed: 3, total: 3 },
  };
  assert.equal(await publishedReceipt(manifest, candidate, async (path) => {
    assert.equal(path, "../../../../auditorias/bruna-test/PUBLICACAO.json");
    return receipt;
  }), receipt);
  await assert.rejects(publishedReceipt(manifest, candidate, async () => { throw new Error("missing receipt"); }), /missing receipt/);
  for (const field of ["status", "changeId", "bundleVersion", "approvedCommit", "netlifyDeployId"]) {
    await assert.rejects(publishedReceipt(manifest, candidate, async () => ({ ...receipt, [field]: "altered" })), { name: "AssertionError" });
  }
  for (const field of ["liveModel", "liveAudio"]) {
    await assert.rejects(publishedReceipt(manifest, candidate, async () => ({ ...receipt, [field]: { ...receipt[field], passed: 0 } })), { name: "AssertionError" });
  }
  await assert.rejects(publishedReceipt({ ...manifest, pendingRelease: { ...manifest.pendingRelease, status: "implementing_local" } }, candidate), { name: "AssertionError" });
});

test("the expanded Bruna gate requires all 25 scenarios in its own publication receipt", async () => {
  const manifest = {
    bundleVersion: "test-expanded-bundle",
    pendingRelease: { changeId: "BRUNA-EXPANDED-TEST", status: "published_verified", liveModelScenarioCount: 25 },
    release: { functionalCommit: "a".repeat(40), functionalDeployId: "b".repeat(24) },
  };
  const candidate = { changeId: "INDEPENDENT-SITE-CANDIDATE", status: "tested_local" };
  const receipt = {
    status: "published_verified", changeId: "BRUNA-EXPANDED-TEST", bundleVersion: "test-expanded-bundle",
    approvedCommit: "a".repeat(40), netlifyDeployId: "b".repeat(24),
    liveModel: { status: "passed", passed: 25, total: 25, fullHistoryPassed: 2 },
    liveAudio: { status: "passed", passed: 3, total: 3 },
  };
  assert.equal(await publishedReceipt(manifest, candidate, async () => receipt), receipt);
  for (const count of [19, 21, 24]) {
    await assert.rejects(publishedReceipt(manifest, candidate, async () => ({
      ...receipt, liveModel: { ...receipt.liveModel, passed: count, total: count },
    })), { name: "AssertionError" });
  }
});

test("Bruna's patient-facing identity stays human-readable and technology-neutral", async () => {
  const [baseline, rules] = await Promise.all([
    readJson("regression-baseline.json"),
    readJsonLines("rules.jsonl"),
  ]);
  const identityRule = rules.find((entry) => entry.id === "identity");
  const rule = String(identityRule && identityRule.rule);

  assert.equal(baseline.identityContract.name, "Bruna");
  assert.ok(
    baseline.identityContract.clinicRole.some((role) =>
      /assistente|concierge/i.test(role),
    ),
  );
  assert.equal(
    baseline.identityContract.patientFacingTechnologyDisclosureRequired,
    false,
  );
  assert.match(rule, /Bruna/);
  assert.match(rule, /assistente|concierge/i);
  assert.match(rule, /nunca se apresentar|nunca se rotular/i);
});

test("a behavioral incident must become a failing test before its fix", async () => {
  const baseline = await readJson("regression-baseline.json");
  const policy = baseline.incidentPolicy;

  assert.equal(policy.reproductionTestRequiredBeforeFix, true);
  assert.ok(policy.requiredSequence.length >= 5);
  assert.match(policy.deprecationRule, /substituto|substitui/i);
  assert.match(policy.releaseGate, /publicado|publicar/i);
});
