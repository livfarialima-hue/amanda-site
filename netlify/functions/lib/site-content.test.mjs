import assert from "node:assert/strict";
import test from "node:test";
import {
  cameFromWebsite,
  getRecommendedSiteResource,
} from "./site-content.mjs";

const RESEARCH_CONVERSATION = [
  { role: "assistant", text: "Você está começando a pesquisar?" },
  { role: "patient", text: "Sim, ainda estou pesquisando." },
];

test("offers the complete procedure page after the first meaningful exchange", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "blefaroplastia",
      referenceCategory: "whatsapp_uncoded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Quero conhecer melhor",
    }),
    {
      title: "Blefaroplastia",
      url: "https://draamandaschroeder.com.br/blefaroplastia/",
      context:
        "Página completa do procedimento, com explicações, consulta, recuperação, dúvidas e casos reais com antes e depois.",
    },
  );
});

test("does not offer a site link routinely in the first response", () => {
  assert.equal(
    getRecommendedSiteResource({
      procedure: "blefaroplastia",
      referenceCategory: "meta_uncoded",
      recentConversation: [],
      currentMessage: "Quero saber mais sobre blefaroplastia",
    }),
    null,
  );
});

test("answers a direct request for the site even in the first response", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "blefaroplastia",
      referenceCategory: "whatsapp_uncoded",
      recentConversation: [],
      currentMessage: "Qual é o link da página de blefaroplastia?",
    }),
    {
      title: "Blefaroplastia",
      url: "https://draamandaschroeder.com.br/blefaroplastia/",
      context:
        "Página completa do procedimento, com explicações, consulta, recuperação, dúvidas e casos reais com antes e depois.",
    },
  );
});

test("routes a results request directly to the educational before-and-after section", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "lifting_facial",
      referenceCategory: "google_coded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Tem fotos de antes e depois?",
    }),
    {
      title: "Resultados reais de lifting facial",
      url: "https://draamandaschroeder.com.br/lifting-facial/#resultados",
      context:
        "Seção com casos reais e antes e depois em contexto educativo, sem garantia de resultado semelhante.",
    },
  );
});

test("does not pretend to have a results section before the procedure is known", () => {
  assert.equal(
    getRecommendedSiteResource({
      procedure: null,
      referenceCategory: "whatsapp_uncoded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Tem fotos de antes e depois?",
    }),
    null,
  );
});

test("selects a specific recovery article instead of the generic procedure page", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "lifting_facial",
      referenceCategory: "meta_coded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Tenho dúvidas sobre o tempo de recuperação",
    }),
    {
      title: "Recuperação do lifting facial e cervical",
      url: "https://draamandaschroeder.com.br/conteudos/recuperacao-lifting-facial/",
      context:
        "Leitura educativa sobre edema, rotina, apoio e retornos na recuperação.",
    },
  );
});

test("selects a comparison article when the patient is deciding between approaches", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "lifting_facial",
      referenceCategory: "google_coded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Qual a diferença entre lifting e preenchimento?",
    }),
    {
      title: "Lifting facial ou procedimentos injetáveis",
      url: "https://draamandaschroeder.com.br/conteudos/lifting-facial-ou-injetaveis/",
      context:
        "Comparação educativa entre cirurgia e procedimentos injetáveis, sem substituir a avaliação.",
    },
  );
});

