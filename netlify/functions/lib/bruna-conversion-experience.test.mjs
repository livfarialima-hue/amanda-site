import assert from "node:assert/strict";
import test from "node:test";
import {
  BRUNA_CTA_TYPES,
  assessBrunaReplyExperience,
  brunaConversionGuidelinesAppendix,
  classifyBrunaCta,
  isBrunaConversionExperienceEnabled,
  patientFacingPolicyLanguageReason,
  procedureOpeningMicrovalue,
} from "./bruna-conversion-experience.mjs";

test("conversion experience is default-off and requires an explicit value", () => {
  assert.equal(isBrunaConversionExperienceEnabled({}), false);
  assert.equal(
    isBrunaConversionExperienceEnabled({
      BRUNA_CONVERSION_EXPERIENCE_V1: "false",
    }),
    false,
  );
  assert.equal(
    isBrunaConversionExperienceEnabled({
      BRUNA_CONVERSION_EXPERIENCE_V1: "enabled",
    }),
    true,
  );
  assert.equal(
    isBrunaConversionExperienceEnabled({
      BRUNA_CONVERSION_EXPERIENCE_V1: "1",
    }),
    true,
  );
});

test("every supported acquisition procedure has a safe concrete opening microvalue", () => {
  const procedures = [
    "lifting_facial",
    "lifting_cervical",
    "blefaroplastia",
    "frontoplastia",
    "otoplastia",
    "avaliacao_facial",
    "lip_lifting",
    "lipo_papada",
    "rinoplastia",
    "lipoaspiracao",
    "abdominoplastia",
    "mastopexia",
    "protese_mama",
    "mamoplastia_redutora",
    "braquioplastia",
    "ninfoplastia",
    "contorno_corporal",
    "cirurgias_combinadas",
  ];

  for (const procedure of procedures) {
    const microvalue = procedureOpeningMicrovalue(procedure);
    assert.ok(microvalue.length >= 70, procedure);
    assert.ok(microvalue.length <= 165, procedure);
    assert.doesNotMatch(
      microvalue,
      /garant|certeza|sem risco|melhor (?:opção|procedimento) para você/i,
      procedure,
    );
  }
  assert.equal(procedureOpeningMicrovalue("unknown"), "");
});

test("CTA classifier distinguishes the gradual progression levels", () => {
  assert.equal(
    classifyBrunaCta("Se quiser, posso te explicar como funciona a avaliação."),
    BRUNA_CTA_TYPES.INFORMATION,
  );
  assert.equal(
    classifyBrunaCta("Também posso te passar uma faixa geral de valores como ponto de partida."),
    BRUNA_CTA_TYPES.PRICE_REFERENCE,
  );
  assert.equal(
    classifyBrunaCta("Se quiser, posso verificar opções de horário."),
    BRUNA_CTA_TYPES.AVAILABILITY,
  );
  assert.equal(
    classifyBrunaCta("Quais dias e qual período, manhã ou tarde, funcionam melhor?"),
    BRUNA_CTA_TYPES.PREFERENCE,
  );
});

test("mechanical internal safeguards are detected but natural medical limits remain allowed", () => {
  assert.equal(
    patientFacingPolicyLanguageReason(
      "A avaliação é feita com cuidado, sem prometer um resultado específico.",
    ),
    "mechanical_result_disclaimer",
  );
  assert.equal(
    patientFacingPolicyLanguageReason(
      "Conforme nossas diretrizes, esta resposta precisa ser revisada.",
    ),
    "internal_policy_disclosure",
  );
  assert.equal(
    patientFacingPolicyLanguageReason(
      "O resultado varia conforme a anatomia e o planejamento definido na avaliação.",
    ),
    "",
  );
});

test("offline experience assessment exposes tone, specificity, length and progression", () => {
  const assessment = assessBrunaReplyExperience({
    body:
      "Claro. A consulta presencial com a Dra. Amanda custa R$ 500. O pagamento pode ser feito por Pix, débito ou parcelamento, com emissão de nota fiscal. Se quiser, posso verificar opções de horário.",
    procedure: "avaliacao_facial",
  });

  assert.equal(assessment.toneScore, 2);
  assert.equal(assessment.specificityScore, 2);
  assert.equal(
    assessment.conversionOutcome,
    BRUNA_CTA_TYPES.AVAILABILITY,
  );
  assert.equal(assessment.withinPreferredLength, true);
  assert.equal(assessment.policyLanguageReason, "");
});

test("conversion appendix keeps safeguards internal and defines a single-step ladder", () => {
  const appendix = brunaConversionGuidelinesAppendix();
  assert.match(appendix, /todas as mensagens recentes/i);
  assert.match(appendix, /no máximo um microvalor concreto/i);
  assert.match(appendix, /progressão é gradual/i);
  assert.match(appendix, /Salvaguardas clínicas e comerciais são internas/i);
  assert.match(appendix, /Só inclua o endereço quando a pessoa também perguntar/i);
});
