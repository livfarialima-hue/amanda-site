import {
  existsSync,
  readFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ACTIVE_CHANGE_PATH = "ops/CHANGE-CANDIDATE.json";
const IMPACT_REGISTRY_PATH = "ops/IMPACT-REGISTRY.json";

function readJson(root, relativePath) {
  return JSON.parse(
    readFileSync(resolve(root, relativePath), "utf8"),
  );
}

function readText(root, relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function normalizePath(value) {
  return String(value || "").trim().replace(/\\/g, "/");
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizePath).filter(Boolean))].sort();
}

function runGit(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    ok: result.status === 0,
    output: String(result.stdout || "").trim(),
    error: String(result.stderr || "").trim(),
  };
}

function statusPath(line) {
  const rawPath = String(line || "").slice(3).trim();
  const renameSeparator = " -> ";

  return normalizePath(
    rawPath.includes(renameSeparator)
      ? rawPath.split(renameSeparator).at(-1)
      : rawPath,
  );
}

export function collectChangedFiles(root, baseCommit) {
  const diff = runGit(root, [
    "diff",
    "--name-only",
    "--diff-filter=ACMRTUXB",
    baseCommit,
    "--",
  ]);
  const status = runGit(root, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);

  if (!diff.ok || !status.ok) {
    throw new Error(
      `Não foi possível obter o diff: ${diff.error || status.error}`,
    );
  }

  const tracked = diff.output ? diff.output.split(/\r?\n/) : [];
  const untracked = status.output
    ? status.output
        .split(/\r?\n/)
        .filter((line) => line.startsWith("?? "))
        .map(statusPath)
    : [];

  return uniqueSorted([...tracked, ...untracked]);
}

function sameValues(left, right) {
  return JSON.stringify(uniqueSorted(left)) === JSON.stringify(uniqueSorted(right));
}

