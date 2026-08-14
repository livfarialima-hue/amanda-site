# Implementação da correção integrada — 14 de agosto de 2026

**Estado:** em execução local; não publicado

**Fonte estratégica:** `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`

**Evidência de origem:** `auditorias/auditoria-integrada-2026-08-13/`

## Contrato de execução

- O grão canônico é uma oportunidade por `Opportunity ID` e profissional.
- Telefone só pode substituir o identificador quando houver uma única correspondência ativa e inequívoca.
- Mudanças automáticas não rebaixam fase; uma correção humana explícita pode substituir a fase e deve deixar evento de auditoria.
- Consultas novas exigem `Opportunity ID`; backfill histórico deve ser conservador, reversível e produzir relatório de conflitos.
- Importações de mídia não recebem nome, telefone, e-mail, procedimento, conversa ou qualquer PII/PHI.
- Código local e commit devem representar o mesmo estado; publicação e migração ao vivo exigem autorização específica posterior.
- `/lifting-facial/` não pode sofrer alteração de texto, layout, vídeo, CTA ou característica.

## Etapas e critérios de aceite

| Etapa | Correção | Aceite local antes de publicação |
|---|---|---|
| 0 | Baseline, decisão estratégica e mapa de dependências | testes existentes aprovados; norte e histórico coerentes |
| 1 | Fase canônica e deduplicação | CRM e aba escritos pela mesma rotina; repetição idempotente; ambiguidade falha fechada |
| 2 | Consulta e Calendar | `Opportunity ID` obrigatório nos fluxos novos; evento Calendar persistido e reconciliável |
| 3 | Conversão offline Google | ledger e primeira aba reconciliados por transação; exatamente um click ID; zero PII |
| 4 | Atribuição Meta Site | `M26F02S` preservado de clique consentido até oportunidade; teste sintético sem dados reais |
| 5 | Bot e operação | contexto bilateral, silêncio/handoff e fila protegidos; SLA e exceções calculáveis |
| 6 | Site técnico seguro | somente correções técnicas aprovadas; regressão explícita garantindo lifting intocado |
| 7 | QA integrado e pacote de publicação | testes completos, auditoria de diff, migrações idempotentes, rollback e checklist externo |

## Baseline confirmado

- Branch local: `reestruturacao-site`.
- Estado inicial: árvore limpa, um commit local à frente da origem por causa da auditoria integrada.
- Testes antes das correções: **486 de 486 aprovados**.
- Publicação externa nesta implementação: **não autorizada**.

## Gates que permanecem externos

A aprovação deste trabalho local não prova os gates de produção. Depois da autorização de publicação, a observação deve demonstrar: sete dias de conversão Google saudável; 14 dias sem nova divergência CRM–aba; pelo menos 95% de reconciliação de novas consultas com Calendar; pelo menos 80% de cobertura consentida para `M26F02S`; SLA calculável em pelo menos 95% das novas conversas e nenhum P0/P1 vencido.
