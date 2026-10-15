# Bruna — coerência e divisão entre conta, código e API

Data: 15/10/2026, America/Sao_Paulo. Natureza: inspeção de código, plugin autenticado, documentos oficiais e testes sintéticos. Sem mensagens reais, dados de pacientes, inferência paga, publicação ou mutação operacional. Autorização atual: melhorar lógica local e examinar integração; publicação nova exige autorização específica.

## Resultado e limites

O principal problema reproduzido é a aplicação de vetos lexicais amplos sobre respostas que já possuem um contrato contextual. O candidato corrige dois pontos, sem retirar controles materiais. Um terceiro protótipo foi descartado após revisão independente. Não é uma reescrita completa nem prova de desempenho em conversas naturais.

Baseline local/remote: 45d73450f5da28cdbdd222d2574e03f9f0e9fa48. Produção verificada via API Netlify em 15/10/2026 às 15:21:32 BRT: deploy ready 6ad0f6c1fd759be7d5f15b0f, commit funcional 74c53a17555e95cb81915c33eea8a6053a23a8b4, pacote 2026-10-15.1. Apps Script v164 conforme manifesto/recibo anterior; não houve nova inspeção nem escrita no editor Apps Script. O pacote anterior permanece publicado. Este candidato é 2026-10-15.2.

## Correções delimitadas

| Problema observado | Exemplo sintético | Correção | Guardrail |
| --- | --- | --- | --- |
| Expressão de cortesia interpretada como CTA | “Você pode trazer suas dúvidas, se quiser.” | Adiado; o relaxamento foi revertido integralmente antes do commit. | O classificador parcial não reconheceu todos os convites. Manter baseline até desenho semântico próprio. |
| Prefixo educado confundido com reinício | “Poderia me dizer se você está falando da pálpebra superior ou da sobrancelha?” | Detector de reset se restringe a perguntas genéricas. | “Como posso ajudar?”, “Qual sua dúvida?” e “Poderia me explicar melhor?” continuam bloqueadas no contexto de resposta já informada. |
| Pedido natural de repetir informação ignorado | “Qual era mesmo o valor da consulta?” | Proprietário reply-continuity reconhece pedido explícito coloquial. | Sem liberar repetição espontânea, pedido negado, opt-out ou repetição de faixa cirúrgica. |

Arquivos executáveis finais: outbound-reply-gate.mjs e reply-continuity.mjs, com testes nos dois proprietários/consumidores. Classificador de convite, negação e seus testes voltam integralmente ao baseline. Versões do manifesto identificam o pacote, sem mudar conhecimento, prompt efetivo, modelo ou esforço. Sem exceções por paciente, novos templates ou novas chamadas de IA.

A revisão independente reproduziu escapes de “agende”, “reserve” e depois “escolha um dia”/“seguimos com seu agendamento”, além de falso bloqueio em “Não precisamos que você reserve um horário agora”. Ampliar sucessivamente regex contrariaria a simplificação pretendida. Por isso a entrega não inclui esse protótipo nem os testes transitórios de sua gramática. Preservamos a proteção de CTA atual e registramos o adiamento, não uma aprovação fictícia. O detector de reinício foi refinado para continuar barrando perguntas genéricas com “um pouco mais/melhor” ou “o que deseja”; os testes de faixa passaram a exigir o motivo real de repetição, sem mascará-lo por limite de links.

## Regras que devem permanecer

- Responder aos assuntos concretos do turno usando histórico e fatos aprovados; a liberdade de redação não autoriza inventar preço, indicação ou disponibilidade.
- Identidade do paciente e procedimento, limite clínico, posse humana, pendências, consentimento/opt-out, janela de envio, revisão da conversa e idempotência.
- Preço autorizado e ressalvas do procedimento, sem substituir faixa por promessa de orçamento ou repetir automaticamente uma faixa já enviada.
- Confirmação de agenda depende do estado real; nenhum texto do modelo autoriza efeito externo.

Não removemos as demais expressões regulares em bloco: elas misturam proteção material com estilo. A revisão futura deve exigir caso reproduzido, proprietário único e teste negativo antes de retirar cada veto.

