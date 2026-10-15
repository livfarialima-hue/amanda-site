# Bruna — respostas completas e retomadas devidas

Estado: código publicado e verificado em 2026-10-15T11:30:58.679Z; estado da reconciliação documental registrado em PUBLICACAO.json e REVISAO.json.

Pacote 2026-10-14.5 publicado e verificado: commit 7242d54df4e4487aeb59e1f7ec37c0f0c4dc6788; deploy 6ad0b88d46ff84caa6a749e7; publicação 2026-10-15T11:30:20.211Z; verificação 2026-10-15T11:30:58.679Z. Passaram 21/21 cenários hospedados de modelo, incluindo dois de histórico completo e os dois de papada, e 3/3 áudios sintéticos. Saúde pública HTTP 200 e rejeição sem assinatura HTTP 401 verificadas; 15 funções e seis programações preservadas. Apps Script v164 inalterado. Nenhuma mensagem real foi enviada como teste; conversa natural posterior e melhora de conversão ainda não foram comprovadas. Rollback: novo commit/build que reverta somente este pacote para o comportamento de cbda0cf80a817e5cbaf967d44abe8bd9f3c0c58d / 6acff7b9dc7d30f39ad66b31, preservando dados, filas, flags, recibos e Apps Script; sem replay.

Histórico preservado em TENTATIVA-PUBLICACAO.json: (1) commit 30b01f4 / deploy 6ad0a6f33904b3954a95aec5, bloqueio cuja causa exata não pôde ser confirmada sem o recibo final no log; a contradição do prompt foi corrigida independentemente. (2) commit 94f066e / deploy 6ad0abedf8ca5991c929014d, classificação consulta_online em procedure em vez de unknown; 15/16 cenários executados e 3/3 áudios passaram. (3) commit 3be4621 / deploy 6ad0b3b112e2fc6ad811f8e1, conector “a” na faixa de lifting onde política e cenário exigem “e”; 12/13 cenários executados e 3/3 áudios passaram, sem alcançar os históricos. A correção exige copiar o trecho financeiro literal e contextualizar ao redor; política monetária, asserções, parser, prazos e retries permanecem preservados. O preflight de 51e57c69 bloqueado antes do push e a integração dos registros Ads também permanecem intactos no histórico.

O estado da reconciliação das projeções existentes do manual e do Plano no Drive está registrado em PUBLICACAO.json e REVISAO.json deste pacote. Os recibos distinguem hashes locais de releituras autenticadas; a igualdade documental exige comparação exata com o commit de origem e com os mesmos arquivos existentes, além dos gates finais de fechamento.

## Problema e mudança

Diagnóstico recuperado do Cloud: uma pergunta conjunta sobre procedimento, preço e recuperação podia receber somente um aviso de confirmação de valor. A formulação “gostaria de saber sobre o procedimento” também não selecionava a explicação já aprovada. O pacote publicado preserva as partes seguras e encaminha somente o que falta.

O responsável autorizou R$12–18mil para lipo de papada isolada nesta conversa. A tabela histórica indicada foi lida e não contém linha específica de papada/cervicoplastia; nenhuma equivalência com lipoaspiração genérica foi presumida. A faixa nova exige procedimento inequívoco, pedido de valor, envio único e ressalvas; associações não herdam essa referência.

## Estratégia de 15/10

A seleção foi baseada em leitura dos sistemas canônicos privados, preservando autoria, contexto, preferências, promessa, resposta posterior e vínculo de consulta. Prioridade: consulta iminente e respostas devidas, depois continuidade individual de intenção concreta. A seleção não aciona a fila nem envia mensagens. Datas mecânicas, flags falsas e cartões antigos não substituem evidência de elegibilidade. Detalhes identificáveis ficam nas fontes privadas, sem exportação para o repositório.

## Fontes e limites

Preflight Netlify/projeto/deploy e webhook público atuais, baseline Git b77b1d6, docs/contratos, histórico do chat Cloud, LEADS/CRM/compromissos/Central/retomadas/preferências/Calendar e tabela indicada. Não se afirma leitura de mídia omitida, entrega pelo provedor, editor Apps Script ou reservas privadas do worker. O planejamento individual foi escrito somente em Observação da equipe na Central canônica, após revalidar identidade, chave, oportunidade, profissional e mensagens. Releitura confirmou todos os alvos, nenhuma omissão e nenhum outro campo modificado. Pausas e recusa foram preservadas; detalhes identificáveis permanecem exclusivamente na fonte privada.

## Validação e publicação

A implementação inicial passou em 2.204 testes integrais e 1.635 da união de 83 arquivos de contratos, com sobreposição; 17 testes do gate hospedado eram simulados. Após o bloqueio, a correção passou na nova suíte de 2.205 testes integrais, 1.531 testes dos 74 arquivos obrigatórios de contratos e 18 testes simulados do gate. O novo teste de consistência do prompt falhou antes do reparo e passou depois. Após as correções de classificação e redação financeira e a integração documental Ads, passaram 2.208 testes integrais; a união dos 74 arquivos de contratos passou 1.534 testes, com sobreposição, e o harness simulado passou 19/19. Esses testes locais permanecem distintos dos 21 cenários vivos deste deploy. Build de 193 arquivos/54 URLs, arquitetura, contrato de mudança, diff e revisão independente passaram. Foram acrescentados 28 casos comportamentais e ampliadas as verificações de recibo e repetição contextual. A nova holding de papada exige recibo explícito do compromisso e alerta entregue; falha ou resposta ambígua conserva recuperação, sem promessa. Testes locais em REVISAO.json e gates hospedados/publicação em PUBLICACAO.json. Esses recibos registram o estado comprovado da releitura das mesmas projeções do Drive e da reconciliação do checkout principal. Não usar teste sintético como comprovação de resposta natural.

## Rollback e acompanhamento

Reverter somente o pacote por novo commit/build se houver indicação individual, confusão de procedimento/faixa, duplicidade ou promessa sem encaminhamento. Preservar dados, filas e recibos; sem replay. Daniel/equipe acompanha obrigações em 15/10, primeiras conversas e 48h após a publicação, com revisão em 22/10. Métrica: utilidade/completude, promessas atendidas, intervenção e consultas reais; ganho de conversão ainda não comprovado.
