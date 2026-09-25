# Bruna — respostas contextuais, 25/09/2026

**Estado: testado localmente; publicação autorizada por Daniel, ainda pendente.** Baseline do repositório: fa950dd825c2894e8f712379c0546c0cc728009e. Produção anterior: commit 31105d3bf8f9dc0f19f97f8344bf9966e85da3d7, Netlify 6ab6ceb59b48eb00087c67c0.

## Evidência e limites

A conversa do print foi cruzada com _WHATSAPP_MENSAGENS e _WHATSAPP_ATENDIMENTO_HUMANO na LEADS canônica: as respostas longas, a retomada de consulta e o link de lipo foram enviados pela equipe humana. Não são atribuídos à Bruna. A leitura complementar examinou 187 registros de 23 a 25/09, com 20 respostas automáticas. É uma amostra, não auditoria integral nem medição de conversão.

A implementação anterior podia recomendar um artigo durante um relato pessoal e permitia um link no contrato de saída. Faltava contexto educativo de papada no conjunto de fatos fornecido ao modelo. As instruções também tratavam um recurso sugerido como quase obrigatório, aumentando a chance de a resposta se parecer com um roteiro. Os modelos humanos precisam obedecer à mesma concisão e às credenciais corretas; editar o manual não controla o texto digitado pela equipe.

## Alteração

- Um sinal linguístico puro de relato pessoal é consumido pelo seletor de recursos e pelo contrato de saída. Nesse contexto, sem pedido pertinente, nenhum link é oferecido. O bloqueio existente antes do envio continua aplicando maxLinks.
- Pedidos expressos de material ou localização e guias autorizados de preço continuam disponíveis. Dúvida geral sobre um tema não é confundida com relato sobre o próprio corpo.
- Fatos gerais de contorno cervical descrevem a participação possível de gordura, pele e anatomia. Não permitem diagnosticar, indicar lipo ou lifting, prescrever emagrecimento ou condicionar consulta ao peso. Perguntas compostas mantêm os outros fatos aprovados.
- O prompt prioriza duas a quatro frases úteis, sem currículo, espelhamento em forma de pergunta, repetição do funcionamento da consulta ou convite prematuro a valores/agenda. Fala humana passada é contexto, não uma nova fonte clínica ou de credenciais.
- Orientação de preço sem procedimento e tratamento de texto indisponível foram alinhados à correção anterior já publicada. Não se presume que um procedimento seja facial nem se tenta obter texto perdido por replay manual.
- O manual canônico da Bruna contém um exemplo curto também destinado à equipe. Bundle, prompt e conhecimento passam a 2026-09-25.1; modelo e esforço de raciocínio não mudam.

Fontes: [conteúdo clínico aprovado sobre papada](https://draamandaschroeder.com.br/conteudos/papada-contorno-cervical/), conferido em 25/09; [orientações oficiais sobre instruções, contexto e exemplos](https://developers.openai.com/api/docs/guides/prompt-engineering). A mudança reaproveita fatos clínicos já publicados e não cria um protocolo de peso.

## Validação

Os três testes de reprodução foram executados antes da implementação e falharam nos pontos esperados: recurso espontâneo, maxLinks e fatos ausentes. Depois da correção: **211/211 testes focados, 1.682/1.682 integrais e 17 comandos obrigatórios aprovados**, incluindo consumidores, baseline bloqueada, contrato, arquitetura, construção e conferência estática. Quatro novos cenários sintéticos foram adicionados à baseline protegida.

Testes incluem transporte real da entrada montada para o modelo com provedor simulado, fatos de papada e recuperação na mesma pergunta, aceite vinculado à oferta, preservação de pergunta de consulta/localização/artigo, bloqueio final de URL e manutenção dos controles de cuidado, preço, autoria, opt-out e takeover. O antigo teste de roteamento de materiais agora pede explicitamente o artigo; novos controles negativos verificam os relatos que passaram a não receber link.

Esses testes demonstram contratos e contexto corretos; não garantem a redação de toda resposta futura de um modelo probabilístico. Não houve geração com dados de pacientes, mensagem real de teste, replay nem alteração de conversa passada.

## Publicação e reversão

Destino: Netlify canônico inspiring-sprite-b35ca4, branch reestruturacao-site. Apps Script v160 preservado, sem escrita. A solicitação atual autoriza publicar após validação e será vinculada ao commit no preflight externo. PUBLICACAO.json registra o resultado. Plano e manual substituem as mesmas projeções no Drive, com conferência de hash antes e depois.

Reversão: restaurar Netlify 6ab6ceb59b48eb00087c67c0 / commit 31105d3bf8f9dc0f19f97f8344bf9966e85da3d7, preservando filas, registros, flags e a correção anterior. Conter se houver indicação individual, silêncio indevido, perda de pedido explícito ou quebra de proteção.

Acompanhamento operacional: Daniel/equipe, primeiras conversas elegíveis e 48 horas após a publicação. Verificar se a resposta atende à dúvida concreta, se não há link ou agenda prematura, repetição, biografia ou diagnóstico. Reavaliar no painel executivo; nenhuma automação de monitoramento foi criada e ganho de conversão ainda não foi medido.
