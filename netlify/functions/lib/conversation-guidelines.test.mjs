import assert from "node:assert/strict";
import test from "node:test";
import { CONVERSATION_GUIDELINES } from "./conversation-guidelines.mjs";

test("conversion playbook defines identity, progression and low-friction qualification", () => {
  assert.match(
    CONVERSATION_GUIDELINES,
    /Eu sou a Bruna, concierge da Clínica LIV Faria Lima/,
  );
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
  assert.match(CONVERSATION_GUIDELINES, /duas opções/);
  assert.match(CONVERSATION_GUIDELINES, /não responda apenas que "depende"/i);
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
    /parcelado antecipadamente, com quitação antes do procedimento/,
  );
  assert.match(CONVERSATION_GUIDELINES, /desconto à vista/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /média ou faixa de qualquer outro procedimento/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /minilifting entre R\$ 18 mil e R\$ 25 mil/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /lifting facial entre R\$ 26 mil e R\$ 42 mil/,
  );
  assert.match(CONVERSATION_GUIDELINES, /margem de 10% abaixo/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /não diga que ela inclui, engloba ou considera um item específico/,
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
    /resposta padrão em faixa baseada na tabela interna/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /resposta determinística inicial sem faixa/i,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /é natural querer saber o valor antes de decidir/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Para os demais procedimentos[\s\S]{0,300}se o procedimento estiver claro, não acrescente pergunta, convite, faixa nem oferta/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Se você quiser, posso te passar uma faixa geral como referência inicial/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Uma resposta curta como "Sim" ou "Pode me passar" só conta como aceite/,
  );
  assert.match(CONVERSATION_GUIDELINES, /Não liste técnica, complexidade, equipe, hospital, anestesia, materiais ou acompanhamento nessa primeira resposta/);
  assert.match(CONVERSATION_GUIDELINES, /não acrescente pergunta, convite, faixa/);
  assert.match(CONVERSATION_GUIDELINES, /não como orçamento, proposta ou garantia de preço/i);
  assert.match(
    CONVERSATION_GUIDELINES,
    /não apresente honorários isolados|faixa não representa honorários isolados/i,
  );
  assert.match(CONVERSATION_GUIDELINES, /quanto-custa-lifting-facial-sao-paulo/);
  assert.match(CONVERSATION_GUIDELINES, /faixa completa já tiver sido enviada/i);
  assert.match(CONVERSATION_GUIDELINES, /pode ficar fora dessa faixa/i);
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
  assert.match(CONVERSATION_GUIDELINES, /duas opções reais de horário/);
  assert.match(CONVERSATION_GUIDELINES, /cerca de 24 horas/);
  assert.match(CONVERSATION_GUIDELINES, /cerca de 72 horas/);
  assert.match(CONVERSATION_GUIDELINES, /Depois de duas retomadas/);
});

test("playbook uses approved site content at a strategic moment", () => {
  assert.match(CONVERSATION_GUIDELINES, /siteResource/);
  assert.match(CONVERSATION_GUIDELINES, /única URL autorizada/);
  assert.match(CONVERSATION_GUIDELINES, /URL deve aparecer por extenso/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /primeira pergunta de preço cirúrgico com procedimento confirmado/,
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
  assert.match(CONVERSATION_GUIDELINES, /não repita URLs ou páginas já presentes/);
  assert.match(CONVERSATION_GUIDELINES, /guia específico de lifting fica reservado ao fallback/);
  assert.match(CONVERSATION_GUIDELINES, /Nunca ofereça o guia de custos faciais para cirurgia de mama/);
  assert.match(CONVERSATION_GUIDELINES, /cirurgias mamárias recebem o guia de mama/i);
  assert.match(CONVERSATION_GUIDELINES, /cirurgias corporais e íntimas recebem o guia corporal/);
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
    /pós-graduação em Cosmiatria e Procedimentos pelo Einstein/,
  );
  assert.match(CONVERSATION_GUIDELINES, /atuação com foco em cirurgias da face/);
  assert.match(CONVERSATION_GUIDELINES, /CRM-SP 191605/);
  assert.match(CONVERSATION_GUIDELINES, /RQE 110472/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /membro da Sociedade Brasileira de Cirurgia Plástica \(SBCP\)/,
  );
  assert.match(CONVERSATION_GUIDELINES, /R\. Pais Leme, 215, cj\. 710/);
  assert.match(CONVERSATION_GUIDELINES, /CEP 05424-150/);
  assert.match(CONVERSATION_GUIDELINES, /maps\.app\.goo\.gl\/yDFBmbcn5oDpHSM46/);
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
  assert.match(
    CONVERSATION_GUIDELINES,
    /não repita nem amplifique esse rótulo/i,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Seja sempre educada, empática, gentil e respeitosa/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Quando a pessoa enviar uma foto do rosto ou do corpo, agradeça de forma simples/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Não presuma que o momento é íntimo, sensível ou vulnerável/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não exponha frases técnicas como "sem concluir diagnóstico ou indicação apenas pela imagem"/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Nunca elogie, critique, compare ou interprete o corpo mostrado/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /não transforme a vulnerabilidade em argumento para consulta ou cirurgia/,
  );
});

test("playbook prohibits unfinished or contaminated outbound content", () => {
  assert.match(CONVERSATION_GUIDELINES, /Nunca produza placeholders/);
  assert.match(CONVERSATION_GUIDELINES, /cartões vCard/);
  assert.match(CONVERSATION_GUIDELINES, /links incompletos/);
  assert.match(CONVERSATION_GUIDELINES, /horário duplicados/);
});

test("playbook ignores commercial and unrelated approaches while preserving context", () => {
  assert.match(CONVERSATION_GUIDELINES, /proposta de parceria comercial/);
  assert.match(CONVERSATION_GUIDELINES, /Não gaste uma resposta de cortesia/);
  assert.match(CONVERSATION_GUIDELINES, /convite pessoal, flerte, paquera/);
  assert.match(CONVERSATION_GUIDELINES, /use o histórico/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /ambígua, potencialmente relevante e segura, peça um único esclarecimento específico/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /risco clínico, cuidado em andamento ou dado operacional protegido, use human_review/,
  );
});

test("playbook treats structured prefills only as context", () => {
  assert.match(CONVERSATION_GUIDELINES, /templateId procedure_evaluation_v1/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /nunca basta para qualificar o lead, gerar conversão offline, encaminhar agenda/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /O que você gostaria de entender primeiro\?/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /perfil parecer empresa ou marca, responda normalmente sem personalização nominal/,
  );
  assert.match(
    CONVERSATION_GUIDELINES,
    /Só peça dias e período depois que a pessoa escrever por conta própria/,
  );
});

test("playbook requires explicit semantic reopening and complete deterministic fit", () => {
  assert.match(CONVERSATION_GUIDELINES, /CONTEXT-CONTINUE-01/);
  assert.match(CONVERSATION_GUIDELINES, /context_continue:<tema>/);
  assert.match(
    CONVERSATION_GUIDELINES,
    /cumpra diretamente a explicação prometida/,
  );
  assert.match(CONVERSATION_GUIDELINES, /CONTEXT-REOPEN-01/);
  assert.match(CONVERSATION_GUIDELINES, /context_reopen:<tema>/);
  assert.match(CONVERSATION_GUIDELINES, /resolver integralmente todos os pedidos seguros/);
  assert.match(CONVERSATION_GUIDELINES, /deterministicReplyPreview/);
  assert.match(CONVERSATION_GUIDELINES, /CONTEXT-CLARIFY-01/);
  assert.match(CONVERSATION_GUIDELINES, /UNKNOWN-CLARIFY-01/);
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
