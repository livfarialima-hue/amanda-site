import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const targetPath = fileURLToPath(
  new URL(
    "../apps-script/clinica-liv-leads/production-target.json",
    import.meta.url,
  ),
);

export function loadProductionTarget() {
  return JSON.parse(readFileSync(targetPath, "utf8"));
}

function extractId(value, patterns) {
  const text = String(value || "").trim();
  if (!text) return "";

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return /^[A-Za-z0-9_-]+$/.test(text) ? text : "";
}

export function extractProjectId(value) {
  return extractId(value, [
    /script\.google\.com\/(?:u\/\d+\/)?home\/projects\/([^/?#]+)/i,
  ]);
}

export function extractDeploymentId(value) {
  return extractId(value, [
    /script\.google\.com\/macros\/s\/([^/?#]+)/i,
  ]);
}

export function extractSpreadsheetId(value) {
  return extractId(value, [
    /docs\.google\.com\/spreadsheets\/d\/([^/?#]+)/i,
  ]);
}

export function verifyProductionTarget(input, target = loadProductionTarget()) {
  const actual = {
    scriptId: extractProjectId(input.project),
    deploymentId: extractDeploymentId(input.deployment),
    spreadsheetId: extractSpreadsheetId(input.spreadsheet),
  };
  const expected = {
    scriptId: target.scriptId,
    deploymentId: target.deploymentId,
    spreadsheetId: target.spreadsheetId,
  };
  const labels = {
    scriptId: "projeto",
    deploymentId: "deployment",
    spreadsheetId: "planilha",
  };
  const errors = Object.keys(expected).flatMap((key) => {
    if (!actual[key]) {
      return [`ID de ${labels[key]} ausente ou inválido.`];
    }
    if (actual[key] !== expected[key]) {
      return [
        `ID de ${labels[key]} divergente: recebido ${actual[key]}; esperado ${expected[key]}.`,
      ];
    }
    return [];
  });

  return { ok: errors.length === 0, actual, expected, errors };
}

function parseFlags(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    values[token.slice(2)] = args[index + 1] || "";
    index += 1;
  }
  return values;
}

function showTarget(target) {
  console.log("ALVO CANÔNICO DO APPS SCRIPT");
  console.log(`Projeto: ${target.projectUrl}`);
  console.log(`Deployment: ${target.webAppUrl}`);
  console.log(`Planilha: ${target.spreadsheetUrl}`);
  console.log(`Última versão verificada: ${target.lastVerifiedVersion}`);
}

const invokedDirectly =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const [command = "", ...rest] = process.argv.slice(2);
  const target = loadProductionTarget();

  if (command === "show") {
    showTarget(target);
  } else if (command === "verify") {
    const flags = parseFlags(rest);
    const result = verifyProductionTarget({
      project: flags.project,
      deployment: flags.deployment,
      spreadsheet: flags.spreadsheet,
    }, target);

    if (!result.ok) {
      console.error("ALVO BLOQUEADO");
      result.errors.forEach((error) => console.error(`- ${error}`));
      process.exitCode = 1;
    } else {
      console.log("ALVO CANÔNICO CONFIRMADO");
      console.log(`Projeto: ${result.actual.scriptId}`);
      console.log(`Deployment: ${result.actual.deploymentId}`);
      console.log(`Planilha: ${result.actual.spreadsheetId}`);
    }
  } else {
    console.error(
      "Uso: node scripts/check-apps-script-target.mjs show|verify --project <URL-ou-ID> --deployment <URL-ou-ID> --spreadsheet <URL-ou-ID>",
    );
    process.exitCode = 1;
  }
}
