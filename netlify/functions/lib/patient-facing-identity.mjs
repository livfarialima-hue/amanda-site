// One owner for truthful identity, shared by model selection and final dispatch.
export const BRUNA_INTRODUCTION = 'Eu sou a Bruna, assistente virtual da Clínica LIV Faria Lima.';

export function falseHumanIdentityReason(text) {
  const value=String(text || '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  if (/\b(?:nao sou|nao somos)\s+(?:(?:um|uma)\s+)?(?:robo|bot|automacao|assistente virtual|inteligencia artificial|ia)\b/.test(value) ||
      /(?<!nao )\b(?:sou|somos)\s+(?:(?:um|uma|a|o)\s+)?(?:pessoa(?: de verdade)?|human[ao]s?|medic[ao]|cirurgi[aã]o|dra\.? amanda|dr\.? daniel)\b/.test(value)) {
    return 'false_human_identity';
  }
  return '';
}
