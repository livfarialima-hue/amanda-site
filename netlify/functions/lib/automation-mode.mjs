export const AUTOMATION_MODES = Object.freeze({
  OFF: "off",
  SHADOW: "shadow",
  ACTIVE: "active",
});

export function normalizeAutomationMode(value) {
  const mode = String(value || AUTOMATION_MODES.SHADOW).trim().toLowerCase();
  return Object.values(AUTOMATION_MODES).includes(mode)
    ? mode
    : AUTOMATION_MODES.SHADOW;
}

export function allowsPatientSideEffects(value) {
  return normalizeAutomationMode(value) === AUTOMATION_MODES.ACTIVE;
}

export function allowsShadowAssessment(value) {
  return normalizeAutomationMode(value) !== AUTOMATION_MODES.OFF;
}