## O que já existia e não é economia nova

Inspeção do plugin autenticado Bruna — Gestão e Conversão, versão 1.0.1, release pluginrel_6ad0bf7894f48191b35dec0546d430e6: 11 arquivos; regras conta-primeiro e sem fallback pago silencioso. A integração possui conexões gerais, mas não um servidor MCP próprio nem ponte que receba tarefas do webhook e devolva resultados ao backend.

Código já contém: pré-condições de retomada antes da IA, corredores determinísticos restritos, deduplicação/lease de áudio e remoção de tentativa diagnóstica paga. Não apresentar esses mecanismos como novos.

## Divisão recomendada

| Trabalho | Executor adequado | Situação |
| --- | --- | --- |
| Contagem, filtros, deduplicação, comparação de versão, integridade e cálculos | Código determinístico | Sem benefício em gastar a conta ou API para aritmética repetitiva. |
| Revisão longa de conversas, avaliação de qualidade, síntese, sugestões de respostas e código | Plugin pela conta | Política já existente; depende da execução de uma rodada e acesso às fontes, não altera o bot por si só. |
| Classificação de funil e proposta de conhecimento após resposta humana | Primeiro piloto assíncrono pela conta | Bom candidato por não exigir resposta imediata; ponte ainda inexistente. |
| Resposta imediata e revisão semântica de uma retomada prestes a ser enviada | Runtime atual, até provar substituto | Não desligar por economia estimada. |
| Áudio | Reutilizar transcrição persistida; manter ingestão atual enquanto não validada alternativa | Não retranscrever o mesmo áudio no plugin. |

Chamadas de inferência encontradas: resposta principal/revisão limitada em openai-shadow; classificação em lead-classifier; revisão de retomada em scheduled-followup-context-review; extração administrativa em knowledge-candidate; áudio em audio-transcription. Não são todas redundantes. Fatura e consumo por categoria não foram consultados: distribuição monetária e economia são N/D. A correção de falsos bloqueios pode reduzir revisões/handoffs, mas isso é hipótese, não economia comprovada.

Antes de migrar, completar recibos de consumo por categoria reutilizando ai-usage: hoje a cobertura comparável é concentrada na resposta principal; outras categorias têm cobertura parcial ou ausente. Isso é melhoria proposta de medição, não implementada aqui e não é economia por si só. Registrar apenas quantidade conhecida, duração, modelo, resultado e executor; desconhecido não vira zero, áudio usa unidade própria, sem textos/IDs pessoais. O plugin deve agregar os recibos deterministicamente.

## Rotas oficiais e limitações verificadas em 15/10/2026