test("routes common objections and comparisons to the matching educational material", () => {
  const cases = [
    [
      "blefaroplastia",
      "Meu olhar parece cansado e tenho bolsas",
      "/conteudos/blefaroplastia-quando-faz-sentido/",
    ],
    [
      "lipo_papada",
      "Minha dúvida é sobre papada e contorno do pescoço",
      "/conteudos/papada-contorno-cervical/",
    ],
    [
      "abdominoplastia",
      "Qual a diferença entre lipo e abdominoplastia?",
      "/conteudos/lipoaspiracao-ou-abdominoplastia/",
    ],
    [
      "mastopexia",
      "Mastopexia precisa de prótese ou silicone?",
      "/conteudos/mastopexia-com-ou-sem-protese/",
    ],
    [
      "protese_mama",
      "Como escolher o tamanho da prótese?",
      "/conteudos/como-escolher-protese-de-mama/",
    ],
    [
      "mamoplastia_redutora",
      "Como fica a cicatriz na mama?",
      "/conteudos/cicatrizes-cirurgia-de-mama/",
    ],
    [
      "contorno_corporal",
      "Emagreci muito depois da bariátrica",
      "/conteudos/cirurgia-plastica-apos-emagrecimento/",
    ],
    [
      "avaliacao_facial",
      "Qual a diferença entre botox e preenchimento?",
      "/conteudos/botox-preenchimento-bioestimulador/",
    ],
    [
      "lifting_facial",
      "Tenho dúvida sobre enxerto de gordura no rosto",
      "/conteudos/lipoenxertia-facial/",
    ],
    [
      "lifting_facial",
      "Tenho medo de ficar com resultado artificial",
      "/conteudos/naturalidade-envelhecimento/",
    ],
    [
      "otoplastia",
      "Tenho tendência a queloide e penso na cicatriz",
      "/conteudos/cuidados-cicatrizacao-cirurgia/",
    ],
    [
      "abdominoplastia",
      "Tenho medo da cirurgia e queria entender a segurança",
      "/conteudos/seguranca-cirurgia-plastica/",
    ],
    [
      null,
      "Como funciona a consulta de cirurgia plástica?",
      "/conteudos/consulta-cirurgia-plastica/",
    ],
  ];

  for (const [procedure, currentMessage, expectedPath] of cases) {
    const resource = getRecommendedSiteResource({
      procedure,
      referenceCategory: "google_coded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage,
    });

    assert.equal(
      resource?.url,
      `https://draamandaschroeder.com.br${expectedPath}`,
      currentMessage,
    );
  }
});

test("does not offer the site to people who came from it", () => {
  for (const referenceCategory of [
    "site_cta",
    "site_page",
    "site_uncoded",
  ]) {
    assert.equal(cameFromWebsite(referenceCategory), true);
    assert.equal(
      getRecommendedSiteResource({
        procedure: "blefaroplastia",
        referenceCategory,
        recentConversation: RESEARCH_CONVERSATION,
        currentMessage: "Tem fotos de antes e depois?",
      }),
      null,
    );
  }
});

test("does not send a second proactive site link", () => {
  assert.equal(
    getRecommendedSiteResource({
      procedure: "lifting_facial",
      referenceCategory: "meta_uncoded",
      recentConversation: [
        {
          role: "assistant",
          text: "Veja https://draamandaschroeder.com.br/lifting-facial/",
        },
        { role: "patient", text: "Entendi, obrigada." },
      ],
      currentMessage: "Tenho um pouco de medo da recuperação",
    }),
    null,
  );
});

test("allows a different specific resource after an explicit request for more material", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "lifting_facial",
      referenceCategory: "meta_uncoded",
      recentConversation: [
        {
          role: "assistant",
          text: "Veja https://draamandaschroeder.com.br/lifting-facial/",
        },
        { role: "patient", text: "Li a página." },
      ],
      currentMessage: "Você tem algum material sobre a recuperação?",
    }),
    {
      title: "Recuperação do lifting facial e cervical",
      url: "https://draamandaschroeder.com.br/conteudos/recuperacao-lifting-facial/",
      context:
        "Leitura educativa sobre edema, rotina, apoio e retornos na recuperação.",
    },
  );
});

test("does not repeat the same page with a results anchor", () => {
  assert.equal(
    getRecommendedSiteResource({
      procedure: "lifting_facial",
      referenceCategory: "whatsapp_uncoded",
      recentConversation: [
        {
          role: "assistant",
          text: "Veja https://draamandaschroeder.com.br/lifting-facial/",
        },
      ],
      currentMessage: "Pode mandar o link com os antes e depois?",
    }),
    null,
  );
});

test("offers the general doctor page when the procedure is still unknown", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "procedimento_inexistente",
      referenceCategory: "whatsapp_uncoded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Ainda não sei qual procedimento",
    }),
    {
      title: "Dra. Amanda Schroeder",
      url: "https://draamandaschroeder.com.br/",
      context:
        "Página geral com formação, foco de atuação, clínica e acesso aos procedimentos.",
    },
  );
});

test("offers the general doctor page to a direct lead without a procedure", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: null,
      referenceCategory: "whatsapp_uncoded",
      recentConversation: RESEARCH_CONVERSATION,
      currentMessage: "Vim pela Dra. Amanda",
    }),
    {
      title: "Dra. Amanda Schroeder",
      url: "https://draamandaschroeder.com.br/",
      context:
        "Página geral com formação, foco de atuação, clínica e acesso aos procedimentos.",
    },
  );
});
