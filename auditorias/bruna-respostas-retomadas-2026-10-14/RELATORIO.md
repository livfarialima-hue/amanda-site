# Bruna — respostas completas e retomadas devidas

Estado: publicação autorizada bloqueada pelo gate vivo em 15/10/2026, sem troca de produção ou mensagens reais.

O commit 51e57c69 foi autorizado em 15/10, mas o preflight encontrou registros paralelos do Google Ads no remoto 20d4b5be antes de qualquer envio. A integração preserva esses registros e mantém código, testes e manifesto Bruna idênticos ao aprovado. Nenhum novo deploy foi iniciado; o commit integrado aguarda autorização exata. A produção anterior continua ativa.

A segunda tentativa autorizada, commit 94f066e / deploy 6ad0abedf8ca5991c929014d, foi bloqueada em 15/10/2026 às 07:35:39 (America/Sao_Paulo), antes de publicar. Passaram 15 dos 16 cenários executados, incluindo os dois históricos, e os três áudios; eram exigidos 21 cenários. A resposta de preço de teleconsulta estava correta, mas o modelo colocou consulta_online no campo procedure, cujo valor esperado era unknown. O gate de saída aceitou a mensagem, porém o gate de qualidade rejeitou a classificação. A correção explicita no prompt e no schema que modalidade pertence ao assunto da conversa e não substitui procedimento conhecido; parser, rótulos livres, prazos, retries e critérios de aprovação são preservados. A primeira tentativa e a limitação do diagnóstico anterior permanecem no recibo. Produção segue no deploy 6acff7b9dc7d30f39ad66b31 / commit cbda0cf. Recibo: auditorias/bruna-respostas-retomadas-2026-10-14/TENTATIVA-PUBLICACAO.json. A correção passou nos 2.207 testes integrais, nos 1.533 testes dos 74 arquivos de contratos e nos 19 testes simulados do gate, além do build e dos checks locais. O novo commit exato exige autorização antes da próxima publicação e ainda precisa passar pelos 21 cenários vivos.

## Problema e mudança

Diagnóstico recuperado do Cloud: uma pergunta conjunta sobre procedimento, preço e recuperação podia receber somente um aviso de confirmação de valor. A formulação “gostaria de saber sobre o procedimento” também não selecionava a explicação já aprovada. O candidato preserva as partes seguras e encaminha somente o que falta.

O responsável autorizou R$12–18mil para lipo de papada isolada nesta conversa. A tabela histórica indicada foi lida e não contém linha específica de papada/cervicoplastia; nenhuma equivalência com lipoaspiração genérica foi presumida. A faixa nova exige procedimento inequívoco, pedido de valor, envio único e ressalvas; associações não herdam essa referência.

## Estratégia de 15/10

A seleção foi baseada em leitura dos sistemas canônicos privados, preservando autoria, contexto, preferências, promessa, resposta posterior e vínculo de consulta. Prioridade: consulta iminente e respostas devidas, depois continuidade individual de intenção concreta. A seleção não aciona a fila nem envia mensagens. Datas mecânicas, flags falsas e cartões antigos não substituem evidência de elegibilidade. Detalhes identificáveis ficam nas fontes privadas, sem exportação para o repositório.

## Fontes e limites

Preflight Netlify/projeto/deploy e webhook público atuais, baseline Git b77b1d6, docs/contratos, histórico do chat Cloud, LEADS/CRM/compromissos/Central/retomadas/preferências/Calendar e tabela indicada. Não se afirma leitura de mídia omitida, entrega pelo provedor, editor Apps Script ou reservas privadas do worker. O planejamento individual foi escrito somente em Observação da equipe na Central canônica, após revalidar identidade, chave, oportunidade, profissional e mensagens. Releitura confirmou todos os alvos, nenhuma omissão e nenhum outro campo modificado. Pausas e recusa foram preservadas; detalhes identificáveis permanecem exclusivamente na fonte privada.

## Validação e publicação

A implementação inicial passou em 2.204 testes integrais e 1.635 da união de 83 arquivos de contratos, com sobreposição; 17 testes do gate hospedado eram simulados. Após o bloqueio, a correção passou na nova suíte de 2.205 testes integrais, 1.531 testes dos 74 arquivos obrigatórios de contratos e 18 testes simulados do gate. O novo teste de consistência do prompt falhou antes do reparo e passou depois. Build de 193 arquivos/54 URLs, arquitetura, contrato de mudança, diff e revisão independente passaram. Foram acrescentados 28 casos comportamentais e ampliadas as verificações de recibo e repetição contextual. A nova holding de papada exige recibo explícito do compromisso e alerta entregue; falha ou resposta ambígua conserva recuperação, sem promessa. Testes e recibos em REVISAO.json; estado local continua SYNC_PENDING. Publicação requer autorização do commit, preflight atualizado e gates vivos de modelo, áudio e histórico preservados. Não usar teste sintético como comprovação de resposta natural.

## Rollback e acompanhamento

Reverter somente o pacote por novo commit/build se houver indicação individual, confusão de procedimento/faixa, duplicidade ou promessa sem encaminhamento. Preservar dados, filas e recibos; sem replay. Daniel/equipe acompanha obrigações em 15/10, primeiras conversas e 48h após eventual publicação, com revisão em 22/10. Métrica: utilidade/completude, promessas atendidas, intervenção e consultas reais; ganho de conversão ainda não comprovado.
