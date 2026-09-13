// Numeric permission is independent of the internal reference table.
const AUTOMATIC_PROCEDURES = new Set(['lifting_facial', 'lifting_cervical', 'otoplastia']);
export function isAutomaticSurgicalPriceProcedure(procedure) {
  return AUTOMATIC_PROCEDURES.has(procedure);
}

export const APPROVED_SURGICAL_RANGE_PATTERNS = Object.freeze({
  mini: /minilifting[^\d\n]{0,100}R\$\s*18\s*mil\s+e\s+R\$\s*25\s*mil/i,
  facial: /lifting\s+facial[^\d\n]{0,100}R\$\s*26\s*mil\s+e\s+R\$\s*42\s*mil/i,
  cervical: /cervicoplastia(?:\s*\(lifting\s+cervical\))?[^\d\n]{0,180}R\$\s*18\s*mil\s+e\s+R\$\s*26\s*mil/i,
  otoplasty: /otoplastia[^\d\n]{0,180}R\$\s*8\s*mil\s+e\s+R\$\s*14\s*mil/i,
});

export function containsApprovedSurgicalRange(body, procedure) {
  const p = APPROVED_SURGICAL_RANGE_PATTERNS;
  if (procedure === 'lifting_facial') return p.mini.test(body) || p.facial.test(body);
  if (procedure === 'lifting_cervical') return p.cervical.test(body);
  if (procedure === 'otoplastia') return p.otoplasty.test(body);
  return false;
}

export function hasOnlyApprovedSurgicalAmounts(body) {
  // Remove at most one of each authorized range; every remaining monetary value
  // is rejected, including duplicated ranges and amounts without the R$ prefix.
  let remaining = String(body || '');
  const groups = ['lifting_facial', 'lifting_cervical', 'otoplastia']
    .filter(procedure => containsApprovedSurgicalRange(remaining, procedure));
  if (groups.length !== 1) return false;
  for (const pattern of Object.values(APPROVED_SURGICAL_RANGE_PATTERNS)) {
    remaining = remaining.replace(pattern, '');
  }
  return !/R\$|\b\d[\d.,]*\s*(?:mil|reais)\b/i.test(remaining);
}

export function facialPriceLines(currentText, recentConversation = []) {
  const patientTurns = (Array.isArray(recentConversation) ? recentConversation : [])
    .filter(t => t?.role === 'user' || t?.source === 'paciente');
  const context = [String(currentText || ''), ...patientTurns.slice().reverse().map(t => String(t.text || ''))]
    .find(t => /\bminilifting\b|\blifting\s+facial\b/i.test(t)) || '';
  const mini = /\bminilifting\b/i.test(context);
  const facial = /\blifting\s+facial\b/i.test(context);
  return [
    (!facial || mini) && '• Minilifting: entre R$ 18 mil e R$ 25 mil',
    (!mini || facial) && '• Lifting facial: entre R$ 26 mil e R$ 42 mil',
  ].filter(Boolean);
}
