# Execução das simulações da correção integrada — 14 de agosto de 2026

**Autorização:** o usuário autorizou iniciar a etapa em 14/08/2026, com escopo limitado à publicação da base do Apps Script e às simulações com `apply: false`.

**Resultado:** Apps Script publicado e saudável; nove simulações concluídas sem escrita. A migração integral permanece reprovada no estado atual e depende de nova autorização específica.

## Versões e backup

- Apps Script anterior registrado: versão 72, de 13/08/2026 às 22:24.
- Versões intermediárias publicadas durante a preparação: 73, 74 e 75.
- Versão final desta etapa: **76**, de 14/08/2026 às 08:27.
- Deployment ID preservado: `AKfycby-ylkJVFEcq5cfABOkazHBIszpissNJh2P8CEqYFMo0Hog5XP-e5KT3bcbSZuBUKX79A`.
- Endpoint validado por HTTP: status 200, `ok: true`, serviço `clinica-liv-leads`.
- Commits de diagnóstico: `0cba7a7`, `6b9e676` e `fe7cd27`.
- Backup nativo criado antes da etapa: [LEADS — backup antes da correção integrada — 2026-08-14](https://docs.google.com/spreadsheets/d/1OxPqMNNJCAifcbPxz9dMFmqw3vJxjWz7WvrdfcjMOj4/edit).
- Integridade estrutural do backup: 33 abas; `IMPORT_GOOGLE_ADS` permanece na primeira posição.

## Resultado consolidado das simulações

| Verificação | Resultado somente leitura | Decisão |
|---|---|---|
| Integridade do funil | 133 linhas operacionais; 130 oportunidades únicas; 2 grupos duplicados; 3 linhas excedentes; 27 divergências de fase; 2 oportunidades sem linha visível única; 36 consultas, das quais 26 sem `Opportunity ID` e 1 sem evento de Calendar | corrigir duplicidades antes de fases e funil |
| Deduplicação reversível | 2 grupos e 3 linhas excedentes; 2 ações planejadas; zero conflito de escolha | elegível para aplicação isolada após autorização |
| Fases históricas | 130 inspecionadas; 101 consistentes; 27 reparáveis; 2 bloqueadas pelas duplicidades | repetir após deduplicação |
| Consultas históricas | 36 inspecionadas; 26 sem identidade; nenhuma das 26 encontrou oportunidade única; 8 fases e 3 vínculos de Calendar potencialmente reparáveis | não aplicar em lote; investigar as 26 identidades ausentes |
| Atribuição histórica | 133 inspecionadas; 120 completas; 11 reparáveis; 2 conflitos de atribuição congelada; zero linha `M26F02S` identificada | não aplicar até revisar os 2 conflitos |
| Google Ads | 5 linhas de importação; 2 no ledger; zero linha inválida ou transação duplicada; 3 nomes de conversão divergentes; 3 registros sem ledger | reparo técnico elegível após autorização e nova conferência |
| Funil canônico | 128 linhas geráveis; 2 bloqueios causados pelas duplicidades | reconstruir somente após deduplicação e nova simulação |
| Reaper da classificação | 87 itens inspecionados; zero refileirável ou dead-letter automático; 8 exigem atenção | revisar os 8 casos antes de fechar o gate operacional |
| SLA operacional | 13 entradas; nenhuma resposta mensurável; cobertura 0%; mediana e p95 indisponíveis | instrumentação publicada, mas gate de SLA ainda não demonstrado |

## Decisão do gate

A aplicação integral foi interrompida antes da primeira escrita porque há bloqueios previstos no runbook: identidades históricas não reconciliadas, conflitos de atribuição congelada, duplicidades que afetam fases/funil e cobertura de SLA ainda nula. A próxima etapa tecnicamente segura é solicitar autorização apenas para a deduplicação reversível, repetir integridade/fases/funil e então decidir os reparos seguintes por bloco.

## Limites preservados

- Nenhuma função foi executada com `apply: true`.
- Nenhuma fórmula, célula de dados, evento do Calendar, conversão do Google Ads ou campanha foi alterada.
- Netlify e site não foram publicados nesta etapa.
- `/lifting-facial/` não foi alterada.
- Nenhum identificador de paciente, telefone, mensagem ou dado clínico foi persistido neste registro.
