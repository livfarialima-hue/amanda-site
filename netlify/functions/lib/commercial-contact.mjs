const COMMERCIAL_SOLICITATION_PATTERNS = [
  /\b(?:proposta|contato)\s+(?:comercial|de\s+parceria)\b/i,
  /\b(?:propor|fazer)\s+(?:uma\s+)?parceria\b/i,
  /\b(?:gostaria|queria|venho)\s+(?:de\s+)?(?:apresentar|oferecer)\s+(?:nossos?|meus?)\s+(?:servicos?|produtos?|solucoes?)\b/i,
  /\b(?:somos|falo\s+da)\s+(?:uma\s+)?(?:agencia|empresa|fornecedora?|representante)\b/i,
  /\b(?:gestao\s+de\s+trafego|social\s+media|marketing\s+digital|seo|criacao\s+de\s+sites?)\b/i,
  /\b(?:gestao|otimizacao)\s+(?:e\s+(?:gestao|otimizacao)\s+)?d[oa]\s+(?:perfil\s+da\s+empresa|google\s+meu\s+negocio|google\s+business\s+profile)\b/i,
  /\b(?:perfil\s+da\s+empresa\s+no\s+google|google\s+meu\s+negocio|google\s+business\s+profile)\b/i,
  /\b(?:google|google\s+maps)\b.{0,90}\b(?:visibilidade|posicionamento|captacao|atrair|conquistar)\b.{0,55}\b(?:clientes|pacientes|agendamentos?)\b/i,
  /\b(?:visibilidade|posicionamento|captacao|atrair|conquistar)\b.{0,55}\b(?:clientes|pacientes|agendamentos?)\b.{0,90}\b(?:google|google\s+maps|buscas?)\b/i,
  /\b(?:aumentar|captar)\s+(?:seus?\s+)?(?:seguidores|clientes|pacientes|vendas)\b/i,
  /\b(?:sou|somos)\s+fundador(?:a|es)?\s+d[oa]\b.{0,120}\b(?:temos?\s+paciente\s+buscando|pagina\s+de\s+agendamento|portal)\b/i,
  /\btemos?\s+paciente\s+buscando\b.{0,120}\b(?:enviar|mandar|compartilhar)\s+(?:a\s+)?pagina\s+de\s+agendamento\b/i,
  /\bpresenca\s+digital\b.{0,160}\b(?:novos?\s+pacientes?|pacientes?\s+pelo\s+google)\b/i,
  /\b(?:novos?\s+pacientes?|pacientes?\s+pelo\s+google)\b.{0,160}\b(?:presenca\s+digital|google)\b/i,
  /\bconversa\s+(?:rapida\s+)?de\s+15\s+minutos\b.{0,160}\b(?:clinica|google|pacientes?)\b/i,
  /\b(?:publipost|permuta|patrocinio|parceria\s+(?:paga|comercial|de\s+divulgacao))\b/i,
  /\b(?:maquininha|maquina)\s+de\s+cartao\b/i,
  /\b(?:trabalho|represento|atuo)\s+com\s+(?:seguros?|planos?\s+de\s+saude)\b/i,
  /\b(?:quero|gostaria|posso)\s+(?:de\s+)?(?:vender|oferecer|apresentar)\s+(?:um\s+)?(?:seguro|plano\s+de\s+saude)\b/i,
  /\b(?:procuro|busco|quero|gostaria\s+de)\s+(?:uma\s+)?(?:vaga|emprego|oportunidade\s+de\s+trabalho)\b/i,
  /\b(?:estao|tem|ha)\s+(?:com\s+)?(?:vaga|vagas|contratando)\b/i,
  /\b(?:posso|gostaria\s+de|quero)\s+(?:enviar|mandar|encaminhar)\s+(?:meu\s+)?curriculo\b/i,
  /\bcurriculo\b.{0,60}\b(?:vaga|emprego|trabalho|contratacao)\b/i,
];

