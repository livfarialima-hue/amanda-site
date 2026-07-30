import { isLikelyMarketingPrefilledMessage } from "./whatsapp-automation.mjs";

const SITE_BASE_URL = "https://draamandaschroeder.com.br";

const PROCEDURE_PAGES = Object.freeze({
  lifting_facial: ["Lifting facial", "/lifting-facial/"],
  lifting_cervical: ["Lifting cervical", "/lifting-cervical/"],
  blefaroplastia: ["Blefaroplastia", "/blefaroplastia/"],
  otoplastia: ["Otoplastia", "/otoplastia/"],
  avaliacao_facial: ["Avaliação facial", "/avaliacao-facial/"],
  lip_lifting: ["Lifting labial", "/lip-lifting/"],
  lipo_papada: ["Lipo de papada", "/lipo-de-papada/"],
  lipoaspiracao: ["Lipoaspiração", "/lipoaspiracao/"],
  abdominoplastia: ["Abdominoplastia", "/abdominoplastia/"],
  mastopexia: ["Mastopexia", "/mastopexia/"],
  protese_mama: ["Prótese de mama", "/protese-de-mama/"],
  mamoplastia_redutora: [
    "Mamoplastia redutora",
    "/mamoplastia-redutora/",
  ],
  braquioplastia: ["Braquioplastia", "/braquioplastia/"],
  ninfoplastia: ["Ninfoplastia", "/ninfoplastia/"],
  contorno_corporal: ["Contorno corporal", "/contorno-corporal/"],
  cirurgias_combinadas: ["Procedimentos", "/procedimentos/"],
});

const PROCEDURES_WITH_RESULTS = new Set([
  "lifting_facial",
  "lifting_cervical",
  "blefaroplastia",
  "otoplastia",
  "lipo_papada",
  "abdominoplastia",
  "mastopexia",
  "protese_mama",
  "mamoplastia_redutora",
  "contorno_corporal",
]);

