import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  decideConversationAction,
} from "./conversation-action-controller.mjs";
import {
  validateOutboundReply,
} from "./outbound-reply-gate.mjs";
import { assessBrunaReplyExperience } from "./bruna-conversion-experience.mjs";

const evalPath = fileURLToPath(
  new URL("./bruna-policy/conversation-evals.jsonl", import.meta.url),
);
const scenarios = readFileSync(evalPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

test("the Bruna conversation eval set is synthetic, unique and broad", () => {
  assert.ok(scenarios.length >= 18);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, scenarios.length);
  for (const scenario of scenarios) {
    assert.equal(scenario.source, "synthetic_from_recurring_pattern");
    assert.doesNotMatch(JSON.stringify(scenario), /\+55\d{10,13}|@(?:gmail|hotmail|outlook)\./i);
  }
});

test("the Bruna eval set measures conversion quality in addition to routing safety", () => {
  const qualityScenarios = scenarios.filter(
    (scenario) => scenario.qualityExpect,
  );
  assert.ok(qualityScenarios.length >= 4);
  assert.ok(
    qualityScenarios.some(
      (scenario) =>
        scenario.qualityExpect.conversionOutcome ===
        "contextualized_discovery",
    ),
  );
  assert.ok(
    qualityScenarios.some(
      (scenario) =>
        scenario.qualityExpect.conversionOutcome ===
        "availability_exploration",
    ),
  );
});

for (const scenario of scenarios) {
  test(`Bruna eval: ${scenario.id}`, () => {
    if (scenario.kind === "action") {
      const decision = decideConversationAction(scenario.input);
      const comparable = {
        action: decision.action,
        maxQuestions: decision.replyContract?.maxQuestions,
        maxLinks: decision.replyContract?.maxLinks,
        requirePhotoDistanceLimit:
          decision.replyContract?.requirePhotoDistanceLimit,
        allowedResponseKind:
          decision.replyContract?.allowedResponseKind,
        allowCta: decision.replyContract?.allowCta,
        allowHoldingReply: decision.allowHoldingReply,
        minimumFollowupDelayHours:
          decision.minimumFollowupDelayHours,
      };
      for (const [key, value] of Object.entries(scenario.expect)) {
        assert.equal(comparable[key], value, `${scenario.id}:${key}`);
      }
      return;
    }

    const validation = validateOutboundReply({
      body: scenario.body,
      currentText: scenario.currentText,
      recentConversation: scenario.recentConversation || [],
      conversationAction: scenario.conversationAction,
    });
    assert.equal(validation.allowed, scenario.expect.allowed, scenario.id);
    assert.equal(validation.reason, scenario.expect.reason, scenario.id);

    if (scenario.qualityExpect) {
      const assessment = assessBrunaReplyExperience({
        body: scenario.body,
        procedure: scenario.procedure || "",
        kind: scenario.qualityKind || "standard",
      });
      const expected = scenario.qualityExpect;
      if (expected.minimumToneScore !== undefined) {
        assert.ok(
          assessment.toneScore >= expected.minimumToneScore,
          `${scenario.id}:toneScore`,
        );
      }
      if (expected.minimumSpecificityScore !== undefined) {
        assert.ok(
          assessment.specificityScore >= expected.minimumSpecificityScore,
          `${scenario.id}:specificityScore`,
        );
      }
      for (const key of [
        "conversionOutcome",
        "withinPreferredLength",
        "policyLanguageReason",
      ]) {
        if (expected[key] !== undefined) {
          assert.equal(
            assessment[key],
            expected[key],
            `${scenario.id}:${key}`,
          );
        }
      }
    }
  });
}