const BUSINESS_SELF_INTRO_PATTERN =
  /\b(?:sou|aqui\s+e|meu\s+nome\s+e|falo\s+(?:da|em\s+nome\s+da)|somos)\b.{0,100}\b(?:clinica|empresa|agencia|laboratorio|hospital|consultorio|centro|marca|fornecedor|representante)\b/i;
const PROMOTIONAL_SIGNAL_PATTERN =
  /\b(?:novidade|inauguracao|condicao\s+especial|promocao|oferta\s+especial|desconto\s+especial|pacote\s+promocional)\b/i;
const SELLER_CALL_TO_ACTION_PATTERN =
  /\b(?:quer\s+que\s+eu|posso\s+(?:te|lhe)|gostaria\s+de)\b.{0,140}\b(?:enviar|envie|mandar|mande|apresentar|explique|explicar|mostrar|mostre)\b.{0,100}\b(?:valores?|precos?|condicoes?|servicos?|produtos?|solucoes?|tratamentos?|pacotes?)\b/i;
const BUSINESS_OFFER_PATTERN =
  /\b(?:agora\s+)?temos\b.{0,160}\b(?:servico|tratamento|equipamento|solucao|produto|camara|pacote|sessoes?)\b/i;
const EXPLICIT_PERSONAL_CARE_INTENT_PATTERN =
  /\b(?:quero|queria|gostaria|preciso|tenho\s+interesse)\b.{0,120}\b(?:marcar|agendar|fazer|realizar|passar\s+por|uma\s+consulta|uma\s+avaliacao|ser\s+avaliad[oa]|me\s+consultar|operar)\b/i;

export const COMMERCIAL_MEDIA_CONTEXT_MAX_AGE_MS = 30 * 60 * 1_000;

function normalizeCommercialText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isCommercialSolicitation(value) {
  const normalized = normalizeCommercialText(value);
  if (!normalized) return false;

  if (
    COMMERCIAL_SOLICITATION_PATTERNS.some((pattern) =>
      pattern.test(normalized),
    )
  ) {
    return true;
  }

  const businessIdentified = BUSINESS_SELF_INTRO_PATTERN.test(normalized);
  const promotionalIntent =
    PROMOTIONAL_SIGNAL_PATTERN.test(normalized) ||
    SELLER_CALL_TO_ACTION_PATTERN.test(normalized) ||
    BUSINESS_OFFER_PATTERN.test(normalized);
  const explicitBusinessOffer =
    BUSINESS_OFFER_PATTERN.test(normalized) &&
    (PROMOTIONAL_SIGNAL_PATTERN.test(normalized) ||
      SELLER_CALL_TO_ACTION_PATTERN.test(normalized));
  const explicitPersonalCareIntent =
    EXPLICIT_PERSONAL_CARE_INTENT_PATTERN.test(normalized);

  return Boolean(
    !explicitPersonalCareIntent &&
      ((businessIdentified && promotionalIntent) || explicitBusinessOffer),
  );
}

export function hasRecentCommercialSolicitationContext(
  turns,
  {
    at,
    maxAgeMs = COMMERCIAL_MEDIA_CONTEXT_MAX_AGE_MS,
  } = {},
) {
  const referenceAt = new Date(at || Date.now()).getTime();
  if (!Number.isFinite(referenceAt)) return false;

  const latestPatientTurn = (Array.isArray(turns) ? turns : [])
    .slice()
    .reverse()
    .find(
      (turn) =>
        turn?.role === "user" &&
        String(turn?.text || "").trim(),
    );
  if (!latestPatientTurn) return false;

  const turnAt = new Date(latestPatientTurn.at || "").getTime();
  if (!Number.isFinite(turnAt)) return false;

  const ageMs = referenceAt - turnAt;
  if (ageMs < -2 * 60 * 1_000 || ageMs > maxAgeMs) return false;

  return isCommercialSolicitation(latestPatientTurn.text);
}