- A documentação de [MCP Events](https://developers.openai.com/plugins/build/mcp-events) oferece entrega de eventos para Work cloud e dots, com inscrição persistente e callbacks autenticados. É uma rota candidata para trabalho assíncrono; não comprova suporte ativo desta conta nem tempo de resposta do bot.
- [ChatGPT plan usage](https://developers.openai.com/siwc/token-sharing-open-source) prevê OAuth próprio para apps elegíveis, sobretudo abertos/locais; apps pagos ou hospedados remotamente devem verificar a via indicada pelo fornecedor. Não significa que o Netlify atual possa simplesmente usar a sessão deste aplicativo. Elegibilidade real: N/D.
- A [API de Workspace Agents](https://learn.chatgpt.com/workspace-agents/trigger-runs) pode disparar execução e acompanhar estado, mas a documentação informa que a resposta do agente não pode ser recuperada pela API. Portanto, sozinha não fecha o ciclo do bot.
- [Autenticação do Codex](https://learn.chatgpt.com/docs/auth) diferencia cobrança por chave de API de uso da conta. Não copiar cookies/tokens da sessão nem usar APIs privadas. [Automações locais](https://learn.chatgpt.com/docs/automations) exigem ambiente disponível; não tratá-las como serviço de WhatsApp com disponibilidade garantida.

Uma rotina cloud 9h/17h não foi confirmada pelas ferramentas desta tarefa; a busca local encontrou somente uma automação pausada de melhorias e outra não relacionada. Isso não prova inexistência na nuvem. Não criamos rotina duplicada nem reativamos a antiga.

## Contrato proposto para a ponte — não implementado

Fluxo: evento operacional → fila durável → tarefa autorizada na conta → proposta estruturada → revalidação no servidor → aplicação permitida ou revisão humana.

1. Começar somente com propostas assíncronas. Nenhuma ferramenta do piloto envia WhatsApp, agenda consulta ou modifica fatos aprovados. Classificação inicial pelo plugin deve revisar casos históricos em modo leitura usando evidências existentes; não substituir o classificador operacional de cinco minutos por uma rodada de duas vezes ao dia.
2. Separar o recebimento durável de uma resposta humana da extração por IA. Hoje KnowledgeBase exige proposta válida para a captura; desligar knowledge-candidate antes dessa separação perderia informações.
3. Envelope mínimo: jobId opaco, tipo, versão da conversa e oportunidade, hash do conteúdo necessário, versão de política, expiração, chave idempotente e estado. Nada de telefone/nome em IDs ou notificações.
4. Conteúdo necessário é obtido por ferramenta autenticada e com escopo; evento carrega apenas referência opaca. O modelo retorna schema validado, evidência, confiança e versão de entrada.
5. Antes de persistir, o servidor relê conversa, responsável, oportunidade e versões. Resultado obsoleto, duplicado, expirado, sem autorização ou com divergência vira rejeição auditável, nunca envio.
6. Fila com lease, limite de tentativas, pausa, retenção e exclusão definidas. Quota/indisponibilidade gera pendência visível. Fallback pago somente por política separada e aprovada, nunca silencioso.
7. Não rodar permanentemente plugin e API para a mesma tarefa. No piloto, comparação delimitada com orçamento aprovado; depois escolher um executor por job com recibo de conclusão.
8. Desligar por flag deve impedir novas tarefas sem perder as pendentes. Rollback preserva recibos e contexto; não reenvia pacientes nem recalcula agenda.

Testes antes de ativar: duplicidade, trabalho expirado, mudança de conversa durante execução, conflito de oportunidade, takeover humano, quota esgotada, revogação de autenticação, resposta fora do schema, falha parcial de persistência, indisponibilidade do host, ordem trocada e retomada após pausa. Critério: zero efeito externo nos cenários inválidos; mesma tarefa aplicada no máximo uma vez.

## Validação e publicação

Validação final local: 2254/2254 testes integrais, 140/140 focados e 107/107 na revisão independente; contagens se sobrepõem, não somar. Revisão final sem achados bloqueadores após exclusão do protótipo de CTA. change:check OK com 11 arquivos, architecture:check OK, diff --check limpo. Build com 193 arquivos, zero evidência operacional/auditoria no artefato público; check técnico OK para 54 URLs. A suíte cobre regressões de preços, fotos, terceiros, atendimento humano, agenda e continuidade. Sem chamada paga ao modelo ou áudio nesta etapa.

Estado final do candidato: tested_local, para commit intencional. ops:check deve permanecer SYNC_PENDING enquanto faltarem publicação autorizada e projeções no Drive. O código público continua 2026-10-15.1; não confundir a versão local 2026-10-15.2 com ativação. Algumas formas coloquiais de repetição permanecem conservadoramente não reconhecidas; não foi criada uma gramática geral por regex.

Publicação futura: autorização do SHA exato, preflight vivo, gate hospedado obrigatório de modelo/histórico/áudio, publicação somente Netlify deste pacote, smoke read-only e atualização dos mesmos documentos no Drive com hash/readback. Não tocar Apps Script, campanhas, pacientes ou plugin como efeito lateral.

Monitorar falsos bloqueios e convites indevidos em 24h e 7 dias após eventual publicação. Para migração de custo, medir por tipo de tarefa e volume comparável; não concluir economia apenas pela redução de tokens isolados. O Plano Executivo canônico contém ordem e autorizações; este relatório é evidência, não segundo planejamento.
