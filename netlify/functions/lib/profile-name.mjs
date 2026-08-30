const MAX_PROFILE_NAME_LENGTH = 80;
const MAX_FIRST_NAME_LENGTH = 18;
const MAX_KNOWN_PATIENT_NAME_LENGTH = 120;
const PERSONAL_NAME_CHARACTER_PATTERN = /^[\p{L}\p{M}'’.\-\s]+$/u;

export function usableKnownPatientName(value) {
  const name = Array.from(String(value || "").trim())
    .slice(0, MAX_KNOWN_PATIENT_NAME_LENGTH + 1)
    .join("")
    .replace(/^'+/, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = name
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (
    !name ||
    name.length > MAX_KNOWN_PATIENT_NAME_LENGTH ||
    !/^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*)*$/u.test(
      name,
    ) ||
    [
      "nao informado",
      "nao informada",
      "desconhecido",
      "desconhecida",
      "paciente",
      "cliente",
      "contato",
      "sem nome",
    ].includes(normalized)
  ) {
    return "";
  }

  return name;
}

function stripBoundaryDecorations(value) {
  const tokens = String(value || "").split(/\s+/).filter(Boolean);
  while (tokens.length && !/[\p{L}\p{M}\p{N}]/u.test(tokens[0])) tokens.shift();
  while (tokens.length && !/[\p{L}\p{M}\p{N}]/u.test(tokens.at(-1))) tokens.pop();

  return tokens
    .join(" ")
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]+/gu, "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]+$/gu, "")
    .trim();
}

export function usableProfileName(value) {
  const boundedProfileName = Array.from(String(value || "").trim())
    .slice(0, MAX_PROFILE_NAME_LENGTH + 1)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const profileName = stripBoundaryDecorations(boundedProfileName);
  const normalizedProfileName = profileName.toLocaleLowerCase("pt-BR");
  const suspiciousProfilePattern =
    /\b(?:cl[ií]nica|consult[oó]rio|hospital|empresa|loja|store|shop|studio|est[uú]dio|est[eé]tica|sal[aã]o|oficial|atendimento|recep[cç][aã]o|comercial|vendas|marketing|equipe|grupo|cirurgia|pl[aá]stica|odontologia|ltda|semijoias?|joias?|joalheria|acess[oó]rios|boutique|moda|beauty|imobili[aá]ria|advocacia|arquitetura|fotografia|doces|restaurante|fam[ií]lia|mam[aã]e?|papai|amor|vida|trabalho|n[uú]mero\s+novo|sem\s+nome)\b/i;

  if (
    !profileName ||
    boundedProfileName.length > MAX_PROFILE_NAME_LENGTH ||
    !PERSONAL_NAME_CHARACTER_PATTERN.test(profileName) ||
    suspiciousProfilePattern.test(profileName)
  ) {
    return "";
  }

  const words = profileName.split(/\s+/).filter(Boolean);
  if (words.length > 4) return "";

  const firstName = words[0].replace(/[^\p{L}\p{M}'’-]/gu, "");
  const normalized = firstName.toLocaleLowerCase("pt-BR");
  const foldedFirstName = firstName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]/gi, "");
  const looksLikeConsonantInitialism =
    words.length === 1 &&
    foldedFirstName.length >= 2 &&
    foldedFirstName.length <= 5 &&
    !/[aeiouy]/i.test(foldedFirstName);

  if (
    firstName.length < 2 ||
    firstName.length > MAX_FIRST_NAME_LENGTH ||
    looksLikeConsonantInitialism ||
    [
      "unknown",
      "desconhecido",
      "cliente",
      "paciente",
      "contato",
      "dra",
      "dr",
      "doutora",
      "doutor",
      "admin",
      "adm",
    ].includes(normalized) ||
    normalizedProfileName.startsWith("@")
  ) {
    return "";
  }

  return profileName;
}

export function usableProfileFirstName(value) {
  const profileName = usableProfileName(value);
  return profileName ? profileName.split(/\s+/)[0] : "";
}

const SELF_IDENTIFICATION_PATTERN =
  /\b(?:(?:eu\s+)?sou\s+(?:a|o)?\s*|me\s+chamo\s+|meu\s+nome\s+(?:[eé]\s+))([\p{L}\p{M}][\p{L}\p{M}'’–-]{1,17})\b/iu;

export function resolvePatientDisplayName({
  profileName,
  currentText = "",
  recentConversation = [],
} = {}) {
  const patientTexts = (Array.isArray(recentConversation)
    ? recentConversation
    : [])
    .filter(
      (turn) =>
        turn?.role === "user" || turn?.source === "patient",
    )
    .map((turn) => String(turn?.text || "").trim())
    .filter(Boolean);
  if (String(currentText || "").trim()) {
    patientTexts.push(String(currentText).trim());
  }

  for (const text of patientTexts.reverse()) {
    const match = text.match(SELF_IDENTIFICATION_PATTERN);
    const identifiedName = usableProfileName(match?.[1] || "");
    if (identifiedName) return identifiedName;
  }

  return usableProfileName(profileName);
}
