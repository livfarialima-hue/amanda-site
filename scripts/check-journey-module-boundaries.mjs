import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const AUTOMATION_MODE_CONSUMERS = [
  {
    path: "netlify/functions/ycloud-webhook.mjs",
    names: ["normalizeAutomationMode"],
  },
  {
    path: "netlify/functions/human-resume.mjs",
    names: ["allowsPatientSideEffects"],
  },
  {
    path: "netlify/functions/scheduled-followup.mjs",
    names: ["allowsPatientSideEffects", "normalizeAutomationMode"],
  },
  {
    path: "netlify/functions/appointment-reminder.mjs",
    names: ["allowsPatientSideEffects", "normalizeAutomationMode"],
  },
  {
    path: "netlify/functions/post-consult-followup.mjs",
    names: ["allowsPatientSideEffects", "normalizeAutomationMode"],
  },
];

const PURE_POLICY_MODULES = [
  "netlify/functions/lib/automation-mode.mjs",
  "netlify/functions/lib/marketing-prefill.mjs",
  "netlify/functions/lib/procedure-context.mjs",
];

function importedModuleFor(source, importedName) {
  const imports = source.matchAll(
    /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];/g,
  );
  for (const match of imports) {
    const names = match[1]
      .split(",")
      .map((name) => name.trim().split(/\s+as\s+/)[0]);
    if (names.includes(importedName)) return match[2];
  }
  return "";
}

export function collectJourneyBoundaryViolations(root = PROJECT_ROOT) {
  const violations = [];
  const read = (relativePath) =>
    readFileSync(resolve(root, relativePath), "utf8");

  for (const consumer of AUTOMATION_MODE_CONSUMERS) {
    const source = read(consumer.path);
    for (const importedName of consumer.names) {
      const importedFrom = importedModuleFor(source, importedName);
      if (importedFrom !== "./lib/automation-mode.mjs") {
        violations.push(
          `${consumer.path}: ${importedName} must come from ./lib/automation-mode.mjs`,
        );
      }
    }
  }

  const forbiddenPurePolicyPatterns = [
    [/@netlify\/blobs/, "Netlify Blobs"],
    [/\bprocess\.env\b/, "process.env"],
    [/\bfetch\s*\(/, "fetch"],
    [/node:(?:http|https|net|tls)/, "network runtime"],
    [/ycloud-sender|openai-shadow|conversation-memory/, "side-effect adapter"],
  ];

  for (const relativePath of PURE_POLICY_MODULES) {
    const source = read(relativePath);
    for (const [pattern, label] of forbiddenPurePolicyPatterns) {
      if (pattern.test(source)) {
        violations.push(`${relativePath}: pure policy cannot depend on ${label}`);
      }
    }
  }

  const planner = read("netlify/functions/lib/whatsapp-automation.mjs");
  const compatibilityModules = [
    "./automation-mode.mjs",
    "./marketing-prefill.mjs",
    "./procedure-context.mjs",
  ];
  for (const modulePath of compatibilityModules) {
    const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`export\\s*\\{[\\s\\S]*?\\}\\s*from\\s*["']${escaped}["']`).test(planner)) {
      violations.push(
        `netlify/functions/lib/whatsapp-automation.mjs: missing compatibility re-export from ${modulePath}`,
      );
    }
  }

  return violations;
}

export function assertJourneyModuleBoundaries(root = PROJECT_ROOT) {
  const violations = collectJourneyBoundaryViolations(root);
  if (violations.length) {
    throw new Error(`Journey module boundary violations:\n- ${violations.join("\n- ")}`);
  }
}

const executedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (executedDirectly) {
  assertJourneyModuleBoundaries();
  console.log("JOURNEY_MODULE_BOUNDARIES=OK");
}
