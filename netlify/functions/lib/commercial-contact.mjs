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
  return Boolean(
    normalized &&
      COMMERCIAL_SOLICITATION_PATTERNS.some((pattern) =>
        pattern.test(normalized),
      ),
  );
}
