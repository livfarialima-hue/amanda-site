import assert from "node:assert/strict";
import {
  normalizeAutomationMode,
  planAutomation,
} from "../netlify/functions/lib/whatsapp-automation.mjs";

const cases = [
  {
    name: "possible urgency",
    input: {
      text: "Estou com dor forte no peito e falta de ar",
      messageType: "text",
    },
    route: "urgent_fixed_reply",
    code: "SAFE-URG-01",
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
    code: "P-PRECO-01",
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

console.log(`whatsapp automation: ${cases.length} cases passed`);
