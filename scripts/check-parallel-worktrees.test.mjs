import test from "node:test";
import assert from "node:assert/strict";
import { detectParallelConflicts } from "./check-parallel-worktrees.mjs";

const moduleMap = {
  modules: [
    {
      id: "followups",
      sourceFiles: ["Retomadas.gs", "Central.gs"],
      testFiles: ["Retomadas.test.mjs"],
    },
    {
      id: "appointments",
      sourceFiles: ["Agenda.gs"],
      testFiles: ["Agenda.test.mjs"],
    },
  ],
};

test("parallel edits to the same protected file are blocked", () => {
  const result = detectParallelConflicts({
    currentFiles: ["Retomadas.gs"],
    otherWork: [{ branch: "codex/other", files: ["Retomadas.gs"] }],
    moduleMap,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.conflicts[0].exactPaths, ["Retomadas.gs"]);
});

test("different files owned by the same module are also blocked", () => {
  const result = detectParallelConflicts({
    currentFiles: ["Retomadas.gs"],
    otherWork: [{ branch: "codex/other", files: ["Central.gs"] }],
    moduleMap,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.conflicts[0].modules, ["followups"]);
});

test("independent modules can evolve in parallel", () => {
  const result = detectParallelConflicts({
    currentFiles: ["Retomadas.gs"],
    otherWork: [{ branch: "codex/agenda", files: ["Agenda.gs"] }],
    moduleMap,
  });
  assert.equal(result.ok, true);
});

test("a planned module can be checked before the first edit", () => {
  const result = detectParallelConflicts({
    plannedModules: ["followups"],
    otherWork: [{ branch: "codex/other", files: ["Central.gs"] }],
    moduleMap,
  });
  assert.equal(result.ok, false);
});

test("unknown module claims fail closed", () => {
  const result = detectParallelConflicts({
    plannedModules: ["unknown"],
    otherWork: [],
    moduleMap,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.unknownModules, ["unknown"]);
});
