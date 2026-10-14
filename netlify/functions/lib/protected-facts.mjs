// Pure, bounded checks for protected literals and a few explicit claim forms.
// This is not a general semantic verifier: routing, source approval and the
// final outbound gate remain mandatory. Unrecognized negation stays blocked.
function normalized(value) {
  return String(value || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function explicitlyDenied(prefix, kind) {
  const clause = prefix.split(/[.!?;\n]|\b(?:mas|porem|contudo|entretanto|todavia)\b/u).at(-1).trim();
  // A second negative can reverse the assertion. Do not guess its meaning.
  if ((clause.match(/\b(?:nao|nunca|jamais)\b/g) || []).length !== 1) return false;
  if (/\b(?:nao|nunca|jamais)\s+(?:(?:e|sera|seria|foi|esta|estara|estava|fica|ficara|ficou|pode|podera|deve|devera|ha|existe)\s+)?(?:ser\s+)?$/u.test(`${clause} `)) return true;
  if (/\b(?:nao|nunca|jamais)$/u.test(clause)) return true;
  if (kind === "reimbursement" && /\bnao\s+(?:existe|ha)\s+(?:qualquer\s+)?reembolso$/u.test(clause)) return true;
  if (kind === "tax" && /\bnao\s+(?:posso|podemos)\s+(?:afirmar|garantir|confirmar)\s+que\s+(?:sera|seja|e)\s+(?:possivel\s+)?$/u.test(`${clause} `)) return true;
  return false;
}

const CLAIMS = Object.freeze({
  consultation_credit: {
    predicate: /\b(?:abatid[oa]|descontad[oa]|creditad[oa]|devolvid[oa]|reembolsad[oa]|(?:vira|entra\s+como|fica\s+como)\s+(?:credito|desconto))\b/g,
    relevant: (before, _after, predicate) => /^(?:vira|entra|fica)\b/u.test(predicate)
      ? /\bconsulta\b[\s\S]{0,100}$/u.test(before)
      : /\b(?:valor|preco|investimento)\s+da\s+consulta\b[\s\S]{0,100}$/u.test(before),
  },
  tax: {
    predicate: /\b(?:abatimento|abater|deduzir|deducao)\b/g,
    // A later clause can retain the tax topic even after an explicit denial.
    // Reassess every predicate; a denied first claim never clears the next one.
    relevant: (before, after) => /^[\s\S]{0,60}\b(?:ir|imposto\s+de\s+renda)\b/u.test(after) ||
      /\b(?:ir|imposto\s+de\s+renda)\b[\s\S]{0,100}$/u.test(before),
  },
  reimbursement: {
    predicate: /\b(?:garante|garantido|certamente|com\s+certeza|integral|total)\b/g,
    relevant: (before, after, predicate) => /\breembolso\b[\s\S]{0,60}$/u.test(before) ||
      (!/^(?:integral|total)$/u.test(predicate) && /^[\s\S]{0,60}\breembolso\b/u.test(after)),
  },
  appointment: {
    predicate: /\b(?:confirmad[oa]|marcad[oa]|agendad[oa]|reservad[oa])\b/g,
    relevant: before => /\b(?:consulta|agendamento|horario|data|vaga)\b[\s\S]{0,100}$/u.test(before),
  },
  insurance: {
    predicate: /\b(?:atende(?:mos)?|aceita(?:mos)?|trabalha(?:mos)?)\s+(?:(?:por|com|pelo|pelos|o|os)\s+)?(?:convenios?|planos?(?:\s+de\s+saude)?)\b/g,
    relevant: () => true,
  },
});

function protectedClaims(value, kind) {
  const text = normalized(value);
  const definition = CLAIMS[kind];
  if (!definition) return [];
  return [...text.matchAll(definition.predicate)].flatMap(match => {
    const before = text.slice(Math.max(0, match.index - 160), match.index);
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 100);
    if (!definition.relevant(before, after, match[0])) return [];
    return [explicitlyDenied(before, kind) ? "denied" : "asserted"];
  });
}

export function hasAssertedProtectedClaim(value, kind) {
  return protectedClaims(value, kind).includes("asserted");
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function brlLiteral(number, scale = "", beforeSign = "", afterSign = "") {
  // Brazilian syntax only. Ambiguous foreign separators remain exact literals.
  if (beforeSign && afterSign || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/u.test(number)) return `raw:${beforeSign}:${afterSign}:${number}:${scale}`;
  const [integer, decimal = ""] = number.replaceAll(".", "").split(",");
  const sign = /[-−]/u.test(beforeSign || afterSign) ? "negative" : "positive";
  return `${sign}:${BigInt(integer) * 100n + BigInt(decimal.padEnd(2, "0"))}:${scale}`;
}

const UNITS = Object.freeze({
  dia: "day", dias: "day", semana: "week", semanas: "week", mes: "month", meses: "month",
  ano: "year", anos: "year", hora: "hour", horas: "hour", minuto: "minute", minutos: "minute",
  segundo: "second", segundos: "second", "%": "percent",
});

function protectedFacts(value) {
  const text = String(value || "");
  const links = sortedUnique(text.match(/https?:\/\/[^\s<>]+/g) || []);
  const currencies = [];
  const nonMonetary = text.replace(/https?:\/\/[^\s<>]+/g, " ").replace(
    /([+\-−]?)\s*R\$\s*([+\-−]?)\s*(\d+(?:[.,]\d+)*)(?:\s*(mil|milh[aã]o|milh[oõ]es|k|mi)\b)?(?!\d|[.,]\d|[a-z])/giu,
    (_match, beforeSign, afterSign, number, scale) => { currencies.push(brlLiteral(number, normalized(scale), beforeSign, afterSign)); return " "; },
  );
  const quantities = [];
  const quantityPattern = /\b(\d+(?:[.,]\d+)?)(?:\s*(?:a|ate|e|[-–])\s*(\d+(?:[.,]\d+)?))?\s*(dias?|semanas?|mes(?:es)?|anos?|horas?|minutos?|segundos?|%)(?=\s|[.,;!?]|$)/gu;
  for (const match of normalized(nonMonetary).matchAll(quantityPattern)) {
    for (const number of [match[1], match[2]].filter(Boolean)) quantities.push(`${number}:${UNITS[match[3]]}`);
  }
  return JSON.stringify({
    links,
    // Preserve occurrence count and order: formatting equivalence must not
    // hide a second charge, remove a charge or swap amounts between subjects.
    currencies,
    numbers: sortedUnique(nonMonetary.match(/\d+(?:[.,]\d+)*/g) || []),
    quantities: sortedUnique(quantities),
    // Protect explicit assertions/denials in these bounded domains, without
    // pretending to check every clinical or institutional fact semantically.
    claims: Object.fromEntries(Object.keys(CLAIMS).map(kind => [kind, sortedUnique(protectedClaims(text, kind))])),
  });
}

export function preservesProtectedFacts(draft, source) {
  return protectedFacts(draft) === protectedFacts(source);
}
