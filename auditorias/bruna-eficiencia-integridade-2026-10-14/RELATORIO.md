# Bruna — eficiência e integridade após a publicação de contexto

Estado: publicado e verificado nas plataformas; commit funcional dcb5df99f91afd39bcd76b1147f7ad5f7377bccb. Fechamento Git e igualdade das projeções no Drive registrados em PUBLICACAO.json. Nenhuma mensagem real, alteração de dados, rotina operacional, migração ou campanha foi executada por esta tarefa.

## Base conferida

A execução aguardou o fechamento da conversa `01a1376a-8422-7553-b220-30cfac3c3392`. A reanálise usa `63e764133411e1db81ce6d679d7c6974af43aa5e`, que contém o funcional publicado `769cee33281516883b89ed150ba61ce8f6ccaaa4` e seus recibos finais. O Netlify confirmou o deploy `6aceef108fbe857da62bcfac`, pronto e atual. O endpoint público informou automação ativa, transcrição e arquivo habilitados. O recibo reconciliado informa Apps Script v163 no deployment canônico; não usamos o simples HTTP 200 como prova de versão. `ops:check` passou antes da implementação.

Leitura limitada da LEADS em 14/10/2026, 00:16 BRT: 555 oportunidades (531 abertas, 24 anuladas), 37 dúvidas aguardando resposta humana e uma aguardando esclarecimento; cinco fatos na biblioteca aprovada. Classificação: 552 concluídas, 24 excluídas, uma aguardando mensagens e quatro órfãs. Não havia fila pending/running no recorte. Não exportamos textos, nomes ou telefones.

Google Ads: 18 eventos internos, dos quais 11 prontos, cinco em quarentena legada e dois invalidados. Os 11 prontos correspondem às 11 transações únicas na primeira aba `IMPORT_GOOGLE_ADS`, com ação e identificador coincidentes e um único click ID por linha. Isso verifica a preparação, não o aceite, a atribuição ou o resultado na conta Google. Não houve reenvio ou modificação dessa integração.

Fonte datada dos agregados e limites: `PREFLIGHT.json` nesta pasta.

## Alterações do candidato

### 1. Respostas contextuais e fatos protegidos

- Distinguir negações explícitas de afirmações sobre crédito da consulta, reembolso, benefício fiscal e confirmação de agenda. Exemplo: “a consulta ainda não está confirmada” não deve ser bloqueada como uma confirmação. Uma promessa positiva em outra oração continua bloqueada; “não se preocupe, a consulta está confirmada” também.
- Compartilhar a comparação conservadora de fatos entre a redação de prévias e a biblioteca. `R$ 500` e `R$ 500,00` representam o mesmo valor; `R$ 700`, URL alterada e troca de dias por semanas não representam. As faixas cirúrgicas continuam sujeitas ao proprietário e às ressalvas integrais.
- Essa comparação não compreende toda a semântica da língua. Fonte aprovada, decisão da IA, elegibilidade e gate final continuam indispensáveis.
- Conciliar instruções contraditórias: responder antes de colher nome; não substituir uma pergunta útil por coleta obrigatória; não reinstalar guia obrigatório à noite; alinhar a regra de conteúdo indisponível ao acolhimento já vigente. O manual de operação deixa de orientar o antigo fluxo de preço sem números seguido de novo aceite.

Não reescrevemos o histórico completo nem o substituímos por resumo. Preservamos a leitura recém-publicada, a autoria, as lacunas e a memória objetiva. Tampouco removemos proteções só para reduzir o tamanho do prompt. A reescrita ampla de aproximadamente 97 mil caracteres de instruções exige comparação com IA real; o presente candidato corrige contradições comprovadas e prepara medição confiável antes dessa decisão.

### 2. Consumo de IA observável

- Registrar todas as tentativas de uma execução, incluindo revisão, resposta rejeitada/incompleta, erro e timeout.
- Somar somente contadores recebidos; consumo ausente permanece desconhecido. Entrada, saída, cache e raciocínio usam schema numérico fechado, sem texto da conversa.
- Emitir uma vez por execução real no adaptador comum à entrada e à retomada humana. O log de decisão não é somado como nova inferência quando reutiliza um resultado.
- Manter modelo, prazo, número de chamadas, decisões e payload do histórico. Falha de telemetria não muda o atendimento.

Não há economia comprovada por esta alteração. Ela corrige subcontagem e dupla contagem potencial no adaptador de respostas e permite comparar consumo por execução sem sacrificar contexto. Ainda não constitui uma contabilidade completa da conta: classificação, propostas de conhecimento e transcrição usam caminhos próprios. A correlação do consumo com qualificação e conversão também exige uma análise posterior; os logs novos não afirmam causalidade comercial.

### 3. Integridade do aprendizado

A pergunta é identificada pelo Event ID já existente e seu vínculo canônico à oportunidade e ao profissional. O receptor confere as revisões da pergunta e da conversa, a autoria, o texto persistido e a posição do evento humano antes de capturar. Resultado produzido sobre uma revisão antiga ou vínculo ambíguo não pode fechar a dúvida. Resposta vaga, parcial ou falha de IA não equivale a resolução. Uma candidata reutilizável continua como rascunho para revisão, nunca como regra aprovada automaticamente. Reentrega de evento humano não cria uma segunda candidata.

