import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  planProtectedWorktree,
  validateWorktreeSlug,
} from "./create-protected-worktree.mjs";

test("worktree slugs are predictable and shell-safe", () => {
  assert.equal(validateWorktreeSlug("bruna-followups"), "bruna-followups");
  for (const invalid of [
    "",
    "AB",
    "../escape",
    "two--dashes",
    "trailing-",
    "spaces here",
  ]) {
    assert.throws(() => validateWorktreeSlug(invalid));
  }
});

test("protected worktrees always live under the main tmp directory", () => {
  const mainRoot = path.resolve("C:/workspace/amanda-site");
  const plan = planProtectedWorktree({
    mainRoot,
    slug: "bruna-followups",
    now: new Date("2026-09-12T15:00:00-03:00"),
  });
  assert.match(plan.branch, /^codex\/bruna-followups-20260912-/);
  assert.ok(plan.target.startsWith(`${path.resolve(mainRoot, "tmp")}${path.sep}`));
});