const TOPICAL_RESOURCES = Object.freeze([
  {
    title: "Recuperação do lifting facial e cervical",
    path: "/conteudos/recuperacao-lifting-facial/",
    context:
      "Leitura educativa sobre edema, rotina, apoio e retornos na recuperação.",
    procedures: ["lifting_facial", "lifting_cervical"],
    pattern:
      /\b(?:recupera[cç][aã]o|p[oó]s[- ]operat[oó]rio|voltar\s+ao\s+trabalho|tempo\s+de\s+recupera[cç][aã]o|incha[cç]o)\b/i,
  },
  {
    title: "Lifting facial ou procedimentos injetáveis",
    path: "/conteudos/lifting-facial-ou-injetaveis/",
    context:
      "Comparação educativa entre cirurgia e procedimentos injetáveis, sem substituir a avaliação.",
    procedures: ["lifting_facial", "avaliacao_facial"],
    pattern:
      /\b(?:(?:lifting|cirurgia).{0,45}(?:botox|toxina|preenchimento|bioestimulador|injet[aá]ve)|(?:botox|toxina|preenchimento|bioestimulador|injet[aá]ve).{0,45}(?:lifting|cirurgia))\b/i,
  },
  {
    title: "Blefaroplastia e aspecto cansado",
    path: "/conteudos/blefaroplastia-quando-faz-sentido/",
    context:
      "Leitura educativa sobre pálpebras, bolsas, sobrancelhas, sulcos e qualidade da pele.",
    procedures: ["blefaroplastia"],
    pattern:
      /\b(?:aspecto|olhar|rosto)\s+cansad[oa]\b|\b(?:bolsas?|olheiras?|p[aá]lpebras?)\b/i,
  },
  {
    title: "Papada e contorno cervical",
    path: "/conteudos/papada-contorno-cervical/",
    context:
      "Leitura educativa sobre as diferentes estruturas que podem alterar papada, mandíbula e pescoço.",
    procedures: ["lipo_papada", "lifting_cervical", "avaliacao_facial"],
    pattern:
      /\b(?:papada|contorno\s+(?:do\s+)?pesco[cç]o|linha\s+da\s+mand[ií]bula|mand[ií]bula\s+apagada)\b/i,
  },
  {
    title: "Lipoaspiração ou abdominoplastia",
    path: "/conteudos/lipoaspiracao-ou-abdominoplastia/",
    context:
      "Comparação educativa entre gordura localizada, excesso de pele e alterações da parede abdominal.",
    procedures: ["lipoaspiracao", "abdominoplastia", "contorno_corporal"],
    pattern:
      /\b(?:(?:lipo|lipoaspira[cç][aã]o).{0,40}abdominoplastia|abdominoplastia.{0,40}(?:lipo|lipoaspira[cç][aã]o))\b/i,
  },
  {
    title: "Mastopexia com ou sem prótese",
    path: "/conteudos/mastopexia-com-ou-sem-protese/",
    context:
      "Leitura educativa sobre elevação das mamas, volume e situações em que a prótese entra ou não no planejamento.",
    procedures: ["mastopexia", "protese_mama"],
    pattern:
      /\b(?:mastopexia|levantar?\s+(?:as\s+)?mamas?).{0,45}(?:pr[oó]tese|silicone)\b|\b(?:pr[oó]tese|silicone).{0,45}mastopexia\b/i,
  },
  {
    title: "Como escolher a prótese de mama",
    path: "/conteudos/como-escolher-protese-de-mama/",
    context:
      "Leitura educativa sobre perfil, volume, proporções e limites da escolha de implantes.",
    procedures: ["protese_mama"],
    pattern:
      /\b(?:tamanho|perfil|volume|formato|escolher?|qual).{0,35}(?:pr[oó]tese|silicone|implante)\b|\b(?:pr[oó]tese|silicone|implante).{0,35}(?:tamanho|perfil|volume|formato)\b/i,
  },
  {
    title: "Cicatrizes em cirurgia de mama",
    path: "/conteudos/cicatrizes-cirurgia-de-mama/",
    context:
      "Leitura educativa sobre padrões de cicatriz e fatores que influenciam sua evolução.",
    procedures: [
      "mastopexia",
      "protese_mama",
      "mamoplastia_redutora",
    ],
    pattern:
      /\b(?:cicatriz|cicatrizes|marca).{0,45}(?:mama|seio|mastopexia|pr[oó]tese|redu[cç][aã]o)\b|\b(?:mama|seio|mastopexia|pr[oó]tese|redu[cç][aã]o).{0,45}(?:cicatriz|cicatrizes|marca)\b/i,
  },
  {
    title: "Cirurgia plástica após emagrecimento",
    path: "/conteudos/cirurgia-plastica-apos-emagrecimento/",
    context:
      "Leitura educativa sobre prioridades, etapas e planejamento depois de grande perda de peso.",
    procedures: [
      "contorno_corporal",
      "abdominoplastia",
      "braquioplastia",
      "mastopexia",
      "cirurgias_combinadas",
    ],
    pattern:
      /\b(?:ap[oó]s|depois\s+d[aeo]|p[oó]s)[ -]?(?:emagrecimento|bari[aá]trica)|\b(?:perdi\s+(?:muito\s+)?peso|emagreci(?:\s+muito)?)\b/i,
  },
  {
    title: "Botox, preenchimento e bioestimulador",
    path: "/conteudos/botox-preenchimento-bioestimulador/",
    context:
      "Comparação educativa entre procedimentos injetáveis que tratam componentes diferentes.",
    procedures: ["avaliacao_facial"],
    pattern:
      /\b(?:botox|toxina|preenchimento|bioestimulador).{0,45}(?:diferen[cç]a|qual|melhor|indicado)|\b(?:diferen[cç]a|qual|melhor).{0,45}(?:botox|toxina|preenchimento|bioestimulador)\b/i,
  },
  {
    title: "Lipoenxertia facial",
    path: "/conteudos/lipoenxertia-facial/",
    context:
      "Leitura educativa sobre uso de gordura, volume facial e planejamento individual.",
    procedures: ["lifting_facial", "avaliacao_facial"],
    pattern:
      /\b(?:lipoenxertia|enxerto\s+de\s+gordura|gordura\s+no\s+rosto|volume\s+facial)\b/i,
  },
  {
    title: "Naturalidade e envelhecimento",
    path: "/conteudos/naturalidade-envelhecimento/",
    context:
      "Leitura educativa sobre identidade, proporções e limites no planejamento facial.",
    procedures: [
      "lifting_facial",
      "lifting_cervical",
      "blefaroplastia",
      "avaliacao_facial",
      "lip_lifting",
      "lipo_papada",
    ],
    pattern:
      /\b(?:artificial|esticad[oa]|exagerad[oa]|naturalidade|n[aã]o\s+parecer\s+eu|perder\s+(?:a\s+)?express[aã]o)\b/i,
  },
  {
    title: "Cuidados com a cicatrização",
    path: "/conteudos/cuidados-cicatrizacao-cirurgia/",
    context:
      "Leitura educativa geral sobre evolução e cuidados com cicatrizes cirúrgicas.",
    pattern: /\b(?:cicatriz|cicatrizes|cicatriza[cç][aã]o|quel[oó]ide)\b/i,
  },
  {
    title: "Segurança em cirurgia plástica",
    path: "/conteudos/seguranca-cirurgia-plastica/",
    context:
      "Leitura educativa sobre avaliação, estrutura, equipe e planejamento de segurança.",
    pattern:
      /\b(?:seguran[cç]a|medo\s+da\s+cirurgia|risco|riscos|anestesia|hospital)\b/i,
  },
  {
    title: "Como funciona a consulta de cirurgia plástica",
    path: "/conteudos/consulta-cirurgia-plastica/",
    context:
      "Leitura educativa sobre objetivos, exame, limites, planejamento e próximos passos da consulta.",
    pattern:
      /\b(?:como\s+funciona|o\s+que\s+acontece|o\s+que\s+[eé]\s+feito).{0,35}(?:consulta|avalia[cç][aã]o)\b/i,
  },
]);

