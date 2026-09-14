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

test("the manifest versions the candidate and preserves the previous published receipt", async () => {
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
  assert.equal(manifest.bundleVersion, "2026-09-14.1");
  assert.equal(manifest.release.bundleVersion, "2026-09-01.1");
  assert.equal(manifest.pendingRelease.published, false);
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
