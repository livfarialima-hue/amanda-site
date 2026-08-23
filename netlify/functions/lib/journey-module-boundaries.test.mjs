import test from "node:test";
import assert from "node:assert/strict";

import {
  assertJourneyModuleBoundaries,
  collectJourneyBoundaryViolations,
} from "../../../scripts/check-journey-module-boundaries.mjs";

test("patient journey modules preserve their dependency boundaries", () => {
  assert.deepEqual(collectJourneyBoundaryViolations(), []);
  assert.doesNotThrow(() => assertJourneyModuleBoundaries());
});
