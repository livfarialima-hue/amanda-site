import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const syncSource = readFileSync(
  new URL("./ConsultasSync.gs", import.meta.url),
  "utf8",
);
const operationsDoc = readFileSync(
  new URL("../../docs/whatsapp-clinica-liv-operacao.md", import.meta.url),
  "utf8",
);

test("post-consult delay is consistently documented as three hours", () => {
  assert.match(syncSource, /postConsultDelayMinutes:\s*180/);
  assert.match(operationsDoc, /aproximadamente três horas depois/);
  assert.doesNotMatch(operationsDoc, /aproximadamente duas horas depois/);
});
