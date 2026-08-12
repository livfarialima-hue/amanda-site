const MAX_PROFILE_NAME_LENGTH = 80;
const MAX_FIRST_NAME_LENGTH = 18;

export function usableProfileName(value) {
  const profileName = Array.from(String(value || "").trim())
    .slice(0, MAX_PROFILE_NAME_LENGTH + 1)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedProfileName = profileName.toLocaleLowerCase("pt-BR");
  const suspiciousProfilePattern =
    /\b(?:cl[ií]nica|consult[oó]rio|hospital|empresa|loja|store|shop|studio|est[uú]dio|est[eé]tica|sal[aã]o|oficial|atendimento|recep[cç][aã]o|comercial|vendas|marketing|equipe|grupo|cirurgia|pl[aá]stica|odontologia|ltda|fam[ií]lia|mam[aã]e?|papai|amor|vida|trabalho|n[uú]mero\s+novo|sem\s+nome)\b/i;

  if (
    !profileName ||
    profileName.length > MAX_PROFILE_NAME_LENGTH ||
    !/^[\p{L}\p{M}'’.\-\s]+$/u.test(profileName) ||
    suspiciousProfilePattern.test(profileName)
  ) {
    return "";
  }

  const words = profileName.split(/\s+/).filter(Boolean);
  if (words.length > 4) return "";

  const firstName = words[0].replace(/[^\p{L}\p{M}'’-]/gu, "");
  const normalized = firstName.toLocaleLowerCase("pt-BR");

  if (
    firstName.length < 2 ||
    firstName.length > MAX_FIRST_NAME_LENGTH ||
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
