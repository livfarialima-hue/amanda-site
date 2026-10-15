# Bruna — autonomia contextual com fatos preservados, 15/10/2026

## Problema e alcance

A resposta pode perder informação útil quando a seleção contextual depende de uma lista de códigos ou quando o verificador de estilo recebe um contrato anterior à decisão semântica. O ajuste busca aproveitar a interpretação do contexto sem ampliar fatos, preços, agenda ou autorização de contato. A implementação e seus testes devem distinguir bloqueio cosmético de proteção material.

A leitura autenticada delimitada encontrou perdas históricas de tópico e de resposta conjunta, mas não identificou recibo explícito de veto regex/style. Depois do release observado, houve somente duas entradas e um encaminhamento de cuidado ativo, sem saída automática no recorte. A amostra não prova regressão do release atual nem efeito da mudança proposta. Respostas humanas foram separadas das respostas da Bruna; nenhum dado pessoal foi copiado para este relatório.

## Alteração local

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

Passaram 2251/2251 testes integrais e 19/19 testes do harness hospedado simulado, sem inferência paga. Os 74 arquivos exigidos pelos contratos estão cobertos. Revisões cruzadas confirmaram as correções de seleção, estilo, recusa e convite misto, sem bloqueador restante; 200/200 e 211/211 testes focados também passaram, com sobreposição. change:check, architecture:check, site:build/site:check (193 artefatos, 54 URLs) e diff passaram. ops:check permanece SYNC_PENDING até publicação e igualdade das projeções.

A revisão e as verificações offline usam esta conta e ferramentas determinísticas, com zero inferência paga. A publicação autorizada mantém o gate existente: 21 cenários de modelo, incluindo dois históricos completos, e três áudios. Resultados antigos não substituem o gate deste SHA; não há replay diagnóstico nem cenário adicional para obter aprovação.

## Publicação e reversão

Base local e8b11e4136d0bef328a34680b3aaf9c94baddf48; produção funcional de referência b7bad3c4e93f313993f8c9cb6b08b1a6ba7506f1 / 6ad0ca6cd91f0138092c5d88. O pedido atual autoriza preparar e publicar a mudança, mas a autorização será vinculada ao SHA concreto no release:preflight, após gates locais e revisão. Nenhuma publicação deste candidato está comprovada nesta etapa.

Preservar baselinePublishedChange, baselineRuntimeRelease, os três componentes Ads e seus recibos. baselineContextualRelease guarda o recibo do baseline imediato. O manifest mantém o release anterior até publicação, verificação e readback real das mesmas projeções; ops:check deve permanecer SYNC_PENDING enquanto houver etapa pendente.

Reverter somente este delta por novo commit/build que restaure o comportamento de referência, preservando dados, filas, flags, Apps Script, preços, fatos e trabalho paralelo; sem replay. Daniel/equipe acompanham primeira conversa e retomada naturais elegíveis e 48 horas após publicação, sem nova automação. Fato alterado, preço incompatível, agenda não autorizada, envio indevido, duplicidade ou interferência humana exigem contenção e revisão.
