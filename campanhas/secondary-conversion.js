(function () {
  "use strict";

  var configurations = {
    "mastopexia": {
      label: "Mastopexia",
      title: "Na consulta, você descobre se a mastopexia pode ser feita sem prótese.",
      note: "A Dra. Amanda examina queda, volume e pele, explica as cicatrizes e compara as opções com você."
    },
    "mastopexia-com-protese": {
      label: "Mastopexia com prótese",
      title: "Na consulta, você entende se a prótese precisa fazer parte da mastopexia.",
      note: "Primeiro vem o exame da queda e dos tecidos. Depois, se houver indicação, são escolhidos o volume e a projeção do implante."
    },
    "protese-de-mama": {
      label: "Prótese de mama",
      title: "O tamanho da prótese é escolhido depois de medir a mama e o tórax.",
      note: "Suas referências ajudam a mostrar o resultado que você procura; o exame define quais opções são compatíveis com os seus tecidos."
    },
    "mamoplastia-redutora": {
      label: "Mamoplastia redutora",
      title: "Na consulta, você entende quanto pode ser reduzido e como podem ficar as cicatrizes.",
      note: "A Dra. Amanda relaciona peso, desconforto, medidas e tecidos antes de explicar as possibilidades."
    },
    "abdominoplastia": {
      label: "Abdominoplastia",
      title: "Na consulta, você entende se o incômodo vem da pele, da gordura ou da diástase.",
      note: "O exame mostra se há indicação de abdominoplastia, lipoaspiração, uma associação ou se é mais seguro adiar a cirurgia."
    },
    "lipoaspiracao": {
      label: "Lipoaspiração",
      title: "Na consulta, você descobre onde a lipo pode ajudar e como a pele pode reagir.",
      note: "A Dra. Amanda examina gordura, flacidez e proporções para definir as áreas e explicar quando a lipo sozinha não basta."
    },
    "pos-bariatrica": {
      label: "Cirurgia pós-bariátrica",
      title: "Na consulta, você entende por onde começar e quais áreas precisam esperar.",
      note: "A Dra. Amanda explica o que pode ser tratado primeiro, quais cicatrizes cada cirurgia deixa e como preparar a nutrição e a recuperação."
    },
    "braquioplastia": {
      label: "Braquioplastia",
      title: "Na consulta, você entende quanto o braço pode melhorar e onde pode ficar a cicatriz.",
      note: "A Dra. Amanda distingue pele de gordura, examina axilas e tórax e explica como será a recuperação."
    },
    "lip-lifting": {
      label: "lip lifting",
      brand: "Cirurgia Plástica Facial",
      title: "Confirme se a distância entre nariz e lábio — e não a falta de volume — é o que realmente pede tratamento.",
      note: "A avaliação considera proporções, sorriso em movimento, preenchimentos anteriores, cicatriz e alternativas antes de indicar cirurgia."
    },
    "ninfoplastia": {
      label: "ninfoplastia",
      brand: "Cirurgia Plástica Íntima",
      title: "Converse com privacidade sobre desconforto, assimetria, função e o que você deseja preservar.",
      note: "Não existe um padrão íntimo correto. A indicação precisa partir da sua queixa, da anatomia e de expectativas proporcionais."
    }
  };

  var consultationCopyProcedures = {
    "mastopexia": true,
    "mastopexia-com-protese": true,
    "protese-de-mama": true,
    "mamoplastia-redutora": true,
    "abdominoplastia": true,
    "lipoaspiracao": true,
    "pos-bariatrica": true,
    "braquioplastia": true
  };

  function locationFor(link) {
    if (link.closest("header")) return "header";
    if (link.closest(".hero")) return "hero";
    if (link.closest("#consulta")) return "consultation";
    if (link.closest(".cta")) return "final";
    if (link.classList.contains("whatsapp-float")) return "sticky";
    var section = link.closest("section");
    return section && (section.id || section.dataset.section) || "page";
  }

  function install() {
    var root = document.documentElement;
    var procedure = root.dataset.procedure || "";
    var config = configurations[procedure];
    if (!config || root.dataset.secondaryPremiumReady === "true") return;
    var usesConsultationCopy = !!consultationCopyProcedures[procedure];

    root.dataset.secondaryPremium = "true";
    root.dataset.secondaryPremiumReady = "true";
    document.body.classList.add("secondary-premium", "has-sticky");

    var brandLine = document.querySelector(".brand span");
    if (brandLine) {
      var brandContext = config.brand || (root.dataset.contentGroup === "mama" ? "Cirurgia Plástica de Mama" : "Contorno Corporal");
      brandLine.textContent = brandContext + " · Pinheiros";
    }

    var navCta = document.querySelector(".nav-cta[data-track='whatsapp']");
    if (navCta) navCta.textContent = usesConsultationCopy ? "Ver horários" : "Dúvidas e horários";

    var heroCta = document.querySelector(".hero-actions [data-track='whatsapp']");
    if (heroCta) heroCta.textContent = usesConsultationCopy ? "Ver horários da consulta" : "Ver horários para avaliação";

    var heroNote = document.querySelector(".hero-note");
    if (heroNote) heroNote.textContent = usesConsultationCopy
      ? "Consulta presencial particular: R$ 500 · Clínica LIV Faria Lima, em Pinheiros · CRM-SP 191605 · RQE 110472."
      : "Dra. Amanda Schroeder · CRM-SP 191605 · RQE 110472 · Membro da SBCP";

    document.querySelectorAll("a[data-track='whatsapp']").forEach(function (link) {
      link.dataset.ctaLocation = link.dataset.ctaLocation || locationFor(link);
    });

    var existing = document.querySelector(".secondary-practical");
    var anchor = document.querySelector(".contact-flow") || document.querySelector(".cta");
    var sourceLink = navCta || heroCta || document.querySelector("a[data-track='whatsapp']");
    if (!existing && anchor && sourceLink) {
      var practical = document.createElement("section");
      var practicalCtaAttributes = usesConsultationCopy ? ' data-original-reference="' + procedure + '"' : "";
      var practicalCtaLabel = usesConsultationCopy ? "Ver horários da consulta" : "Ver horários para avaliação de " + config.label.toLowerCase();
      practical.className = "secondary-practical";
      practical.dataset.section = "consultation_offer";
      practical.innerHTML =
        '<div class="container secondary-practical__grid">' +
          '<div><span class="eyebrow">Próximo passo</span><h2>' + config.title + '</h2><p>' + config.note + '</p>' +
          '<a class="btn" data-track="whatsapp" data-procedure="' + procedure + '"' + practicalCtaAttributes + ' data-cta-location="consultation_offer" href="' + sourceLink.href + '" target="_blank" rel="noopener">' + practicalCtaLabel + '</a></div>' +
          '<div class="secondary-practical__facts" aria-label="Informações da consulta">' +
            '<div><span>Consulta presencial</span><strong>R$ 500</strong></div>' +
            '<div><span>Pagamento</span><strong>Pix, débito ou parcelamento</strong></div>' +
            '<div><span>Documentação</span><strong>Nota fiscal emitida</strong></div>' +
            '<div><span>Local</span><strong>Clínica LIV Faria Lima · Pinheiros</strong></div>' +
          '</div>' +
        '</div>';
      anchor.insertAdjacentElement("beforebegin", practical);
    }

    var finalCta = document.querySelector(".cta [data-track='whatsapp']");
    if (finalCta) {
      finalCta.textContent = usesConsultationCopy ? "Ver horários da consulta" : "Ver horários para avaliação";
      finalCta.dataset.ctaLocation = "final";
    }

    var floating = document.querySelector(".whatsapp-float[data-track='whatsapp']");
    if (floating) {
      floating.textContent = usesConsultationCopy ? "Ver horários da consulta" : "Tirar dúvidas e ver horários";
      floating.dataset.ctaLocation = "sticky";
      floating.setAttribute("aria-label", usesConsultationCopy ? "Ver horários da consulta pelo WhatsApp" : "Tirar dúvidas e consultar horários pelo WhatsApp");
    }
  }

  function scheduleInstall() {
    window.setTimeout(install, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleInstall);
  else scheduleInstall();
}());
