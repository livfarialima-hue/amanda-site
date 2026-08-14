import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  extractDeploymentId,
  extractProjectId,
  extractSpreadsheetId,
  loadProductionTarget,
  verifyProductionTarget,
} from "../../scripts/check-apps-script-target.mjs";

const target = loadProductionTarget();

test("canonical production URLs resolve to the registered IDs", () => {
  assert.equal(extractProjectId(target.projectUrl), target.scriptId);
  assert.equal(
    extractDeploymentId(target.webAppUrl),
    target.deploymentId,
  );
  assert.equal(
    extractSpreadsheetId(target.spreadsheetUrl),
    target.spreadsheetId,
  );
});

test("production preflight accepts the three canonical targets", () => {
  const result = verifyProductionTarget({
    project: target.projectUrl,
    deployment: target.webAppUrl,
    spreadsheet: target.spreadsheetUrl,
  }, target);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("production preflight rejects a same-title inactive project", () => {
  const inactive = target.knownNonProductionProjects[0];
  const result = verifyProductionTarget({
    project: `https://script.google.com/home/projects/${inactive.scriptId}/edit`,
    deployment: target.webAppUrl,
    spreadsheet: target.spreadsheetUrl,
  }, target);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /projeto divergente/i);
  assert.match(inactive.label, /NÃO PUBLICAR/);
});

test("a project title alone can never pass preflight", () => {
  const result = verifyProductionTarget({
    project: target.projectTitle,
    deployment: target.webAppUrl,
    spreadsheet: target.spreadsheetUrl,
  }, target);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /projeto ausente ou inválido/i);
});

test("permanent project instructions reference the canonical registry and verifier", () => {
  const instructions = readFileSync(
    new URL("../../AGENTS.md", import.meta.url),
    "utf8",
  );

  assert.match(instructions, /production-target\.json/);
  assert.match(instructions, /apps-script:verify-target/);
  assert.match(instructions, /Nunca escolha um projeto pelo título/);
});
