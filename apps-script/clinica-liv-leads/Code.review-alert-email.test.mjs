import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./Code.gs", import.meta.url),
  "utf8",
);

function loadCode({ existingRows = [] } = {}) {
  const sentEmails = [];
  const appendedRows = [];
  const rows = [...existingRows];
  const sheet = {
    getLastRow() {
      return rows.length + 1;
    },
    getRange(row, column, rowCount, columnCount) {
      return {
        getDisplayValues() {
          return rows
            .slice(row - 2, row - 2 + rowCount)
            .map((entry) =>
              entry.slice(column - 1, column - 1 + columnCount),
            );
        },
      };
    },
    appendRow(values) {
      rows.push(values);
      appendedRows.push(values);
    },
  };
  const spreadsheet = {
    getSheetByName() {
      return sheet;
    },
  };
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    MailApp: {
      sendEmail(message) {
        sentEmails.push(message);
      },
    },
    SpreadsheetApp: {
      openById() {
        return spreadsheet;
      },
    },
  };

  vm.runInNewContext(
    `${source}
globalThis.__test = { CONFIG, sendReviewAlertEmail_ };`,
    sandbox,
  );

  return {
    ...sandbox.__test,
    sentEmails,
    appendedRows,
  };
}

test("review alert email mirrors the alert content for Daniel", () => {
  const {
    CONFIG,
    sendReviewAlertEmail_,
    sentEmails,
    appendedRows,
  } = loadCode();

  const result = sendReviewAlertEmail_({
    eventId: "evt-review-01",
    patientName: "Maria Silva",
    patientPhone: "+55 11 90000-0000",
    messageText:
      "Valores?\nSugestão para copiar após conferir:\nOlá, Maria.",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: true,
    sent: true,
    duplicate: false,
  });
  assert.equal(CONFIG.reviewAlertEmail, "daniel.added@gmail.com");
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, "daniel.added@gmail.com");
  assert.match(sentEmails[0].body, /Paciente: Maria Silva/);
  assert.match(sentEmails[0].body, /WhatsApp: \+5511900000000/);
  assert.match(
    sentEmails[0].body,
    /Sugestão para copiar após conferir:\nOlá, Maria\./,
  );
  assert.equal(appendedRows.length, 1);
  assert.equal(appendedRows[0][0], "evt-review-01");
});

test("review alert email preserves message punctuation exactly", () => {
  const {
    sendReviewAlertEmail_,
    sentEmails,
  } = loadCode();

  sendReviewAlertEmail_({
    eventId: "evt-review-02",
    patientName: "Maria Silva",
    patientPhone: "+5511900000000",
    messageText: "+ Sugestão pronta para copiar",
  });

  assert.match(
    sentEmails[0].body,
    /\n\+ Sugestão pronta para copiar$/,
  );
});

test("review alert email is not sent twice for the same event", () => {
  const {
    sendReviewAlertEmail_,
    sentEmails,
    appendedRows,
  } = loadCode({
    existingRows: [[
      "evt-review-01",
      "daniel.added@gmail.com",
    ]],
  });

  const result = sendReviewAlertEmail_({
    eventId: "evt-review-01",
    patientName: "Maria Silva",
    patientPhone: "+5511900000000",
    messageText: "Mensagem",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ok: true,
    sent: false,
    duplicate: true,
  });
  assert.equal(sentEmails.length, 0);
  assert.equal(appendedRows.length, 0);
});
