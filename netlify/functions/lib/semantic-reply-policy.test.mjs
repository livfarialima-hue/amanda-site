import assert from "node:assert/strict";
import test from "node:test";

import { prepareSemanticContextContinuationAction } from "./semantic-reply-policy.mjs";

test("takeover continuation preserves only the approved initial price envelope", () => {
  const action = prepareSemanticContextContinuationAction({
    replyContract: {
      sourceReason: "price_initial_information",
      allowedResponseKind: "direct_answer",
      maxQuestions: 0,
      maxLinks: 1,
      allowCta: true,
      allowAppointmentConfirmation: false,
    },
  });

  assert.equal(action.replyContract.owner, "bruna");
  assert.equal(action.replyContract.maxQuestions, 0);
  assert.equal(action.replyContract.maxLinks, 1);
  assert.equal(action.replyContract.allowCta, true);
  assert.equal(action.replyContract.allowAppointmentConfirmation, false);
});

test("ordinary takeover continuation remains linkless and without CTA", () => {
  const action = prepareSemanticContextContinuationAction({
    replyContract: {
      sourceReason: "known_procedure",
      maxQuestions: 1,
      maxLinks: 1,
      allowCta: true,
    },
  });

  assert.equal(action.replyContract.maxQuestions, 1);
  assert.equal(action.replyContract.maxLinks, 0);
  assert.equal(action.replyContract.allowCta, false);
});
