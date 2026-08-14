import assert from "node:assert/strict";
import test from "node:test";
import { sheetsActionTimeoutMs } from "../ycloud-webhook.mjs";

test("lead delivery gets enough time for the Apps Script cold path", () => {
  assert.equal(sheetsActionTimeoutMs("append_lead"), 20_000);
  assert.equal(sheetsActionTimeoutMs("append_lead", "22000"), 22_000);
  assert.equal(sheetsActionTimeoutMs("append_lead", "99999"), 25_000);
});

test("other Sheets actions keep the short timeout", () => {
  assert.equal(sheetsActionTimeoutMs("get_patient_relationship"), 8_000);
  assert.equal(sheetsActionTimeoutMs("record_operational_event"), 8_000);
});
