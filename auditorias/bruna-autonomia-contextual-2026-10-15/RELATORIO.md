# Bruna — autonomia contextual com fatos preservados, 15/10/2026

<!-- BRUNA-AUTONOMIA-CONTEXTUAL-2026-10-15-PUBLICACAO -->
Commit autorizado 74c53a17555e95cb81915c33eea8a6053a23a8b4; deploy 6ad0f6c1fd759be7d5f15b0f; publicado em 2026-10-15T15:55:58.973Z e verificado em 2026-10-15T15:56:44Z. Estado da igualdade documental em PUBLICACAO.json.

## Problema e alcance

A resposta pode perder informação útil quando a seleção contextual depende de uma lista de códigos ou quando o verificador de estilo recebe um contrato anterior à decisão semântica. O ajuste busca aproveitar a interpretação do contexto sem ampliar fatos, preços, agenda ou autorização de contato. A implementação e seus testes distinguem bloqueio cosmético das proteções materiais exercitadas pelos cenários.

A leitura autenticada delimitada encontrou perdas históricas de tópico e de resposta conjunta, mas não identificou recibo explícito de veto regex/style. Depois do release observado, houve somente duas entradas e um encaminhamento de cuidado ativo, sem saída automática no recorte. A amostra não prova regressão do release atual nem efeito da mudança proposta. Respostas humanas foram separadas das respostas da Bruna; nenhum dado pessoal foi copiado para este relatório.

## Alteração publicada

- semantic-reply-policy.mjs remove a whitelist de reply codes. Um preview confirmado recebe o rascunho somente se a IA escolher contextual, o candidato operacional não exigir approved_exact e preservesProtectedFacts passar; approved_exact semântico ou operacional conserva a cópia.
- preservesProtectedFacts compara números, URLs e algumas afirmações explícitas, aceitando equivalência BRL conservadora; não é verificador semântico geral. O prompt exige copiar o trecho financeiro aprovado, o seletor conserva a ressalva aplicável e os gates materiais seguem obrigatórios. A equivalência não autoriza preço, fato clínico, modalidade, profissional ou compromisso novo.
- buildSemanticReplyConversationAction fornece o contrato semântico antes de style/continuidade em openai-shadow.mjs. Clarificação e continuação contextual admitem uma pergunta específica.
- informationalContinuationAllowed é restrito à continuação informativa semanticamente válida: ação respond, direct_answer, posse da Bruna, risco verde ou amarelo e ausência de pendência ou posse humana. Links, CTA comercial e agenda continuam bloqueados.
- Entrada e retomada compartilham a seleção. human-resume.mjs conserva enriquecimento e gates; ycloud-webhook.mjs transmite as pendências ao contexto avaliado. outbound-reply-gate.mjs aplica as mesmas fronteiras; conversation-guidelines.mjs descreve o contrato efetivo.
- bruna-conversion-experience.mjs prioriza convite explícito para agendar sobre oferta de informação, inclusive em texto misto; fatos descritivos sobre agendamento continuam permitidos.
- O harness usa o mesmo construtor semântico e reforça um cenário já existente de papada para terceira pessoa, sem aumentar chamadas.

Pacote, prompt e identificador do snapshot avançam para 2026-10-15.1. O snapshot contém o mesmo conhecimento aprovado; nenhum preço ou fato foi adicionado. Modelo, esforço, história completa, limites de geração, áudio e Apps Script v164 permanecem.

## Preflight e evidência

PREFLIGHT.json registra a leitura de desenvolvimento com corte operacional 2026-10-15T15:35:19Z e consolidação até 15:41:52Z. Nas últimas 24 horas: 20 mensagens em cinco oportunidades, sendo oito entradas, três saídas da Bruna e nove humanas; 22 eventos operacionais. Depois de 12:46:37.032Z: duas entradas, nenhuma saída Bruna e um encaminhamento de paciente em cuidado ativo. Cinco casos anteriores foram usados para compreender perdas de tópico e controles legítimos de duplicação/agenda; não compõem medida de impacto.

Netlify current ready foi conferido em b7bad3c4e93f313993f8c9cb6b08b1a6ba7506f1 / 6ad0ca6cd91f0138092c5d88, com 15 funções e seis programações. GET de saúde preserva assinatura, modo ativo, preferências, áudio e arquivo de conversas. Metadados das duas projeções Drive foram lidos; nenhum download/hash novo foi realizado nesta rodada. Às 15:44:30Z, presença da configuração de produção e pointer/inventário Netlify foram revalidados em leitura, sem acesso a valores secretos.

O objeto de remetente mantém evidência anterior de 12:13:32Z, sem revalidação nem leitura do valor. Apps Script v164 vem do recibo anterior. Essas limitações são explícitas e devem acompanhar o preflight fresco do release. Nenhuma mensagem, fila, LEADS, CRM, agenda, conhecimento, configuração, campanha ou Drive foi alterado na preparação.

## Validação

Passaram 2251/2251 testes integrais e as suítes focadas ownerAndConsumers: 200/200; styleAndSafety: 211/211; hostedGateHarness: 19/19, com sobreposição; 74 arquivos de contratos estão cobertos. O build autorizado passou em 21/21 cenários hospedados, incluindo dois históricos completos, e 3/3 áudios. Saúde, proteção de assinatura, 15 funções e seis programações foram conferidas. O caso de papada para terceira pessoa usa o construtor semântico real e reforça um cenário existente, sem chamada adicional. Nenhuma mensagem real foi enviada como teste.

Resultados finais vinculados ao SHA autorizado no recibo. A amostra operacional anterior conserva sua proveniência e não comprova causalidade. Pacote, prompt e identificador do snapshot avançam juntos para 2026-10-15.1; o snapshot representa o mesmo conhecimento aprovado, sem preço ou fato novo. Modelo, esforço, história completa, limites de geração, áudio e Apps Script v164 permanecem. Identidade, destinatário, procedimento, urgência, cuidado ativo, takeover, pendências, revisão da conversa e idempotência continuam protegidos. Não há prova de conversa natural posterior, ganho de conversão ou economia financeira. Os três componentes Ads e seus recibos são preservados.

## Publicação e reversão

Autorização, release:preflight do SHA exato, produção e inventários estão em PUBLICACAO.json. A publicação ocorreu antes desta preparação documental; o helper não executa rede, inferência, commit ou push.

Reversão por novo commit/build restrito ao delta para o comportamento de b7bad3c4e93f313993f8c9cb6b08b1a6ba7506f1 / 6ad0ca6cd91f0138092c5d88, preservando dados, filas, flags, Apps Script e trabalho paralelo; sem replay. Monitorar primeira conversa e retomada natural elegíveis e 48 horas, sem automação nova. A igualdade das mesmas projeções no Drive e o estado final constam em auditorias/bruna-autonomia-contextual-2026-10-15/PUBLICACAO.json; publicação técnica não substitui o fechamento documental.