const GENERAL_SITE_RESOURCE = Object.freeze({
  title: "Dra. Amanda Schroeder",
  url: `${SITE_BASE_URL}/`,
  context:
    "Página geral com formação, foco de atuação, clínica e acesso aos procedimentos.",
});

const WEBSITE_REFERENCE_CATEGORIES = new Set([
  "site_cta",
  "site_page",
  "site_uncoded",
]);

function absoluteUrl(path) {
  return `${SITE_BASE_URL}${path}`;
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    return url.toString();
  } catch {
    return String(value || "").split("#")[0];
  }
}

function sharedSiteUrls(recentConversation) {
  const urls = new Set();

  for (const turn of Array.isArray(recentConversation)
    ? recentConversation
    : []) {
    const matches = String(turn?.text || "").match(
      /https?:\/\/(?:www\.)?draamandaschroeder\.com\.br\/[^\s)\]}>,]*/gi,
    );

    for (const match of matches || []) {
      urls.add(canonicalUrl(match));
    }
  }

  return urls;
}

export function isDirectSiteRequest(currentMessage) {
  const text = String(currentMessage || "");

  return (
    /\b(?:site|website|link|p[aá]gina|endere[cç]o\s+eletr[oô]nico)\b/i.test(
      text,
    ) ||
    /\b(?:material|conte[uú]do|leitura|artigo|foto|fotos|casos?|resultados?)\b.{0,45}\b(?:manda|mandar|envia|enviar|ver|mostrar|tem|teria|gostaria)\b/i.test(
      text,
    ) ||
    /\b(?:manda|mandar|envia|enviar|ver|mostrar|tem|teria|gostaria)\b.{0,45}\b(?:material|conte[uú]do|leitura|artigo|foto|fotos|casos?|resultados?)\b/i.test(
      text,
    ) ||
    /\bantes\s+e\s+depois\b/i.test(text)
  );
}

function foldConversationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isPatientTurn(turn) {
  return (
    ["patient", "user"].includes(String(turn?.role || "")) ||
    String(turn?.source || "") === "patient"
  );
}

function isClinicTurn(turn) {
  return (
    String(turn?.role || "") === "assistant" ||
    ["bruna", "equipe_humana"].includes(
      String(turn?.source || ""),
    )
  );
}

function isMeaningfulPatientReply(text) {
  const normalized = foldConversationText(text);

  if (!normalized || normalized.length < 8) return false;
  if (isLikelyMarketingPrefilledMessage({ text })) return false;

  return !/^(?:oi|ola|sim|nao|ok|certo|entendi|obrigad[oa]|perfeito|combinado|tudo bem|ta bom|beleza)[!,. ]*$/i.test(
    normalized,
  );
}

function isBlockedProactiveLinkMoment(text) {
  const normalized = foldConversationText(text);

  return (
    /\b(?:preco|valor|quanto custa|quanto fica|media|orcamento)\b/i.test(
      normalized,
    ) ||
    /\b(?:agenda|agendar|agendamento|marcar|horarios?|disponibilidade|datas?|amanha|manha|tarde|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado|domingo)\b/i.test(
      normalized,
    ) ||
    /\b(?:as\s+)?\d{1,2}(?::\d{2}|h(?:\d{2})?)\b/i.test(
      normalized,
    ) ||
    /\b(?:hospital|confirmar|confirmacao|retorno da equipe|aguardando retorno)\b/i.test(
      normalized,
    ) ||
    /\b(?:vou pensar|depois eu volto|entro em contato|qualquer coisa volto|nao tenho interesse|deixa para depois)\b/i.test(
      normalized,
    ) ||
    /\b(?:odeio|detesto).{0,35}\b(?:meu rosto|minha face|minha aparencia|meu corpo)\b/i.test(
      normalized,
    ) ||
    /\b(?:aparencia|meu rosto|minha face|meu corpo).{0,45}\b(?:arruinou|acabou com).{0,20}\bminha vida\b/i.test(
      normalized,
    )
  );
}

