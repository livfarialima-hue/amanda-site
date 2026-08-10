import assert from "node:assert/strict";
import {
  normalizeAutomationMode,
  planAutomation,
} from "../netlify/functions/lib/whatsapp-automation.mjs";
import {
  normalizeDuplicateReason,
  shouldSuppressAutomationForDuplicate,
} from "../netlify/functions/lib/lead-deduplication.mjs";

const cases = [
  {
    name: "possible urgency",
    input: {
      text: "Estou com dor forte no peito e falta de ar",
      messageType: "text",
    },
    route: "human_review",
    code: "ALERT-URG-01",
  },
  {
    name: "cardiology",
    input: {
      text: "Gostaria de consulta com o Dr Daniel cardiologista",
      messageType: "text",
    },
    route: "daniel_greeting_and_alert",
    code: "DANIEL-ENC-01",
  },
  {
    name: "Meta lifting reference",
    input: {
      text: "Quero saber mais",
      messageType: "text",
      reference: "M26F01W-C06H01",
      platform: "Meta",
    },
    route: "standard_reply",
    code: "M-C06-WA-01",
  },
  {
    name: "first price question",
    input: {
      text: "Qual o valor da rinoplastia?",
      messageType: "text",
    },
    route: "standard_reply",
    code: null,
  },
  {
    name: "direct greeting",
    input: {
      text: "Olá",
      messageType: "text",
      reference: "WHATSAPP-DIRETO-SEM-CODIGO",
    },
    route: "standard_reply",
    code: "ORG-DIR-01",
  },
  {
    name: "photo requires review",
    input: {
      text: "",
      messageType: "image",
    },
    route: "human_review",
    code: null,
  },
  {
    name: "unusual administrative request",
    input: {
      text: "Preciso falar sobre uma nota fiscal antiga",
      messageType: "text",
    },
    route: "human_review",
    code: null,
  },
];

for (const testCase of cases) {
  const result = planAutomation(testCase.input);
  assert.equal(result.route, testCase.route, testCase.name);
  assert.equal(result.replyCode, testCase.code, testCase.name);
}

assert.equal(normalizeAutomationMode(), "shadow");
assert.equal(normalizeAutomationMode("ACTIVE"), "active");
assert.equal(normalizeAutomationMode("invalid"), "shadow");

assert.equal(
  normalizeDuplicateReason({ duplicateReason: "message_id" }),
  "message_id",
);
assert.equal(
  normalizeDuplicateReason({ duplicateReason: "phone_window" }),
  "phone_window",
);
assert.equal(
  normalizeDuplicateReason({ duplicateReason: "unexpected" }),
  null,
);
assert.equal(
  shouldSuppressAutomationForDuplicate({
    duplicate: true,
    duplicateReason: "message_id",
  }),
  true,
);
assert.equal(
  shouldSuppressAutomationForDuplicate({
    duplicate: true,
    duplicateReason: "phone_window",
  }),
  false,
);
assert.equal(
  shouldSuppressAutomationForDuplicate({ duplicate: false }),
  false,
);

console.log(
  `whatsapp automation: ${cases.length} routing cases passed`,
);
