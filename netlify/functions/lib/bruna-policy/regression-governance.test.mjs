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

test("the published manifest matches the current bundle and closes the candidate receipt", async () => {
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
    assert.equal(manifest.pendingRelease.changeId, candidate.changeId);
    if (manifest.pendingRelease.status === "published_verified") {
      // Retain the production build gates after closeout. Deleting this marker
      // would make the next Git production build silently skip the live checks.
      assert.equal(candidate.status, "published_verified");
      assert.equal(manifest.release.bundleVersion, manifest.bundleVersion);
      assert.equal(manifest.pendingRelease.sourceCommit, manifest.release.functionalCommit);
      assert.equal(candidate.release.approvedCommit, manifest.release.functionalCommit);
      assert.equal(candidate.release.netlifyDeployId, manifest.release.functionalDeployId);
      assert.equal(manifest.pendingRelease.liveModelCheckRequired, true);
      assert.equal(manifest.pendingRelease.audioTranscriptionCheckRequired, true);
      assert.equal(manifest.pendingRelease.fullHistoryCheckRequired, true);
      assert.equal(manifest.pendingRelease.liveModelScenarioCount, 16);
    } else {
      assert.notEqual(manifest.release.bundleVersion, manifest.bundleVersion);
      assert.ok(["implementing_local", "tested_local", "committed"].includes(candidate.status));
    }
  } else {
    assert.equal(manifest.release.bundleVersion, manifest.bundleVersion);
  }
  assert.equal(manifest.release.candidateStatus, "published_verified");
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
