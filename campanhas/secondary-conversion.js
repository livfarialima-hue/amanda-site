(function () {
  "use strict";

  var configurations = {
    "mastopexia": {
      label: "Mastopexia",
      title: "Confirme se elevar sem prótese, com prótese ou não operar agora é o plano mais proporcional.",
      note: "A avaliação organiza queda, volume, tecidos, cicatrizes e o resultado que você deseja preservar."
    },
    "mastopexia-com-protese": {
      label: "Mastopexia com prótese",
      title: "Entenda quanto do resultado depende de elevar — e quanto depende de acrescentar volume.",
      note: "A prótese não substitui automaticamente a retirada de pele, e a escolha do implante vem depois das medidas."
    },
    "protese-de-mama": {
      label: "Prótese de mama",
      title: "Escolha volume e projeção a partir do seu tórax, dos seus tecidos e do resultado que você busca.",
      note: "Referências ajudam, mas o plano não deve depender de um número isolado de mililitros."
    },
    "mamoplastia-redutora": {
      label: "Mamoplastia redutora",
      title: "Avalie conforto, proporção, cicatrizes e sensibilidade antes de decidir quanto reduzir.",
      note: "A redução procura aliviar peso e remodelar a mama sem prometer uma medida ou uma simetria padronizada."
    },
    "abdominoplastia": {
      label: "Abdominoplastia",
      title: "Descubra se pele, diástase, gordura ou cicatrizes participam do que incomoda no abdome.",
      note: "A consulta diferencia abdominoplastia, lipoaspiração e outras possibilidades antes de definir a extensão da cirurgia."
    },
    "lipoaspiracao": {
      label: "Lipoaspiração",
      title: "Confirme se a gordura é realmente o principal componente — e se a pele pode acompanhar a mudança.",
      note: "A lipo remodela áreas selecionadas; não substitui emagrecimento e não corrige todo excesso de pele."
    },
    "pos-bariatrica": {
      label: "Cirurgia pós-bariátrica",
      title: "Organize prioridades, cicatrizes e etapas depois de uma grande perda de peso.",
      note: "Abdome, mamas, braços e coxas não precisam — e muitas vezes não devem — ser tratados de uma só vez."
    },
    "braquioplastia": {
      label: "Braquioplastia",
      title: "Decida se o ganho de contorno dos braços compensa a cicatriz necessária para tratar a pele.",
      note: "A avaliação diferencia gordura de excesso cutâneo e considera axilas, tórax, peso e recuperação."
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

    root.dataset.secondaryPremium = "true";
    root.dataset.secondaryPremiumReady = "true";
    document.body.classList.add("secondary-premium", "has-sticky");

    var brandLine = document.querySelector(".brand span");
    if (brandLine) {
      var brandContext = config.brand || (root.dataset.contentGroup === "mama" ? "Cirurgia Plástica de Mama" : "Contorno Corporal");
      brandLine.textContent = brandContext + " · Pinheiros";
    }

    var navCta = document.querySelector(".nav-cta[data-track='whatsapp']");
    if (navCta) navCta.textContent = "Dúvidas e horários";

    var heroCta = document.querySelector(".hero-actions [data-track='whatsapp']");
    if (heroCta) heroCta.textContent = "Ver horários para avaliação";

    var heroNote = document.querySelector(".hero-note");
    if (heroNote) heroNote.textContent = "Dra. Amanda Schroeder · CRM-SP 191605 · RQE 110472 · Membro da SBCP";

    document.querySelectorAll("a[data-track='whatsapp']").forEach(function (link) {
      link.dataset.ctaLocation = link.dataset.ctaLocation || locationFor(link);
    });

    var existing = document.querySelector(".secondary-practical");
    var anchor = document.querySelector(".contact-flow") || document.querySelector(".cta");
    var sourceLink = navCta || heroCta || document.querySelector("a[data-track='whatsapp']");
    if (!existing && anchor && sourceLink) {
      var practical = document.createElement("section");
      practical.className = "secondary-practical";
      practical.dataset.section = "consultation_offer";
      practical.innerHTML =
        '<div class="container secondary-practical__grid">' +
          '<div><span class="eyebrow">Próximo passo</span><h2>' + config.title + '</h2><p>' + config.note + '</p>' +
          '<a class="btn" data-track="whatsapp" data-procedure="' + procedure + '" data-cta-location="consultation_offer" href="' + sourceLink.href + '" target="_blank" rel="noopener">Ver horários para avaliação de ' + config.label.toLowerCase() + '</a></div>' +
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
      finalCta.textContent = "Ver horários para avaliação";
      finalCta.dataset.ctaLocation = "final";
    }

    var floating = document.querySelector(".whatsapp-float[data-track='whatsapp']");
    if (floating) {
      floating.textContent = "Tirar dúvidas e ver horários";
      floating.dataset.ctaLocation = "sticky";
      floating.setAttribute("aria-label", "Tirar dúvidas e consultar horários pelo WhatsApp");
    }
  }

  function scheduleInstall() {
    window.setTimeout(install, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleInstall);
  else scheduleInstall();
}());
