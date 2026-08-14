const SCHEDULE_MAINTENANCE_CONFIG = Object.freeze({
  spreadsheetId:
    "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Datas Consulta",
  headerRow: 6,
  columns: 7,
});

function normalizarCabecalhoAgenda_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function encontrarColunaAgenda_(headers, expected) {
  const normalizedExpected = normalizarCabecalhoAgenda_(expected);
  return (headers || []).findIndex(function (header) {
    return normalizarCabecalhoAgenda_(header) === normalizedExpected;
  });
}

function interpretarHorarioAgenda_(dateValue, timeValue) {
  const dateMatch = String(dateValue || "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = String(timeValue || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const parsed = new Date(
    Number(dateMatch[3]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[1]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function planejarExpiracaoHorariosPassados_(values, now) {
  const headers = values[0] || [];
  const dateColumn = encontrarColunaAgenda_(headers, "Data");
  const timeColumn = encontrarColunaAgenda_(headers, "Horário");
  const statusColumn = encontrarColunaAgenda_(headers, "Status");
  if ([dateColumn, timeColumn, statusColumn].some(function (column) {
    return column < 0;
  })) {
    throw new Error("Estrutura inesperada na aba Datas Consulta.");
  }

  const expiredRows = [];
  for (let index = 1; index < values.length; index += 1) {
    const row = values[index] || [];
    if (normalizarCabecalhoAgenda_(row[statusColumn]) !== "disponivel") {
      continue;
    }
    const dateTime = interpretarHorarioAgenda_(
      row[dateColumn],
      row[timeColumn],
    );
    if (dateTime && dateTime.getTime() <= now.getTime()) {
      expiredRows.push(SCHEDULE_MAINTENANCE_CONFIG.headerRow + index);
    }
  }

  return {
    inspected: Math.max(0, values.length - 1),
    statusColumn: statusColumn + 1,
    expiredRows,
  };
}

function expirarHorariosPassadosInterno_(spreadsheet, now, options) {
  const apply = !options || options.apply !== false;
  const sheet = spreadsheet.getSheetByName(
    SCHEDULE_MAINTENANCE_CONFIG.sheetName,
  );
  if (!sheet) {
    throw new Error("Aba Datas Consulta não encontrada.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= SCHEDULE_MAINTENANCE_CONFIG.headerRow) {
    return {
      ok: true,
      applied: apply,
      inspected: 0,
      expired: 0,
      remainingPastAvailable: 0,
    };
  }

  const values = sheet.getRange(
    SCHEDULE_MAINTENANCE_CONFIG.headerRow,
    1,
    lastRow - SCHEDULE_MAINTENANCE_CONFIG.headerRow + 1,
    SCHEDULE_MAINTENANCE_CONFIG.columns,
  ).getDisplayValues();
  const plan = planejarExpiracaoHorariosPassados_(values, now);

  if (apply) {
    plan.expiredRows.forEach(function (row) {
      sheet.getRange(row, plan.statusColumn).setValue("Indisponível");
    });
    if (plan.expiredRows.length) SpreadsheetApp.flush();
  }

  return {
    ok: true,
    applied: apply,
    inspected: plan.inspected,
    expired: plan.expiredRows.length,
    remainingPastAvailable: apply ? 0 : plan.expiredRows.length,
  };
}

function expirarHorariosPassados() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = SpreadsheetApp.openById(
      SCHEDULE_MAINTENANCE_CONFIG.spreadsheetId,
    );
    const report = expirarHorariosPassadosInterno_(
      spreadsheet,
      new Date(),
      { apply: true },
    );
    console.log("SCHEDULE_EXPIRATION " + JSON.stringify(report));
    return report;
  } finally {
    lock.releaseLock();
  }
}
