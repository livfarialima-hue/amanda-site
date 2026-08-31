import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRecentCommercialSolicitationContext,
  isCommercialSolicitation,
} from "./commercial-contact.mjs";

test("detects Google Business Profile sales offers without blocking location questions", () => {
  for (const text of [
    "Trabalho com gestão e otimização do Perfil da Empresa no Google para conquistar clientes de forma orgânica.",
    "Posso apresentar nosso trabalho de otimização do Google Meu Negócio?",
    "Ajudamos empresas a ter mais visibilidade no Google Maps e atrair novos clientes.",
    "Sou fundador do Cliagenda. Temos paciente buscando esse procedimento e gostaria de enviar a página de agendamento.",
    "Analisei a presença digital da clínica e vi pontos que dificultam a chegada de novos pacientes pelo Google.",
  ]) {
    assert.equal(isCommercialSolicitation(text), true, text);
  }

  for (const text of [
    "Pode me mandar a localização da clínica no Google Maps?",
    "Encontrei a Dra. Amanda no Google e quero marcar uma consulta.",
    "Qual é o valor da avaliação?",
  ]) {
    assert.equal(isCommercialSolicitation(text), false, text);
  }
});

test("detects a healthcare provider promotion without treating patient questions as sales", () => {
  const promotionalOutreach = [
    "Olá, bom dia! Sou a Magda, da Clínica OXY Maia!",
    "Tenho uma novidade para você: agora temos uma Câmara Hiperbárica em Guarulhos.",
    "Para celebrar nossa inauguração, estamos com uma condição especial.",
    "Quer que eu te envie os valores e as condições especiais?",
  ].join(" ");

  assert.equal(isCommercialSolicitation(promotionalOutreach), true);

  for (const patientText of [
    "Sou a Maria, trabalho na empresa X e quero saber o valor da consulta.",
    "Fiz uma cirurgia recentemente e queria saber se a Dra. Amanda pode me avaliar.",
    "Tenho interesse em entender como funciona a recuperação.",
    "Sou Ana, da Clínica X. Temos uma novidade por aqui, mas eu quero marcar uma consulta para mim.",
    "Vi a condição especial e gostaria de agendar uma avaliação.",
  ]) {
    assert.equal(isCommercialSolicitation(patientText), false, patientText);
  }
});

test("a recent promotional message classifies the following media without contaminating later patient context", () => {
  const promotionalTurn = {
    role: "user",
    source: "patient",
    at: "2026-08-31T12:14:00-03:00",
    text:
      "Sou a Magda, da Clínica OXY Maia. Temos uma novidade de inauguração e uma condição especial. Quer que eu envie os valores?",
  };

  assert.equal(
    hasRecentCommercialSolicitationContext([promotionalTurn], {
      at: "2026-08-31T12:14:20-03:00",
    }),
    true,
  );
  assert.equal(
    hasRecentCommercialSolicitationContext(
      [
        promotionalTurn,
        {
          role: "user",
          source: "patient",
          at: "2026-08-31T12:15:00-03:00",
          text: "Agora falando como paciente: quero saber sobre blefaroplastia.",
        },
      ],
      { at: "2026-08-31T12:15:10-03:00" },
    ),
    false,
  );
  assert.equal(
    hasRecentCommercialSolicitationContext([promotionalTurn], {
      at: "2026-08-31T13:00:01-03:00",
    }),
    false,
  );
});
