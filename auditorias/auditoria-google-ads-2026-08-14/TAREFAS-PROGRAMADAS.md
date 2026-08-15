# Continuidade programada da auditoria Google Ads

**Atualizado em:** 15/08/2026

**Fuso:** America/Sao_Paulo

**Pasta no Drive:** `Amanda marketing / auditoria-google-ads-2026-08-14`

> **Governança:** este arquivo preserva o cronograma técnico da auditoria Google Ads. Para saber a próxima tarefa, o prazo vigente e se já chegou o momento de executar ou publicar, use `docs/PLANO-EXECUTIVO-AUDITORIAS-E-PENDENCIAS.md` e sua projeção única no Drive. Em caso de data divergente, o Plano Executivo prevalece após confirmação do estado ao vivo.

## Estado que a próxima execução deve preservar

- orçamento diário total: R$ 87;
- `S_BR_SP_LIFTING_CERVICAL`: R$ 12/dia;
- seis `_camp` e nove `_ag` canônicos conforme `INVENTARIO-TRACKING-E-RECURSOS-2026-08-15.csv`;
- `IMPORT_GOOGLE_ADS` sem eventos;
- cinco eventos legados em `quarantined_legacy`;
- conexão automática sem programação até prova de recibo;
- `Lead qualificado GCLID` ativa e totalmente otimizada na interface em 15/08;
- alerta de 50% isolado na ação antiga `Lead qualificado`, último upload 25/07;
- nenhuma nova campanha, PMax, ampla, tCPA ou aumento;
- experimentos de RSA em série, nunca em paralelo.

## Agenda externa criada

| Data | Bloco | Resultado esperado |
|---|---|---|
| 20/08 09:00 | Prova segura e possível início do RSA OTO adulto | recibo por evento, E2E reconciliado e decisão de religar ou manter pausado |
| 20/08 11:15 | Baseline 4G/CWV, vídeos e recursos | medianas de laboratório/campo e causas completas dos logotipos |
| 20/08 14:00 | Compliance de galerias e Codame/jurídico | inventário documental e parecer humano registrado |
| 27/08 09:00 | Saúde de sete dias | reconciliação de aceite, duplicidade, origem e funil |
| 03/09 09:00 | Decisão OTO e início CERV | um teste encerrado antes do próximo |
| 17/09 09:00 | Decisão CERV e início BLEF | decisão por contato válido/qualificado |
| 01/10 09:00 | Decisão BLEF e início FACE | decisão por funil, não CTR isolado |
| 15/10 09:00 | Decisão FACE e início da variante de composição em LIFT preço | início somente após encerramento de FACE; não prometer faixa pública |
| 12/11 09:00 | Leitura preliminar LIFT preço | decidir apenas com tracking validado e, preferencialmente, ≥100 cliques; senão prolongar observação |

Todos os eventos são privados e usam lembrete por e-mail com 1 dia e popup com 1 hora.

## Prompt único para retomar neste projeto

> Continue a execução da auditoria Google Ads salva em `auditorias/auditoria-google-ads-2026-08-14/`. Leia integralmente `AGENTS.md`, `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`, `EXECUCAO-2026-08-15.md`, `TAREFAS-PROGRAMADAS.md` e os CSVs de baseline. Antes de qualquer escrita externa, confirme o estado ao vivo e compare com o baseline. Execute somente a etapa cuja data, dependências e amostra já tenham sido cumpridas. Não fabrique click ID, não clique no próprio anúncio, não use PII/PHI e não trate N/D como zero. Não religue a importação sem recibo verificável por evento. Não misture orçamento, palavra-chave, RSA, recurso e página na mesma janela. Atualize Norte/histórico quando houver decisão, preserve local=commit=publicado e só publique após autorização explícita. Ao terminar, registre fato, cálculo, inferência, risco, métrica, guardrail, decisão e rollback.

## Limite da programação interna

O ambiente desta execução não disponibilizou uma ação direta para criar uma tarefa agendada do Codex. Por isso, a continuidade foi tornada durável por três meios: eventos do Google Calendar, este prompt versionado e os checkpoints no documento de execução. Uma tarefa nativa do Codex pode reutilizar o prompt acima quando o controle de Tarefas estiver disponível; até lá, o Calendar é o disparador operacional canônico.
