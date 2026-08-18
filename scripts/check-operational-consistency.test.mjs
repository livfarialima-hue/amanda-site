import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { validateOperationalConsistency } from "./check-operational-consistency.mjs";

const MANIFEST_FIXTURE_PATH = "netlify/functions/lib/bruna-policy/manifest.json";

function createHashForTest(content) {
  return createHash("sha256").update(content).digest("hex");
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "liv-ops-check-"));
  const manifest = {
    bundleVersion: "2026-08-18.1",
    promptVersion: "bruna-concierge-2026-08-18.1",
    knowledgeSnapshot: "kb-2026-08-18.1",
    release: {
      status: "published",
      functionalCommit: "1".repeat(40),
      lastObservedProductionCommit: "2".repeat(40),
      rollbackCommit: "3".repeat(40),
      functionalDeployId: "a".repeat(24),
      lastObservedProductionDeployId: "b".repeat(24),
      rollbackDeployId: "c".repeat(24),
    },
    documentation: {
      canonicalLocalPath: "docs/estrategia-abordagem-bruna.md",
      driveActiveFileId: "drive-active-id",
      driveProjectionSha256: "",
    },
  };
  const manual = [
    "# Diretrizes ativas da Bruna",
    "",
    "> **Fonte canônica:** este arquivo versionado é o único manual ativo do comportamento da Bruna.",
    "",
    "**Versão:** 2026-08-18.1",
    "",
    "drive-active-id",
    "",
  ].join("\n");
  manifest.documentation.driveProjectionSha256 = createHashForTest(manual);

  mkdirSync(join(root, "docs"), { recursive: true });
  mkdirSync(join(root, "netlify/functions/lib/bruna-policy"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, MANIFEST_FIXTURE_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(root, "docs/estrategia-abordagem-bruna.md"), manual);
  const releaseRecord = [
    "1111111",
    "aaaaaaaaaaaaaaaaaaaaaaaa",
    "3333333",
    "cccccccccccccccccccccccc",
  ].join("\n");
  writeFileSync(join(root, "docs/whatsapp-clinica-liv-operacao.md"), releaseRecord);
  writeFileSync(join(root, "docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md"), releaseRecord);
  writeFileSync(
    join(root, "docs/GOVERNANCA-OPERACIONAL-LOCAL-E-DRIVE.md"),
    "npm.cmd run ops:check\n",
  );
  writeFileSync(join(root, ".gitattributes"), "* text=auto eol=lf\n*.zip binary\n");
  writeFileSync(join(root, "scripts/reconcile-local-release.ps1"), "param()\n");
  writeFileSync(join(root, "package.json"), "{}\n");
  return root;
}

test("accepts one canonical manual and aligned release receipt", () => {
  const root = createFixture();
  const result = validateOperationalConsistency({ root, checkGit: false });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.status, "OK");
});

test("blocks a second active manual", () => {
  const root = createFixture();
  writeFileSync(
    join(root, "docs/estrategia-abordagem-bruna-copia.md"),
    "> **Fonte canônica:** este arquivo versionado é o único manual ativo do comportamento da Bruna.\n",
  );
  const result = validateOperationalConsistency({ root, checkGit: false });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "ACTIVE_MANUAL_DUPLICATE"));
});

test("blocks temporary release packages in the repository root", () => {
  const root = createFixture();
  writeFileSync(join(root, "clinica-liv-release-test.zip"), "derived");
  const result = validateOperationalConsistency({ root, checkGit: false });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "ROOT_RELEASE_ARTIFACT"));
});
