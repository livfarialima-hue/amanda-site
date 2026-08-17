function normalizePhone(value) {
  const compact = String(value || "").replace(/[^\d+]/g, "");

  if (/^\+\d{8,15}$/.test(compact)) return compact;
  if (/^55\d{10,11}$/.test(compact)) return `+${compact}`;

  return null;
}

export function configuredInternalTeamPhones(env = process.env) {
  return new Set(
    String(env.WHATSAPP_INTERNAL_NUMBERS || "")
      .split(/[,;\n]+/)
      .map((value) => normalizePhone(value.trim()))
      .filter(Boolean),
  );
}

export function isInternalTeamPhone(value, env = process.env) {
  const phone = normalizePhone(value);
  if (!phone) return false;

  return configuredInternalTeamPhones(env).has(phone);
}

export function hasConfiguredInternalTeamPhones(env = process.env) {
  return configuredInternalTeamPhones(env).size > 0;
}
