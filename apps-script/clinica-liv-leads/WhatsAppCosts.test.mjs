import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./WhatsAppCosts.gs", import.meta.url),
  "utf8",
);

function load(extra = {}) {
  const sandbox = {
    Array,
    Date,
    JSON,
    Math,
    Number,
    Object,
    String,
    CONFIG: {
      spreadsheetId: "sheet-test",
      eventSheetName: "_WHATSAPP_EVENTOS",
      whatsappCostSheetName: "_WHATSAPP_CUSTOS",
      whatsappTemplateEventSheetName: "_WHATSAPP_TEMPLATE_EVENTOS",
    },
    ...extra,
  };
  vm.runInNewContext(
    `${source}\nglobalThis.__test = { ` +
      "WHATSAPP_COST_HEADERS, normalizarStatusMensagemYCloud_, " +
      "mesclarStatusMensagemYCloud_, registrarStatusMensagemYCloud_, " +
      "resumirCustosWhatsAppLinhas_, normalizarEventoTemplateYCloud_ };",
    sandbox,
  );
  return sandbox.__test;
}

test("status normalization keeps only technical, privacy-safe fields", () => {
  const { normalizarStatusMensagemYCloud_ } = load();
  const normalized = normalizarStatusMensagemYCloud_({
    providerMessageKey: `sha256:${"a".repeat(64)}`,
    externalId: "liv-reply-event-1",
    status: "delivered",
    messageType: "template",
    templateName: "retomada_manual_bruna_v1",
    pricingCategory: "marketing",
    pricingModel: "pmp",
    pricingType: "regular",
    totalPrice: 0.32,
    currency: "brl",
    businessNumberKey: `sha256:${"b".repeat(64)}`,
    finalPrice: true,
    deliveredAt: "2026-10-01T10:00:00.000Z",
    purpose: "scheduled_followup",
    source: "ycloud_message_updated",
    phone: "+5511999999999",
    name: "Maria",
    text: "não pode persistir",
  });

  assert.equal(normalized.ok, true);
  assert.equal(normalized.currency, "BRL");
  assert.equal(normalized.pricingModel, "pmp");
  assert.equal(normalized.pricingType, "regular");
  assert.equal(normalized.finalPrice, true);
  assert.equal(Object.hasOwn(normalized, "phone"), false);
  assert.equal(Object.hasOwn(normalized, "name"), false);
  assert.equal(Object.hasOwn(normalized, "text"), false);
});

test("duplicate delivery upgrades one row and never loses its final price", () => {
  const { mesclarStatusMensagemYCloud_ } = load();
  const key = `sha256:${"c".repeat(64)}`;
  const delivered = mesclarStatusMensagemYCloud_(
    {},
    {
      providerMessageKey: key,
      externalId: "liv-appointment-consulta-42-48h",
      status: "delivered",
      messageType: "template",
      templateName: "lembrete_consulta_liv_v1",
      pricingCategory: "utility",
      pricingModel: "pmp",
      pricingType: "regular",
      totalPrice: 0,
      currency: "BRL",
      regionCode: "BR",
      businessNumberKey: `sha256:${"d".repeat(64)}`,
      conversationOrigin: "utility",
      finalPrice: true,
      sentAt: "",
      deliveredAt: "2026-10-01T10:00:00.000Z",
      readAt: "",
      updatedAt: "2026-10-01T10:00:01.000Z",
      purpose: "appointment_reminder",
      source: "ycloud_message_updated",
    },
    { opportunityId: "opp-42", professional: "Amanda", campaign: "" },
    new Date("2026-10-01T10:00:02.000Z"),
  );
  const read = mesclarStatusMensagemYCloud_(
    delivered,
    {
      providerMessageKey: key,
      externalId: "",
      status: "read",
      messageType: "",
      templateName: "",
      pricingCategory: "unknown",
      pricingModel: "unknown",
      pricingType: "unknown",
      totalPrice: "",
      currency: "",
      regionCode: "",
      businessNumberKey: "",
      conversationOrigin: "",
      finalPrice: false,
      sentAt: "",
      deliveredAt: "",
      readAt: "2026-10-01T10:01:00.000Z",
      updatedAt: "2026-10-01T10:01:00.000Z",
      purpose: "other_outbound",
      source: "ycloud_message_updated",
    },
    { opportunityId: "", professional: "", campaign: "" },
    new Date("2026-10-01T10:01:00.000Z"),
  );

  assert.equal(read.Status, "read");
  assert.equal(read["Preço"], 0);
  assert.equal(read["Preço final?"], true);
  assert.equal(read.Categoria, "utility");
  assert.equal(read["Modelo de cobrança"], "pmp");
  assert.equal(read["Tipo de cobrança"], "regular");
  assert.equal(read["Opportunity ID"], "opp-42");
});