function valueList(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function extractNumber(source, pattern) {
  const match = source.match(pattern);
  return match ? Number(match[1]) : Number.NaN;
}

function functionBlock(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  if (start === -1) return "";
  const next = source.indexOf("\nfunction ", start + 10);
  return source.slice(start, next === -1 ? source.length : next);
}

export function validateAppointmentReminderContract(root) {
  const errors = [];
  const fail = (code, message) => errors.push({ code, message });
  const appsPath =
    "apps-script/clinica-liv-leads/LembretesConsultas.gs";
  const agendaPath =
    "apps-script/clinica-liv-leads/AgendaCuidados.gs";
  const endpointPath = "netlify/functions/appointment-reminder.mjs";
  const senderPath =
    "netlify/functions/lib/ycloud-appointment-reminder.mjs";

  for (const path of [appsPath, agendaPath, endpointPath, senderPath]) {
    if (!existsSync(resolve(root, path))) {
      fail("REMINDER_CONTRACT_FILE_MISSING", `Arquivo ausente: ${path}`);
    }
  }
  if (errors.length) return errors;

  const apps = readText(root, appsPath);
  const agenda = readText(root, agendaPath);
  const endpoint = readText(root, endpointPath);
  const sender = readText(root, senderPath);
  const agendaTargets = functionBlock(
    agenda,
    "alvosLembretesConsultaAgenda_",
  );

  const appsStart = extractNumber(apps, /startHour:\s*(\d+)/);
  const appsEnd = extractNumber(apps, /endHour:\s*(\d+)/);
  const endpointStart = extractNumber(
    endpoint,
    /hour\s*>=\s*(\d+)/,
  );
  const endpointEnd = extractNumber(endpoint, /hour\s*<\s*(\d+)/);

  if (
    !Number.isFinite(appsStart) ||
    !Number.isFinite(appsEnd) ||
    appsStart !== endpointStart ||
    appsEnd !== endpointEnd
  ) {
    fail(
      "REMINDER_WINDOW_DIVERGENCE",
      "Apps Script e endpoint Netlify precisam usar a mesma janela de envio.",
    );
  }

  if (
    !/singleReminderDaysBefore:\s*1\b/.test(apps) ||
    !/singleReminderTime:\s*"10:00"/.test(apps)
  ) {
    fail(
      "REMINDER_OWNER_CADENCE_INVALID",
      "O proprietário deve declarar um único lembrete às 10h da véspera.",
    );
  }

  const safeContractGate = apps.indexOf(
    "safe_contract_not_activated",
  );
  const internalProcessor = apps.indexOf(
    "processarLembretesConsultasInterno_(",
  );
  if (
    !apps.includes("LEMBRETES_CONSULTA_CONTRATO_SEGURO_ATIVO") ||
    safeContractGate === -1 ||
    internalProcessor === -1 ||
    safeContractGate > internalProcessor
  ) {
    fail(
      "REMINDER_DEFAULT_OFF_GATE_MISSING",
      "O Apps Script deve permanecer sem efeito até a ativação coordenada do contrato seguro.",
    );
  }

  if (
    !agendaTargets.includes(
      "horarioAlvoLembretePrincipalConsulta_(consulta)",
    ) ||
    /confirmacao|16:30|2\s*\*\s*24/i.test(agendaTargets)
  ) {
    fail(
      "REMINDER_PLANNER_DIVERGENCE",
      "AgendaCuidados deve consumir o alvo canônico e não criar uma segunda cadência.",
    );
  }

  for (const marker of [
    "ultima tentativa de lembrete",
    "erro do lembrete",
    "validarDadosPacienteLembreteConsulta_",
  ]) {
    if (!agenda.toLowerCase().includes(marker.toLowerCase())) {
      fail(
        "REMINDER_PLANNER_GUARD_MISSING",
        `AgendaCuidados não considera o guardrail: ${marker}.`,
      );
    }
  }

  const validationPosition = apps.indexOf(
    "const patientData = validarDadosPacienteLembreteConsulta_",
  );
  const reservationPosition = apps.indexOf(
    ".setValue(now)",
    Math.max(validationPosition, 0),
  );
  if (
    validationPosition === -1 ||
    reservationPosition === -1 ||
    validationPosition > reservationPosition
  ) {
    fail(
      "REMINDER_VALIDATION_AFTER_EFFECT",
      "Nome e telefone devem ser validados antes de reservar a tentativa.",
    );
  }

  if (
    !endpoint.includes(
      "!appointmentReminderPatientName(payload.patientName)",
    )
  ) {
    fail(
      "REMINDER_ENDPOINT_NAME_GUARD_MISSING",
      "O endpoint deve recusar nome ausente ou genérico.",
    );
  }

  if (
    !sender.includes('errorCode: "invalid_patient_name"') ||
    /limitedText\(patientName,\s*120\)\s*\|\|\s*"Olá"/.test(sender)
  ) {
    fail(
      "REMINDER_SENDER_NAME_FALLBACK",
      "O adaptador do provedor deve falhar fechado, sem inventar saudação.",
    );
  }

  return errors;
}

export function validateChangeSafety({
  root = process.cwd(),
  changedFiles,
  checkGit = true,
  release = false,
  approval = {},
  livePreflight = {},
} = {}) {
  const absoluteRoot = resolve(root);
  const errors = [];
  const checks = [];
  const fail = (code, message) => errors.push({ code, message });
  const pass = (code, message) => checks.push({ code, message });

  for (const path of [ACTIVE_CHANGE_PATH, IMPACT_REGISTRY_PATH]) {
    if (!existsSync(resolve(absoluteRoot, path))) {
      fail("CHANGE_SAFETY_FILE_MISSING", `Arquivo obrigatório ausente: ${path}`);
    }
  }
  if (errors.length) return { ok: false, errors, checks };

  let change;
  let registry;
  try {
    change = readJson(absoluteRoot, ACTIVE_CHANGE_PATH);
    registry = readJson(absoluteRoot, IMPACT_REGISTRY_PATH);
  } catch (error) {
    fail("CHANGE_SAFETY_JSON_INVALID", error.message);
    return { ok: false, errors, checks };
  }

  if (change.schemaVersion !== 1 || registry.schemaVersion !== 1) {
    fail("CHANGE_SAFETY_SCHEMA_INVALID", "Schema esperado: versão 1.");
  }
  for (const [field, value] of [
    ["changeId", change.changeId],
    ["title", change.title],
    ["status", change.status],
    ["baseCommit", change.baseCommit],
    ["risk.level", change.risk?.level],
    ["rollback.local", change.rollback?.local],
    ["rollback.production", change.rollback?.production],
    ["monitoring.owner", change.monitoring?.owner],
    ["monitoring.window", change.monitoring?.window],
  ]) {
    if (!hasText(value)) {
      fail("CHANGE_FIELD_MISSING", `Campo obrigatório vazio: ${field}.`);
    }
  }
  if (!/^[0-9a-f]{40}$/.test(String(change.baseCommit || ""))) {
    fail("CHANGE_BASE_INVALID", "baseCommit precisa ser um SHA completo.");
  }
  if (
    change.authorization?.required !== true ||
    change.authorization?.recording !==
      "external_release_preflight" ||
    change.authorization?.publicationAuthorizedInCommit !== false
  ) {
    fail(
      "CHANGE_AUTHORIZATION_CONTRACT_INVALID",
      "A autorização deve ser exigida externamente para o HEAD exato, sem modificar o candidato aprovado.",
    );
  }

  const declaredFiles = valueList(change.scope?.files);
  const declaredContracts = valueList(change.scope?.contracts);
  const consumers = valueList(change.impact?.consumers);
  const invariants = valueList(change.impact?.preservedInvariants);
  const commands = valueList(change.verification?.commands);
  const preflight = valueList(change.impact?.liveReadOnlyPreflight);

  for (const [field, values] of [
    ["scope.files", declaredFiles],
    ["scope.contracts", declaredContracts],
    ["impact.consumers", consumers],
    ["impact.preservedInvariants", invariants],
    ["verification.commands", commands],
    ["impact.liveReadOnlyPreflight", preflight],
  ]) {
    if (!values.length) {
      fail("CHANGE_LIST_EMPTY", `Lista obrigatória vazia: ${field}.`);
    }
  }

  let actualFiles = changedFiles;
  if (!actualFiles && checkGit && /^[0-9a-f]{40}$/.test(String(change.baseCommit || ""))) {
    const ancestor = runGit(absoluteRoot, [
      "merge-base",
      "--is-ancestor",
      change.baseCommit,
      "HEAD",
    ]);
    if (!ancestor.ok) {
      fail(
        "CHANGE_BASE_NOT_ANCESTOR",
        "O baseline declarado não pertence ao histórico do candidato.",
      );
    } else {
      actualFiles = collectChangedFiles(absoluteRoot, change.baseCommit);
    }
  }

  if (actualFiles && !sameValues(actualFiles, declaredFiles)) {
    const actual = uniqueSorted(actualFiles);
    const declared = uniqueSorted(declaredFiles);
    const undeclared = actual.filter((path) => !declared.includes(path));
    const absent = declared.filter((path) => !actual.includes(path));
    fail(
      "CHANGE_SCOPE_DIVERGENCE",
      `Arquivos fora do contrato: ${undeclared.join(", ") || "nenhum"}; declarados sem mudança: ${absent.join(", ") || "nenhum"}.`,
    );
  } else if (actualFiles) {
    pass(
      "CHANGE_SCOPE_EXACT",
      `${uniqueSorted(actualFiles).length} arquivos coincidem com o escopo declarado.`,
    );
  }

  const contracts = new Map(
    valueList(registry.contracts).map((contract) => [
      contract.id,
      contract,
    ]),
  );
  const selectedContracts = [];
  for (const contractId of declaredContracts) {
    const contract = contracts.get(contractId);
    if (!contract) {
      fail("CHANGE_CONTRACT_UNKNOWN", `Contrato não registrado: ${contractId}.`);
      continue;
    }
    selectedContracts.push(contract);
  }

  for (const path of declaredFiles) {
    const covered = selectedContracts.some((contract) =>
      valueList(contract.coveredPaths).includes(path),
    );
    if (!covered) {
      fail(
        "CHANGE_FILE_WITHOUT_CONTRACT",
        `Arquivo sem contrato de impacto declarado: ${path}.`,
      );
    }
  }

  for (const contract of selectedContracts) {
    for (const testPath of valueList(contract.requiredTestFiles)) {
      if (!existsSync(resolve(absoluteRoot, testPath))) {
        fail(
          "CHANGE_REQUIRED_TEST_MISSING",
          `${contract.id} exige o teste ${testPath}.`,
        );
      }
    }
    for (const command of valueList(contract.requiredCommands)) {
      if (!commands.includes(command)) {
        fail(
          "CHANGE_REQUIRED_COMMAND_UNDECLARED",
          `${contract.id} exige declarar: ${command}.`,
        );
      }
    }
    if (
      contract.requiresReadOnlyPreflight === true &&
      !preflight.some((item) => item?.contract === contract.id)
    ) {
      fail(
        "CHANGE_LIVE_PREFLIGHT_MISSING",
        `${contract.id} exige preflight vivo somente leitura.`,
      );
    }
  }

  for (const error of validateAppointmentReminderContract(absoluteRoot)) {
    errors.push(error);
  }
  if (!errors.some((item) => item.code.startsWith("REMINDER_"))) {
    pass(
      "REMINDER_CONTRACT_ALIGNED",
      "Disparador, agenda diária e endpoint compartilham os mesmos guardrails.",
    );
  }

  if (release) {
    const head = runGit(absoluteRoot, ["rev-parse", "HEAD"]);
    if (
      !["tested_local", "committed"].includes(change.status) ||
      change.verification?.status !== "passed_local" ||
      !head.ok ||
      approval.approvedCommit !== head.output ||
      !hasText(approval.approvedAt) ||
      !hasText(approval.approvedBy) ||
      !hasText(approval.reference)
    ) {
      fail(
        "CHANGE_PUBLICATION_NOT_AUTHORIZED",
        "O modo release exige autorização explícita para o HEAD exato, sem modificar o commit candidato.",
      );
    }
    if (
      !hasText(livePreflight.checkedAt) ||
      !hasText(livePreflight.reference)
    ) {
      fail(
        "CHANGE_LIVE_PREFLIGHT_PENDING",
        `Preflight vivo sem recibo para: ${preflight
          .map((item) => item?.system || item?.contract || "N/D")
          .join(", ")}.`,
      );
    }
    const status = runGit(absoluteRoot, ["status", "--porcelain=v1"]);
    if (!status.ok || status.output) {
      fail(
        "CHANGE_RELEASE_WORKTREE_DIRTY",
        "O preflight de publicação exige worktree limpo.",
      );
    }
  }

  return { ok: errors.length === 0, errors, checks };
}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "") : "";
}

function printResult(result) {
  console.log(`CHANGE_SAFETY_STATUS=${result.ok ? "OK" : "BLOCKED"}`);
  for (const item of result.checks) {
    console.log(`OK ${item.code}: ${item.message}`);
  }
  for (const item of result.errors) {
    console.error(`ERROR ${item.code}: ${item.message}`);
  }
}

const executedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (executedDirectly) {
  const result = validateChangeSafety({
    root: process.cwd(),
    release: process.argv.includes("--release"),
    approval: {
      approvedCommit: optionValue("--approved-commit"),
      approvedAt: optionValue("--approved-at"),
      approvedBy: optionValue("--approved-by"),
      reference: optionValue("--approval-reference"),
    },
    livePreflight: {
      checkedAt: optionValue("--live-preflight-at"),
      reference: optionValue("--live-preflight-reference"),
    },
  });
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}
