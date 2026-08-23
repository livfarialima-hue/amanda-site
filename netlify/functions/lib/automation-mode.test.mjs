import test from "node:test";
import assert from "node:assert/strict";

import {
  allowsPatientSideEffects,
  allowsShadowAssessment,
  AUTOMATION_MODES,
  normalizeAutomationMode,
} from "./automation-mode.mjs";
import { normalizeAutomationMode as legacyNormalizeAutomationMode } from "./whatsapp-automation.mjs";

test("automation mode preserves the historical fail-safe normalization", () => {
  assert.equal(normalizeAutomationMode(), AUTOMATION_MODES.SHADOW);
  assert.equal(normalizeAutomationMode(" ACTIVE "), AUTOMATION_MODES.ACTIVE);
  assert.equal(normalizeAutomationMode("off"), AUTOMATION_MODES.OFF);
  assert.equal(normalizeAutomationMode("unexpected"), AUTOMATION_MODES.SHADOW);
});

test("patient side effects are allowed only in active mode", () => {
  assert.equal(allowsPatientSideEffects("active"), true);
  assert.equal(allowsPatientSideEffects("shadow"), false);
  assert.equal(allowsPatientSideEffects("off"), false);
  assert.equal(allowsPatientSideEffects("unexpected"), false);
});

test("shadow assessment remains disabled only when automation is off", () => {
  assert.equal(allowsShadowAssessment("active"), true);
  assert.equal(allowsShadowAssessment("shadow"), true);
  assert.equal(allowsShadowAssessment("off"), false);
});

test("the legacy planner export remains compatible", () => {
  for (const value of [undefined, "active", "shadow", "off", "invalid"]) {
    assert.equal(
      legacyNormalizeAutomationMode(value),
      normalizeAutomationMode(value),
    );
  }
});