test("a failure after sent remains final but never erases proven delivery", () => {
  const { mesclarStatusMensagemYCloud_ } = load();
  const key = `sha256:${"9".repeat(64)}`;
  const common = {
    providerMessageKey: key,
    externalId: "liv-reply-event-9",
    messageType: "text",
    templateName: "",
    pricingCategory: "service",
    pricingModel: "pmp",
    pricingType: "free_customer_service",
    totalPrice: "",
    currency: "BRL",
    regionCode: "BR",
    businessNumberKey: `sha256:${"8".repeat(64)}`,
    conversationOrigin: "service",
    finalPrice: false,
    sentAt: "",
    deliveredAt: "",
    readAt: "",
    updatedAt: "2026-10-01T10:00:00.000Z",
    purpose: "patient_reply",
    source: "ycloud_message_updated",
  };
  const sent = mesclarStatusMensagemYCloud_(
    {},
    { ...common, status: "sent" },
    { opportunityId: "", professional: "", campaign: "" },
    new Date("2026-10-01T10:00:00.000Z"),
  );
  const failed = mesclarStatusMensagemYCloud_(
    sent,
    { ...common, status: "failed" },
    { opportunityId: "", professional: "", campaign: "" },
    new Date("2026-10-01T10:01:00.000Z"),
  );
  const delivered = mesclarStatusMensagemYCloud_(
    failed,
    {
      ...common,
      status: "delivered",
      totalPrice: 0,
      finalPrice: true,
      deliveredAt: "2026-10-01T10:02:00.000Z",
    },
    { opportunityId: "", professional: "", campaign: "" },
    new Date("2026-10-01T10:02:00.000Z"),
  );
  const lateFailed = mesclarStatusMensagemYCloud_(
    delivered,
    { ...common, status: "failed" },
    { opportunityId: "", professional: "", campaign: "" },
    new Date("2026-10-01T10:03:00.000Z"),
  );

  assert.equal(failed.Status, "failed");
  assert.equal(delivered.Status, "delivered");
  assert.equal(lateFailed.Status, "delivered");
  assert.equal(lateFailed["Preço final?"], true);
});

test("idempotent storage updates the existing provider-key row", () => {
  const rows = [];
  let headers = [];
  const range = (row, column, rowCount, columnCount) => ({
    getDisplayValues() {
      if (row === 1) return [headers.slice(column - 1, column - 1 + columnCount)];
      return rows
        .slice(row - 2, row - 2 + rowCount)
        .map((item) => item.slice(column - 1, column - 1 + columnCount));
    },
    getValues() {
      return this.getDisplayValues();
    },
    setValues(values) {
      if (row === 1) headers = values[0].slice();
      else rows[row - 2] = values[0].slice();
      return this;
    },
  });
  const sheet = {
    getMaxColumns: () => 30,
    getLastColumn: () => headers.length,
    getLastRow: () => rows.length + 1,
    getRange: range,
    appendRow: (values) => rows.push(values.slice()),
  };
  const spreadsheet = {
    getSheetByName(name) {
      return name === "_WHATSAPP_CUSTOS" ? sheet : null;
    },
  };
  const { registrarStatusMensagemYCloud_, WHATSAPP_COST_HEADERS } = load({
    garantirCabecalhosAditivos_(target, expected) {
      target.getRange(1, 1, 1, expected.length).setValues([expected]);
    },
  });
  const key = `sha256:${"e".repeat(64)}`;
  const base = {
    providerMessageKey: key,
    status: "sent",
    pricingCategory: "utility",
    pricingModel: "pmp",
    pricingType: "regular",
    businessNumberKey: `sha256:${"f".repeat(64)}`,
    purpose: "appointment_reminder",
    source: "ycloud_message_updated",
  };

  const inserted = registrarStatusMensagemYCloud_(base, spreadsheet);
  const updated = registrarStatusMensagemYCloud_({
    ...base,
    status: "delivered",
    totalPrice: 0.04,
    currency: "BRL",
    finalPrice: true,
    deliveredAt: "2026-10-01T10:00:00.000Z",
  }, spreadsheet);

  assert.equal(inserted.inserted, true);
  assert.equal(updated.updated, true);
  assert.equal(updated.duplicate, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][WHATSAPP_COST_HEADERS.indexOf("Status")], "delivered");
  assert.equal(rows[0][WHATSAPP_COST_HEADERS.indexOf("Preço")], 0.04);
});

test("monthly diagnosis deduplicates keys and separates category and currency", () => {
  const { resumirCustosWhatsAppLinhas_, WHATSAPP_COST_HEADERS } = load();
  function row(values) {
    return WHATSAPP_COST_HEADERS.map((header) => values[header] ?? "");
  }
  const key = `sha256:${"1".repeat(64)}`;
  const rows = [
    row({
      "Chave da mensagem": key,
      Status: "delivered",
      Categoria: "service",
      "Modelo de cobrança": "pmp",
      "Tipo de cobrança": "free_customer_service",
      Preço: 0,
      Moeda: "BRL",
      "Número comercial (hash)": `sha256:${"2".repeat(64)}`,
      "Preço final?": true,
      "Entregue em": "2026-10-01T10:00:00.000Z",
    }),
    row({
      "Chave da mensagem": key,
      Status: "read",
      Categoria: "service",
      "Modelo de cobrança": "pmp",
      "Tipo de cobrança": "free_customer_service",
      Preço: 0,
      Moeda: "BRL",
      "Número comercial (hash)": `sha256:${"2".repeat(64)}`,
      "Preço final?": true,
      "Entregue em": "2026-10-01T10:00:00.000Z",
    }),
  ];
  const result = resumirCustosWhatsAppLinhas_(
    WHATSAPP_COST_HEADERS,
    rows,
    { month: "2026-10" },
  );

  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].deliveredMessages, 1);
  assert.equal(result.groups[0].finalCost, 0);
  assert.equal(result.groups[0].pricingModel, "pmp");
  assert.equal(result.groups[0].pricingType, "free_customer_service");
  assert.equal(result.groups[0].serviceFreeTierReference, 1000);
});
