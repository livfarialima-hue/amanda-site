import test from "node:test";
import assert from "node:assert/strict";
import {
  runBrunaMaintainability,
  validateBrunaMaintainability,
} from "./check-bruna-maintainability.mjs";

function fixture(overrides = {}) {
  const moduleMap = {
    schemaVersion: 1,
    canonicalBranch: "reestruturacao-site",
    remote: "origin",
    modules: [
      {
        id: "conversation",
        ownerFile: "src/policy.mjs",
        sourceFiles: ["src/policy.mjs"],
        testFiles: ["src/policy.test.mjs"],
        growthBudgets: [{ path: "src/policy.mjs", maxLines: 5 }],
      },
    ],
    purePolicies: ["src/policy.mjs"],
    forbiddenEffectMarkers: ["process.env", "fetch("],
    compatibilityFacade: {
      path: "src/facade.mjs",
      ownedExports: ["ownedRule"],
      allowedLegacyConsumers: [],
    },
    ...overrides.moduleMap,
  };
  const files = new Map([
    ["src/policy.mjs", "export const policy = () => true;\n"],
    ["src/policy.test.mjs", "test('policy');\n"],
    ["src/facade.mjs", "export { policy } from './policy.mjs';\n"],
  ]);
  for (const [key, value] of Object.entries(overrides.files || {})) files.set(key, value);
  const baseCommit = "a".repeat(40);
  const candidate = overrides.candidate || {
    baseCommit,
    scope: { files: ["src/policy.mjs"] },
    rollback: { local: `retornar ao baseline ${baseCommit}` },
  };
  return {
    moduleMap,
    candidate,
    files,
    readText: (file) => files.get(file) || "",
    fileExists: (file) => files.has(file),
    sourceInventory: [...files.keys()],
  };
}

test("the repository Bruna module map is internally valid", () => {
  const result = runBrunaMaintainability();
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
});

test("a protected source has only one owning module", () => {
  const input = fixture();
  input.moduleMap.modules.push({
    id: "duplicate",
    ownerFile: "src/policy.mjs",
    sourceFiles: ["src/policy.mjs"],
    testFiles: ["src/policy.test.mjs"],
    growthBudgets: [],
  });
  const result = validateBrunaMaintainability(input);
  assert.ok(result.errors.some((error) => error.code === "BRUNA_SOURCE_OWNER_DUPLICATE"));
});

test("pure policy modules fail closed on external effects", () => {
  const input = fixture({ files: { "src/policy.mjs": "export const x = process.env.FLAG;\n" } });
  const result = validateBrunaMaintainability(input);
  assert.ok(result.errors.some((error) => error.code === "BRUNA_PURE_POLICY_EFFECT"));
});

test("growth budgets prevent silent monolith expansion", () => {
  const input = fixture({ files: { "src/policy.mjs": "1\n2\n3\n4\n5\n6\n" } });
  const result = validateBrunaMaintainability(input);
  assert.ok(result.errors.some((error) => error.code === "BRUNA_MONOLITH_GROWTH_LIMIT"));
});

test("a canonical growth budget cannot be raised to hide expansion", () => {
  const input = fixture();
  const baselineModuleMap = structuredClone(input.moduleMap);
  input.moduleMap.modules[0].growthBudgets[0].maxLines = 6;
  const result = validateBrunaMaintainability({
    ...input,
    baselineModuleMap,
  });
  assert.ok(result.errors.some((error) => error.code === "BRUNA_GROWTH_BUDGET_RAISED"));
});

test("a canonical pure policy cannot silently lose its protection", () => {
  const input = fixture();
  const baselineModuleMap = structuredClone(input.moduleMap);
  input.moduleMap.purePolicies = [];
  const result = validateBrunaMaintainability({
    ...input,
    baselineModuleMap,
  });
  assert.ok(
    result.errors.some(
      (error) => error.code === "BRUNA_PURE_POLICY_PROTECTION_REMOVED",
    ),
  );
});

test("the legacy compatibility allowlist can shrink but never expand", () => {
  const input = fixture({
    files: {
      "src/new-consumer.mjs": "export const directImport = true;\n",
    },
  });
  const baselineModuleMap = structuredClone(input.moduleMap);
  input.moduleMap.compatibilityFacade.allowedLegacyConsumers.push(
    "src/new-consumer.mjs",
  );
  const result = validateBrunaMaintainability({
    ...input,
    baselineModuleMap,
  });
  assert.ok(
    result.errors.some(
      (error) => error.code === "BRUNA_COMPATIBILITY_ALLOWLIST_EXPANDED",
    ),
  );
});

test("protected changes require an exact rollback baseline", () => {
  const input = fixture({
    candidate: {
      baseCommit: "a".repeat(40),
      scope: { files: ["src/policy.mjs"] },
      rollback: { local: "rollback generico" },
    },
  });
  const result = validateBrunaMaintainability({
    ...input,
    changedFiles: ["src/policy.mjs"],
  });
  assert.ok(result.errors.some((error) => error.code === "BRUNA_ROLLBACK_NOT_PINNED"));
});

test("new consumers cannot use a compatibility re-export", () => {
  const input = fixture({
    files: {
      "src/new-consumer.mjs": "import { ownedRule } from './facade.mjs';\n",
    },
  });
  const result = validateBrunaMaintainability(input);
  assert.ok(result.errors.some((error) => error.code === "BRUNA_NEW_COMPATIBILITY_IMPORT"));
});