Esclarecimentos usam recibos recuperáveis Em preparo → Aplicado, com hashes antes/depois, para sobreviver a interrupções sem perder ou repetir texto. O protocolo human-learning-v2 anuncia a capacidade do receptor. O novo envelope usa humanAnswer, que o receptor antigo rejeita, inclusive num rollback depois da leitura do contexto. Publicar Apps Script antes de Netlify continua sendo a sequência preferida. O marcador knowledgeSnapshot no manifest identifica o pacote local; não promove a biblioteca viva nem altera sua propriedade BRUNA_KB_SNAPSHOT.

O desenho reutiliza as abas e operações existentes; não acrescenta colunas ou outro banco de memória. Perguntas legadas sem vínculo suficiente ficam preservadas para revisão, sem migração presumida. Uma correção de conhecimento não altera fase, consulta, compromisso, atribuição ou ownership.

A detecção legada de correção de uma regra usada nos últimos 45 minutos permanece associada por telefone. Esse caminho pode suspender uma regra para revisão e não cria nem aprova conhecimento. Foi preservado; sua associação e a latência da leitura do ledger com pendência continuam limitações conhecidas.

O caminho implementado captura a resposta humana já persistida no WhatsApp, com autoria, pergunta, oportunidade, profissional e revisão do histórico conferidos. Uma resposta dada a Aníbal nesta conversa ainda não ingressa automaticamente nesse caminho: seria necessária uma ponte explícita com a fonte da resposta, sem fabricar um evento de WhatsApp. Essa ponte e o processamento pelo plugin estão fora deste candidato. Não foi criado um canal autônomo novo nem promovida a resposta médica hipotética sobre trombose. “A clínica avalia esse perfil” é informação institucional diferente de “esta pessoa pode operar”. Conduta, elegibilidade e medicação individuais continuam humanas.

### 4. Dependências

A instalação isolada detectou avisos de segurança nas dependências transitivas `@fastify/busboy` 3.2.0 e `image-size` 2.0.2. O lock atualiza somente esses patches para 3.2.3 e 2.0.4; `@netlify/blobs` 10.7.12 permanece. A exposição concreta pelos endpoints não foi demonstrada, portanto não registramos um incidente nem exploração. A auditoria do lock corrigido não encontrou avisos no momento da consulta.

