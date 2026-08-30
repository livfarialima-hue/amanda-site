import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectChangedFiles,
  validateAppointmentReminderContract,
  validateChangeSafety,
} from "./check-change-safety.mjs";

const PROJECT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("active candidate declares exactly every local change", () => {
  const result = validateChangeSafety({ root: PROJECT_ROOT });

  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.ok(
    result.checks.some((item) => item.code === "CHANGE_SCOPE_EXACT"),
  );
  assert.ok(
    result.checks.some(
      (item) => item.code === "REMINDER_CONTRACT_ALIGNED",
    ),
  );
});

test("an undeclared file blocks the candidate", () => {
  const change = JSON.parse(
    readFileSync(
      join(PROJECT_ROOT, "ops/CHANGE-CANDIDATE.json"),
      "utf8",
    ),
  );
  const changedFiles = collectChangedFiles(
    PROJECT_ROOT,
    change.baseCommit,
  );
  const result = validateChangeSafety({
    root: PROJECT_ROOT,
    checkGit: false,
    changedFiles: [...changedFiles, "arquivo-nao-declarado.txt"],
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (item) => item.code === "CHANGE_SCOPE_DIVERGENCE",
    ),
  );
});

test("release mode remains blocked without explicit publication authorization", () => {
  const change = JSON.parse(
    readFileSync(
      join(PROJECT_ROOT, "ops/CHANGE-CANDIDATE.json"),
      "utf8",
    ),
  );
  const result = validateChangeSafety({
    root: PROJECT_ROOT,
    release: true,
    checkGit: false,
    changedFiles: collectChangedFiles(PROJECT_ROOT, change.baseCommit),
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (item) => item.code === "CHANGE_PUBLICATION_NOT_AUTHORIZED",
    ),
  );
});

test("cross-consumer drift in the care agenda is detected", () => {
  const root = mkdtempSync(join(tmpdir(), "liv-change-safety-"));
  const paths = [
    "apps-script/clinica-liv-leads/LembretesConsultas.gs",
    "apps-script/clinica-liv-leads/AgendaCuidados.gs",
    "netlify/functions/appointment-reminder.mjs",
    "netlify/functions/lib/ycloud-appointment-reminder.mjs",
  ];

  for (const path of paths) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(PROJECT_ROOT, path), join(root, path));
  }

  const agendaPath = join(
    root,
    "apps-script/clinica-liv-leads/AgendaCuidados.gs",
  );
  const agenda = readFileSync(agendaPath, "utf8").replace(
    "principal: horarioAlvoLembretePrincipalConsulta_(consulta)",
    'principal: new Date("2026-09-01T16:30:00-03:00"),\n    confirmacao: new Date("2026-09-01T16:30:00-03:00")',
  );
  writeFileSync(agendaPath, agenda);

  const errors = validateAppointmentReminderContract(root);

  assert.ok(
    errors.some(
      (item) => item.code === "REMINDER_PLANNER_DIVERGENCE",
    ),
  );
});
