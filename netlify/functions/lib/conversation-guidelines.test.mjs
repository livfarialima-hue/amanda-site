import assert from "node:assert/strict";
import test from "node:test";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";

test("conversion playbook defines identity, progression and low-friction qualification", () => {
  assert.match(CONVERSATION_GUIDELINES, /Eu sou a Bruna/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /comece sempre com "Olá"/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Nunca inicie diretamente por "Eu sou a Bruna"/,
  );
  assert.match(CONVERSATION_GUIDELINES, /Como posso te chamar/);
  assert.match(CONVERSATION_GUIDELINES, /no máximo uma pergunta útil/);
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
  assert.match(CONVERSATION_GUIDELINES, /Não ofereça quatro caminhos em forma de menu/);
  assert.match(CONVERSATION_GUIDELINES, /pergunte de forma aberta/);
  assert.doesNotMatch(
    CONVERSATION_GUIDELINES,
    /Qual é sua principal dúvida agora: o procedimento, a recuperação, os valores ou a consulta/,
  );
  assert.match(CONVERSATION_GUIDELINES, /O que você gostaria de entender ou melhorar/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não abra a conversa perguntando "o que incomoda"/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Identifique todas as perguntas, pedidos e informações novas/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /responda as duas antes de qualificar/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Uma pergunta de continuidade é opcional, não obrigatória/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não força avanço/,
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
  assert.match(CONVERSATION_GUIDELINES, /consulta presencial custa R\$ 500/);
  assert.match(CONVERSATION_GUIDELINES, /Pix, débito ou parcelamento/);
  assert.match(CONVERSATION_GUIDELINES, /emissão de nota fiscal/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /comprovante de despesa médica na declaração do Imposto de Renda/,
  );
  assert.match(CONVERSATION_GUIDELINES, /Nunca prometa dedução, restituição/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /pagamento antecipadamente até a cirurgia/,
  );
  assert.match(CONVERSATION_GUIDELINES, /condição à vista/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /qualquer procedimento cirúrgico, inclusive frontoplastia/,
  );
  assert.match(CONVERSATION_GUIDELINES, /margem de 10% abaixo/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /não diga que ela inclui, engloba ou considera hospital/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Como funciona a consulta\/avaliação/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /pergunta informativa, não um pedido de agenda/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /sugestão em faixa baseada na tabela interna/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Nenhum valor cirúrgico pode ser enviado automaticamente/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /aguarde o prazo configurado de 20 minutos/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /envie a confirmação imediatamente/,
  );
  assert.match(CONVERSATION_GUIDELINES, /use human_review/);
  assert.match(CONVERSATION_GUIDELINES, /mais de sete dias/);
  assert.match(CONVERSATION_GUIDELINES, /Não repita a apresentação ou as credenciais/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /responda somente ao detalhe novo/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /permaneça em silêncio/,
  );
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
  assert.match(CONVERSATION_GUIDELINES, /depois dessa resposta significativa/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /prefira a página completa desse procedimento/,
  );
  assert.match(CONVERSATION_GUIDELINES, /seção de resultados/);
  assert.match(CONVERSATION_GUIDELINES, /casos reais ou antes e depois/);
  assert.match(CONVERSATION_GUIDELINES, /material educativo/);
  assert.match(CONVERSATION_GUIDELINES, /limita o envio proativo a um material/);
  assert.match(CONVERSATION_GUIDELINES, /não repita URL ou página/);
  assert.match(CONVERSATION_GUIDELINES, /guia de custos pode vir depois da faixa/);
  assert.match(CONVERSATION_GUIDELINES, /Não ofereça o guia de custos faciais para cirurgia de mama/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /responda primeiro como o procedimento funciona em linguagem simples/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /envie a página completa daquele procedimento, nunca a página geral/,
  );
  assert.match(CONVERSATION_GUIDELINES, /reposiciona tecidos que perderam sustentação/);
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
  assert.match(
    CONVERSATION_GUIDELINES,
    /membro da Sociedade Brasileira de Cirurgia Plástica \(SBCP\)/,
  );
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
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não transforme a formação em bloco de abertura/,
  );
});

test("playbook handles appearance insecurity without exploiting it", () => {
  assert.match(
    CONVERSATION_GUIDELINES,
    /decisão informada, não convencê-la a operar/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /reconheça o sentimento sem confirmar que existe um defeito/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /o que gostaria de perceber diferente — e o que é importante continuar reconhecendo como seu/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /a consulta não pressupõe cirurgia/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não envie antes e depois e não faça retomada comercial/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não diagnostique condição psicológica pelo WhatsApp/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não use antes e depois para provocar comparação/,
  );
});

test("playbook ignores commercial and unrelated approaches while preserving context", () => {
  assert.match(CONVERSATION_GUIDELINES, /proposta de parceria comercial/);
  assert.match(CONVERSATION_GUIDELINES, /Não gaste uma resposta de cortesia/);
  assert.match(CONVERSATION_GUIDELINES, /convite pessoal, flerte, paquera/);
  assert.match(CONVERSATION_GUIDELINES, /use o histórico/);
  assert.match(CONVERSATION_GUIDELINES, /prefira human_review a ignore/);
});

test("playbook adapts to stage and does not manufacture conversational progress", () => {
  assert.match(CONVERSATION_GUIDELINES, /Pesquisando:/);
  assert.match(CONVERSATION_GUIDELINES, /Comparando ou com objeção:/);
  assert.match(CONVERSATION_GUIDELINES, /Pronta para agendar:/);
  assert.match(CONVERSATION_GUIDELINES, /Encerrando:/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /pare de qualificar, apresentar credenciais ou enviar links/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não contenha pergunta, pedido ou ação pendente/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /mencione pelo menos um elemento concreto do que ela disse/,
  );
});

test("playbook separates returning patients from acquisition leads", () => {
  assert.match(
    CONVERSATION_GUIDELINES,
    /patientRelationship informa somente o estado operacional/i,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não trate a pessoa como lead novo/i,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /appointment_scheduled, consultation_completed, surgical_planning ou active_postop/i,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não envie site espontaneamente/i,
  );
});
