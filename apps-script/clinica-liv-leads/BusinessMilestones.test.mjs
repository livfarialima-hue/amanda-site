import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./BusinessMilestones.gs", import.meta.url),
  "utf8",
);

function load() {
  const sandbox = {
    Array,
    Date,
    Number,
    Object,
    String,
    boundedText_(value, length) {
      return String(value || "").trim().slice(0, length);
    },
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { normalizarMarcoOportunidade_ };`,
    sandbox,
  );
  return sandbox.__test;
}

test("business milestone is typed, opportunity-bound and contains no evidence text", () => {
  const { normalizarMarcoOportunidade_ } = load();
  const result = normalizarMarcoOportunidade_({
    eventId: "milestone-1",
    opportunityId: "opp-1",
    milestone: "quote_sent",
    at: "2026-08-14T15:00:00.000Z",
    source: "whatsapp_classifier",
    confidence: "low",
    evidence: "must never be persisted",
  });

  assert.equal(result.ok, true);
  assert.equal(result.milestone, "quote_sent");
  assert.equal(result.confidence, "low");
  assert.equal(Object.hasOwn(result, "evidence"), false);
  assert.equal(
    normalizarMarcoOportunidade_({
      eventId: "milestone-2",
      opportunityId: "",
      milestone: "accepted",
    }).reason,
    "opportunity_id_required",
  );
  assert.equal(
    normalizarMarcoOportunidade_({
      eventId: "milestone-3",
      opportunityId: "opp-1",
      milestone: "invented",
    }).reason,
    "invalid_business_milestone",
  );
});
