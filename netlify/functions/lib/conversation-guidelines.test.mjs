import assert from "node:assert/strict";
import test from "node:test";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";

test("conversion playbook defines identity, progression and low-friction qualification", () => {
  assert.match(CONVERSATION_GUIDELINES, /Eu sou a Bruna/);
  assert.match(CONVERSATION_GUIDELINES, /Como posso te chamar/);
  assert.match(CONVERSATION_GUIDELINES, /somente uma pergunta útil/);
  assert.match(CONVERSATION_GUIDELINES, /Meta\/Facebook\/Instagram/);
  assert.match(CONVERSATION_GUIDELINES, /metaAdContext/);
  assert.match(CONVERSATION_GUIDELINES, /interesse legítimo na clínica/);
  assert.match(CONVERSATION_GUIDELINES, /não invente procedimento/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /Google, Meta e WhatsApp direto seguem a mesma estratégia central/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /A mensagem atual e o histórico sempre prevalecem sobre a origem/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /nunca presuma que alguém está pronto para agendar por ter vindo do Google/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Qual é sua principal dúvida agora: o procedimento, a recuperação, os valores ou a consulta/,
  );
  assert.match(CONVERSATION_GUIDELINES, /Você está começando a pesquisar/);
  assert.match(CONVERSATION_GUIDELINES, /O que você gostaria de entender ou melhorar/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não abra a conversa perguntando "o que incomoda"/,
  );
});

test("playbook protects price, scheduling, continuity and human handoff", () => {
  assert.match(CONVERSATION_GUIDELINES, /appointment_review/);
  assert.match(CONVERSATION_GUIDELINES, /três opções/);
  assert.match(CONVERSATION_GUIDELINES, /não responda apenas que "depende"/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /Transparência vem antes das condições de pagamento/,
  );
  assert.match(CONVERSATION_GUIDELINES, /R\$ 18\.000 a R\$ 35\.000/);
  assert.match(CONVERSATION_GUIDELINES, /consulta presencial custa R\$ 500/);
  assert.match(CONVERSATION_GUIDELINES, /Há opções de parcelamento/);
  assert.match(CONVERSATION_GUIDELINES, /qualquer outro procedimento sem faixa aprovada/);
  assert.match(CONVERSATION_GUIDELINES, /use human_review/);
  assert.match(CONVERSATION_GUIDELINES, /mais de sete dias/);
  assert.match(CONVERSATION_GUIDELINES, /Não repita a apresentação ou as credenciais/);
  assert.match(CONVERSATION_GUIDELINES, /não tiver sido executada/);
});

test("playbook uses approved site content at a strategic moment", () => {
  assert.match(CONVERSATION_GUIDELINES, /siteResource/);
  assert.match(CONVERSATION_GUIDELINES, /única URL autorizada/);
  assert.match(CONVERSATION_GUIDELINES, /URL deve aparecer por extenso/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não envie o link automaticamente na primeira resposta/,
  );
  assert.match(CONVERSATION_GUIDELINES, /página geral/);
  assert.match(CONVERSATION_GUIDELINES, /depois da primeira resposta significativa/);
  assert.match(CONVERSATION_GUIDELINES, /seção de resultados/);
  assert.match(CONVERSATION_GUIDELINES, /casos reais ou antes e depois/);
  assert.match(CONVERSATION_GUIDELINES, /material educativo/);
  assert.match(CONVERSATION_GUIDELINES, /limita o envio proativo a um material/);
  assert.match(CONVERSATION_GUIDELINES, /não repita URL ou página/);
});

test("playbook states credentials and location precisely", () => {
  assert.match(
    CONVERSATION_GUIDELINES,
    /residência médica em Cirurgia Plástica pela Unicamp/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /pós-graduação em Cosmiatria pelo Einstein/,
  );
  assert.match(CONVERSATION_GUIDELINES, /atuação com foco em cirurgias da face/);
  assert.match(CONVERSATION_GUIDELINES, /CRM-SP 191605/);
  assert.match(CONVERSATION_GUIDELINES, /RQE 110472/);
  assert.match(CONVERSATION_GUIDELINES, /Rua Pais Leme, 215/);
  assert.match(CONVERSATION_GUIDELINES, /próxima à Av\. Faria Lima/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /nunca afirme que ela fica na própria Avenida Faria Lima/,
  );
  assert.doesNotMatch(
    CONVERSATION_GUIDELINES,
    /cirurgiã plástica formada pela UNICAMP/,
  );
});

test("playbook handles trust barriers without unsupported claims", () => {
  assert.match(CONVERSATION_GUIDELINES, /compensar por ser jovem/);
  assert.match(CONVERSATION_GUIDELINES, /Resultado artificial/);
  assert.match(CONVERSATION_GUIDELINES, /Não prometa ausência de risco/);
  assert.match(CONVERSATION_GUIDELINES, /Não prometa naturalidade ou resultado/);
  assert.match(CONVERSATION_GUIDELINES, /sem usar "investimento" como eufemismo/);
});

test("playbook ignores commercial and unrelated approaches while preserving context", () => {
  assert.match(CONVERSATION_GUIDELINES, /proposta de parceria comercial/);
  assert.match(CONVERSATION_GUIDELINES, /Não gaste uma resposta de cortesia/);
  assert.match(CONVERSATION_GUIDELINES, /convite pessoal, flerte, paquera/);
  assert.match(CONVERSATION_GUIDELINES, /use o histórico/);
  assert.match(CONVERSATION_GUIDELINES, /prefira human_review a ignore/);
});