function isConsultationInformationQuestion(text) {
  const normalized = foldConversationText(text);

  return (
    /\b(?:como funciona|o que acontece|o que e feito).{0,45}\b(?:consulta|avaliacao)\b/i.test(
      normalized,
    ) ||
    /\b(?:consulta|avaliacao)\b.{0,45}\bcomo funciona\b/i.test(
      normalized,
    )
  );
}

function asksForResults(currentMessage) {
  return /\b(?:antes\s+e\s+depois|casos?\s+reais|fotos?\s+de\s+resultados?|ver\s+resultados?)\b/i.test(
    String(currentMessage || ""),
  );
}

function procedureMatches(resource, procedure) {
  return (
    !Array.isArray(resource.procedures) ||
    !resource.procedures.length ||
    resource.procedures.includes(procedure)
  );
}

function resultResource(procedure) {
  const page = PROCEDURE_PAGES[procedure];
  if (!page || !PROCEDURES_WITH_RESULTS.has(procedure)) return null;

  return {
    title: `Resultados reais de ${page[0].toLocaleLowerCase("pt-BR")}`,
    url: `${absoluteUrl(page[1])}#resultados`,
    context:
      "Seção com casos reais e antes e depois em contexto educativo, sem garantia de resultado semelhante.",
  };
}

function topicalResources(procedure, currentMessage) {
  return TOPICAL_RESOURCES.filter(
    (resource) =>
      procedureMatches(resource, procedure) &&
      resource.pattern.test(String(currentMessage || "")),
  ).map((resource) => ({
    title: resource.title,
    url: absoluteUrl(resource.path),
    context: resource.context,
  }));
}

function procedureResource(procedure) {
  const page = PROCEDURE_PAGES[procedure];
  if (!page) return null;

  const hasResults = PROCEDURES_WITH_RESULTS.has(procedure);

  return {
    title: page[0],
    url: absoluteUrl(page[1]),
    context: hasResults
      ? "Página completa do procedimento, com explicações, consulta, recuperação, dúvidas e casos reais com antes e depois."
      : "Página completa do procedimento, com explicações, consulta, recuperação e dúvidas frequentes.",
  };
}

export function cameFromWebsite(referenceCategory) {
  return WEBSITE_REFERENCE_CATEGORIES.has(
    String(referenceCategory || "").trim().toLowerCase(),
  );
}

export function getRecommendedSiteResource({
  procedure,
  referenceCategory,
  recentConversation,
  currentMessage,
}) {
  if (cameFromWebsite(referenceCategory)) return null;

  const conversation = Array.isArray(recentConversation)
    ? recentConversation
    : [];
  const sharedUrls = sharedSiteUrls(conversation);
  const directRequest = isDirectSiteRequest(currentMessage);

  if (!directRequest) {
    const hasClinicReply = conversation.some(isClinicTurn);
    const hasEarlierMeaningfulPatientReply = conversation.some(
      (turn) =>
        isPatientTurn(turn) &&
        isMeaningfulPatientReply(turn?.text),
    );

    if (!hasClinicReply) return null;
    if (!isMeaningfulPatientReply(currentMessage)) return null;
    if (isBlockedProactiveLinkMoment(currentMessage)) return null;
    if (
      isConsultationInformationQuestion(currentMessage) &&
      !hasEarlierMeaningfulPatientReply
    ) {
      return null;
    }
  }

  if (sharedUrls.size && !directRequest) return null;

  const procedureKey = String(procedure || "");
  const requestedResults = asksForResults(currentMessage);
  const approvedResultsResource = requestedResults
    ? resultResource(procedureKey)
    : null;

  if (requestedResults && !approvedResultsResource) return null;

  const mainProcedureResource = procedureResource(procedureKey);
  const topical = topicalResources(procedureKey, currentMessage);
  const genericConsultationResources = topical.filter((resource) =>
    /\/conteudos\/consulta-cirurgia-plastica\/$/i.test(resource.url),
  );
  const specificTopicalResources = topical.filter(
    (resource) =>
      !/\/conteudos\/consulta-cirurgia-plastica\/$/i.test(resource.url),
  );
  const candidates = [
    approvedResultsResource,
    ...specificTopicalResources,
    mainProcedureResource,
    ...genericConsultationResources,
    ...(!mainProcedureResource ? [{ ...GENERAL_SITE_RESOURCE }] : []),
  ].filter(Boolean);

  return (
    candidates.find(
      (candidate) => !sharedUrls.has(canonicalUrl(candidate.url)),
    ) || null
  );
}
