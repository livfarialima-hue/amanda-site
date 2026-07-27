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

const WEBSITE_REFERENCE_CATEGORIES = new Set([
  "site_cta",
  "site_page",
  "site_uncoded",
]);

function conversationAlreadyHasSiteLink(recentConversation) {
  return (Array.isArray(recentConversation) ? recentConversation : [])
    .some((turn) =>
      /https?:\/\/(?:www\.)?draamandaschroeder\.com\.br\//i.test(
        String(turn?.text || ""),
      ),
    );
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
}) {
  if (
    cameFromWebsite(referenceCategory) ||
    conversationAlreadyHasSiteLink(recentConversation)
  ) {
    return null;
  }

  const page = PROCEDURE_PAGES[String(procedure || "")];
  if (!page) return null;

  return {
    title: page[0],
    url: `${SITE_BASE_URL}${page[1]}`,
  };
}
