const AUTOMATED_APPOINTMENT_KEYS = new Set(["amanda", "daniel"]);

export const PROFESSIONAL_REGISTRY = Object.freeze([
  Object.freeze({
    key: "amanda",
    routeKey: "amanda",
    displayName: "Dra. Amanda",
    acquisitionPriority: true,
    external: false,
    rooms: Object.freeze(["Sala 1"]),
    patterns: Object.freeze([
      /\b(?:dra\.?\s*)?amanda(?:\s+schroeder)?\b/,
    ]),
  }),
  Object.freeze({
    key: "daniel",
    routeKey: "daniel",
    displayName: "Dr. Daniel",
    acquisitionPriority: false,
    external: false,
    rooms: Object.freeze(["Sala 2"]),
    patterns: Object.freeze([
      /\bdr\.?\s*daniel(?:\s+added)?\b/,
      /\bdaniel\b.{0,40}\bcardio(?:logia|logista)?\b/,
    ]),
  }),
  Object.freeze({
    key: "dr_henrique_staniak",
    routeKey: "external",
    displayName: "Dr. Henrique Lane Staniak",
    acquisitionPriority: false,
    external: true,
    rooms: Object.freeze(["Sala 2"]),
    patterns: Object.freeze([
      /\bdr\.?\s*henrique(?:\s+lane)?(?:\s+staniak)?\b/,
      /\bhenrique\s+(?:lane|staniak)\b/,
    ]),
  }),
  Object.freeze({
    key: "dra_marina_silva",
    routeKey: "external",
    displayName: "Dra. Marina Silva",
    acquisitionPriority: false,
    external: true,
    rooms: Object.freeze(["Sala 1", "Sala 2"]),
    patterns: Object.freeze([
      /\bdra\.?\s*marina(?:\s+silva)?\b/,
    ]),
  }),
  Object.freeze({
    key: "dr_laerte",
    routeKey: "external",
    displayName: "Dr. Laerte",
    acquisitionPriority: false,
    external: true,
    rooms: Object.freeze(["Sala 1", "Sala 2"]),
    patterns: Object.freeze([
      /\bdr\.?\s*laerte(?:\s+[a-z]{2,})?\b/,
    ]),
  }),
  Object.freeze({
    key: "matheus_ortopedia",
    routeKey: "external",
    displayName: "Matheus (ortop)",
    acquisitionPriority: false,
    external: true,
    rooms: Object.freeze(["Sala 2"]),
    patterns: Object.freeze([
      /\bdr\.?\s*matheus(?:\s+[a-z]{2,})?\b/,
      /\bmatheus\s*(?:\(\s*ortop\s*\)|ortop(?:edista|edia)?\b)/,
    ]),
  }),
]);

export function normalizeProfessionalText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findProfessionalMentions(text) {
  const value = normalizeProfessionalText(text);
  if (!value) return [];
  return PROFESSIONAL_REGISTRY.filter((professional) =>
    professional.patterns.some((pattern) => pattern.test(value)),
  );
}

function professionalLookupKey(value) {
  return normalizeProfessionalText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function professionalByKey(value) {
  const key = professionalLookupKey(value);
  const exact = PROFESSIONAL_REGISTRY.find((professional) =>
    [
      professionalLookupKey(professional.key),
      professionalLookupKey(professional.displayName),
    ].includes(key),
  );
  if (exact) return exact;

  const mentions = findProfessionalMentions(value);
  return mentions.length === 1 ? mentions[0] : null;
}

export function isAutomatedAppointmentProfessional(value) {
  const professional = professionalByKey(value);
  return Boolean(
    professional &&
      !professional.external &&
      AUTOMATED_APPOINTMENT_KEYS.has(professional.key),
  );
}

export function resolveAutomatedAppointmentProfessional({
  text,
  professionalHint = "",
} = {}) {
  const mentions = findProfessionalMentions(text);
  const unique = [...new Map(
    mentions.map((professional) => [professional.key, professional]),
  ).values()];

  if (unique.some((professional) => professional.external)) return null;
  if (unique.length === 1 && isAutomatedAppointmentProfessional(unique[0].key)) {
    return unique[0].displayName;
  }
  if (unique.length > 1) return null;

  const value = normalizeProfessionalText(text);
  const genericSiteServicePicker =
    /cirurgia plastica\s*\/?\s*estetica/.test(value) &&
    /\bcardiologia\b/.test(value) &&
    /origem do contato:\s*site liv faria lima/.test(value);
  if (
    !genericSiteServicePicker &&
    /\bcardiologia\b|\bcardiologista\b/.test(value)
  ) {
    return "Dr. Daniel";
  }

  const hinted = professionalByKey(professionalHint);
  return hinted && isAutomatedAppointmentProfessional(hinted.key)
    ? hinted.displayName
    : null;
}

export function reviewOwnerForProfessional(value) {
  const professional = professionalByKey(value);
  if (!professional) return "Equipe Clínica LIV — confirmar profissional";
  if (professional.key === "amanda") return "Dra. Amanda/equipe";
  if (professional.key === "daniel") return "Dr. Daniel/equipe";
  return `Equipe administrativa — ${professional.displayName}`;
}