Referências primárias: [Busboy, boundary multipart](https://github.com/advisories/GHSA-xjh9-v7x6-24jw), [Busboy, CRLF](https://github.com/advisories/GHSA-gxm5-99cw-xjw9), [image-size](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).

## Decisões após a reanálise

| Tema | Decisão e motivo |
|---|---|
| Processamento no plugin | Adiado expressamente por Daniel; nenhuma alteração do plugin. |
| Histórico | Preservar a implementação recém-publicada; não substituir por resumo. |
| Capacidade de classificação | Manter lote/cadência, pois não há saturação observada. Os casos órfãos não autorizam reprocessamento automático. |
| LEADS e Google Ads | Preservar contratos e exportação reconciliada. Aceite externo ainda requer leitura autenticada própria, não novo uploader ou recibo fictício. |
| Documentos da clínica | São fontes para revisão. Sua edição não publica fatos automaticamente; faltas e conflitos precisam de aprovação e rastreio de versão. Não importar documentos inteiros como instruções. |
| Regra clínica geral | Somente após confirmação expressa, escopo e limites aprovados. Este candidato não cria fatos clínicos. |
| Grande reorganização de arquivos | Não mover código por tamanho. O helper puro compartilhado elimina duplicação específica comprovada; o restante mantém seus proprietários. |
| Conversão | Medir contatos qualificados, consultas agendadas/realizadas e avanço real. CTA ou aprovação de cenário sintético não prova conversão. |

## Validação e publicação

Passaram 2.121 testes da suíte integral após a última correção, 38 testes complementares de aquisição/atribuição, os checks de contrato e arquitetura, a revisão independente e a verificação das 54 páginas fonte. A revisão especial de LEADS/CRM/Ads/agenda passou; headers das quatro abas de conhecimento permanecem iguais. Casos sintéticos reproduziram as falhas antes das correções e confirmaram a recuperação de gravações parciais e a rejeição de versões incompatíveis. Não houve teste operacional. A auditoria de dependências retornou zero avisos.

O build tentou gerar 193 arquivos (305.853.875 bytes) e falhou com ENOSPC durante a cópia de um vídeo. Restavam cerca de 3 MB livres. Nenhum dos 38 arquivos do candidato ficou vazio. A remoção da saída incompleta foi rejeitada pela revisão automática de autorização (motivo fornecido: blocked by policy); não foi contornada. Os resultados e limitações estão em `REVISAO.json`; o escopo completo está em `ops/CHANGE-CANDIDATE.json`.

O ensaio local de reversão dos 38 arquivos, incluindo sete novos, passou sem alterar arquivos.

Em 14/10/2026, Daniel informou espaço liberado. A leitura confirmou 1.894.690.816 bytes livres e o build padrão passou com 193 arquivos, 54 páginas, zero auditorias no artefato e nenhum erro. Não houve nova alteração funcional após os 2.121 testes finais. O candidato foi atualizado para tested_local e commitado em dcb5df99f91a. Naquele ponto, a publicação ainda dependia de autorização explícita e novo preflight vivo, posteriormente realizados e registrados abaixo.

Os requisitos de revisão independente, suíte integral, build/check, commit intencional, autorização explícita e novo preflight vivo foram cumpridos. O gate de 15 conversas com IA real, áudio e histórico permanece obrigatório no build de produção; este pacote tem seu próprio recibo aprovado. `SYNC_PENDING` foi mantido durante a preparação; somente a conferência das plataformas, igualdade das projeções existentes no Drive e reconciliação Git permitem o fechamento registrado em PUBLICACAO.json.

Rollback de código após eventual publicação: Netlify `6aceef108fbe857da62bcfac` e Apps Script v163 no mesmo deployment. Preservar os dados legitimamente produzidos, biblioteca aprovada, filas, arquivo privado e flags já ativas; não repetir mensagens ou reverter dados junto com código. Monitorar primeiras conversas naturais, 48 horas e sete dias, com contenção diante de resposta indevida, perda de prioridade humana, duplicidade, exposição ou mudança indevida do funil.

## Publicação autorizada e conferência da LEADS

**Pacote 2026-10-14.1 — PUBLICADO E VERIFICADO NAS PLATAFORMAS.** Daniel autorizou o commit funcional dcb5df99f91afd39bcd76b1147f7ad5f7377bccb. Apps Script v164 publicado em 14/10/2026, 06:55 BRT, no mesmo deployment e URL. Os 28 arquivos vivos coincidiam com a base antes da escrita; somente KnowledgeBase.gs mudou, e a releitura após salvar/reabrir coincidiu integralmente com o arquivo aprovado. Netlify 6acf51c3102d74aed99ab751, produção pela integração Git de reestruturacao-site, publicado em 2026-10-14T09:59:03.902Z. Quinze funções e seis agendamentos preservados; nenhuma flag, acionador, rotina operacional, migração ou mensagem real de teste foi alterada/executada pela tarefa.

Passaram 2.121 testes integrais, 38 complementares, revisão independente, contrato, arquitetura, ensaio de reversão e build restrito (193 arquivos, 54 páginas, zero auditorias). O build de produção aprovou os 15 cenários com gpt-6.1-sol, esforço medium, e três áudios sintéticos com whisper-1. Ambos os cenários de histórico completo passaram. O caso preço/fotos levou 17,771 segundos dentro do prazo de 20; silêncio ficou incerto e inelegível. Uma única tentativa de build de produção; nenhum gate, prazo ou requisito foi reduzido. O JSON completo foi recomposto de dois pacotes consecutivos do log, sem perda, e preservado em PUBLICACAO.json. Site/health 200, assinatura ativa, POST sem assinatura 401; link Apps Script inválido confirmou ausência de alteração de mensagens/preferências.

LEADS conferida antes e depois, somente leitura: 47 abas, 556 oportunidades únicas, 532 abertas/24 anuladas; 582 classificações (553 concluídas, 24 excluídas, uma aguardando mensagens e quatro órfãs), zero pending/running; 37 dúvidas e um esclarecimento; cinco fatos aprovados. Os 11 eventos Ads prontos correspondem às 11 transações únicas exportadas, com clique, ação, data, valor e moeda iguais. Os recortes e cabeçalhos comparados permaneceram iguais, inclusive filas, consultas e seleções de agenda. Isso não verifica aceite pelo Google Ads nem a próxima entrega real de paciente.

Pendências anteriores à publicação, preservadas para diagnóstico separado: cabeçalhos de _AGENDAMENTOS_PENDENTES deslocados uma coluna (dados/código A:I, títulos B:J; 19 registros), três consultas sem status e três registros com erro de sincronização Google Agenda. A ponte direta Aníbal→aprendizado continua pendente: o fluxo atual exige resposta humana canônica do WhatsApp. Fatos novos seguem em Revisar; informação clínica geral não autoriza cirurgia individual. Não houve alteração do plugin nem criação de outro banco de memória.

Rollback deste pacote: Netlify 6aceef108fbe857da62bcfac / 769cee33281516883b89ed150ba61ce8f6ccaaa4 e Apps Script v163 no deployment existente. Preservar histórico ampliado, áudio/arquivo e suas flags, dados, filas, pausas e recibos; sem replay. Daniel/equipe: observar primeiras conversas naturais, 48 horas em 16/10 e sete dias em 21/10, a partir de 14/10 06:59 BRT; conter diante de resposta indevida, duplicidade, perda de prioridade humana ou alteração indevida de fase/atribuição. Ganho de conversão, economia e estabilidade de latência dependem de observação real. Recibo: auditorias/bruna-eficiencia-integridade-2026-10-14/PUBLICACAO.json. As projeções do manual e plano são substituídas nos mesmos IDs e verificadas por hash; o fechamento Git/Drive é registrado no recibo, sem criar plano concorrente.
