# Mapa de dependências

Data-base: 15/08/2026
Estado: plano; nenhuma ação executada.

## Caminho crítico

```text
F0 baseline e contrato atual
  ├─> A1 transaction IDs seguros ─> A5 recibos offline ─> Google qualificado confiável
  ├─> A2 logs opacos ──────────────┐
  └─> contrato de privacidade ─────┼─> C atribuição no código
                                   │     ├─> D schema LEADS/CRM
                                   │     ├─> sonda Meta Site E2E
                                   │     └─> monitoramento de perdas
                                   └─> B SEO técnico

B + C + D estabilizados
  ├─> E descoberta com impacto textual
  ├─> F comunicação/CRO
  └─> G plataformas externas
          └─> F9 publicação e monitoramento por janela
```

## Dependências por trilha

| Mudança | Depende de | Pode ocorrer em paralelo com | Não agrupar com | Bloqueador/autoridade |
|---|---|---|---|---|
| Inventário/baseline | commit e produção identificados | leitura das fontes oficiais | qualquer write | nenhuma para leitura |
| Quarentena de transaction IDs legados | snapshot, mapa de consumidores, rollback | desenho de logs opacos | reenvio/importação externa | autorização para código/planilha e depois publicação |
| HMAC para transaction ID | política de segredo, chave estável, esquema versionado | testes unitários | troca de objetivo de conversão | autorização de segredo e migração |
| Remoção de `patientLast4`/IDs brutos de logs | inventário de logs e necessidade operacional | HMAC de transaction ID | redução prematura de observabilidade | autorização de código/publicação |
| Exclusão de `auditorias/**` do deploy | confirmar método e diretório real de publicação | demais contenções P0 | qualquer novo deploy antes do smoke 404 | autorização de código; depois publicação do commit exato |
| Minimização do `whatsapp_click` GA4 | baseline Network/DebugView sem paciente e revisão de privacidade | demais contenções P0 | troca simultânea do CTA/texto ou configuração GA4 | autorização de código; política só após aprovação textual |
| Estados `prepared/sent/accepted/...` | recibos ou API/export confiável | contrato de dados | Smart Bidding/escala | acesso/plataforma externa |
| Modelo first/last/path | contrato canônico e privacidade | SEO técnico independente | migração de planilha | aprovação do schema |
| Persistência TTL/retorno/múltiplas abas | modelo first/last, base legal e testes | parser de códigos | campanha Meta Site ativa | revisão de privacidade |
| Parâmetros Meta estáveis | catálogo M26 e objetos live | alterações internas sem plataforma | mudanças simultâneas de criativo/URL | autorização Meta Ads |
| Token opaco site→WhatsApp | serviço de resolução, TTL, ameaça e fallback | schema de eventos | envio de click ID/texto cru sem revisão | autorização técnica e de privacidade |
| Webhook e mapa de anúncios | parâmetros Meta e token | testes de idempotência | edição do bot não relacionada | autorização de backend/publicação |
| Migração LEADS/CRM | contrato aprovado, backup, teste em cópia | documentação | alterações diretas simultâneas no site | autorização de Sheets/CRM |
| Backfill | migração estável e regras determinísticas | nenhum backfill concorrente | matching por nome/telefone/texto | revisão humana; ambíguos ficam N/D |
| Meta Site E2E | C+D concluídos, ambiente/lead sintético autorizado | observabilidade | aumento de orçamento ou mudança de criativo | autorização de teste em produção |
| Liberação de teste M26F02S | sonda E2E aprovada | nenhuma mudança causal relevante | texto, vídeo, público, orçamento simultâneos | autorização de mídia; teto do Norte |
| Domínio Wix antigo | propriedade, inventário e mapa de URL | SEO técnico interno | desligar antes de redirects | acesso Wix/DNS e autorização externa |
| Canonicals/redirects/sitemap | inventário completo | performance técnica | mudança de texto/estrutura informacional | autorização de código/publicação |
| Regras de crawlers | política de pesquisa versus treinamento | outros ajustes técnicos | afirmar garantia de citação | decisão explícita sobre GPTBot |
| Schema de entidade | conteúdo visível, credenciais e fontes verificadas | plano editorial | inventar serviços/afirmações | aprovação de conteúdo/publicação |
| Preços/galerias/conteúdo sensível | parecer Codame/jurídico e inventário de consentimentos | diagnóstico técnico | experimento CRO simultâneo | aprovação médica/jurídica e de conteúdo |
| Comunicação/CTA | mensuração estabilizada e hipótese isolada | uma página/grupo controle | alterações simultâneas de anúncio e landing | aprovação página a página |
| Search Console/Bing/IndexNow/Ads/Meta | código publicado e verificado | monitoramento | writes automáticos/recomendações automáticas | autorização externa específica |

## Paralelismo seguro

- Desenvolvimento de testes unitários de atribuição pode ocorrer enquanto se inventariam URLs, desde que os arquivos sejam separados.
- Otimização de bytes/cache pode ocorrer em paralelo ao desenho do contrato de dados, se não tocar CTAs, scripts de atribuição nem texto.
- Revisão Codame/jurídica pode ocorrer em paralelo aos pacotes técnicos; a implementação do resultado deve esperar autorização de conteúdo.
- Documentação e matriz de aliases podem ser preparadas em paralelo, mas só se tornam canônicas junto com o código aprovado.
- Inventário de propriedade do domínio antigo pode ocorrer em paralelo; redirects/desligamento ficam bloqueados até o mapa completo.

## Mudanças que contaminam medição

Não executar na mesma janela:

- captura/persistência de atribuição e aumento de orçamento Meta Site;
- novo CTA e novo criativo/anúncio para a mesma rota;
- landing nova e mudança de correspondência/orçamento no Google Ads;
- schema/texto/estrutura e avaliação de CTR orgânico na mesma data sem anotação;
- mudança de bot e de retomada humana enquanto se mede taxa de qualificação;
- migração de status do CRM e alteração do classificador de etapas.

## Aprovações externas separadas

1. Google Ads/Data Manager: histórico e recibos; depois qualquer configuração.
2. Meta Ads: parâmetros e, só após E2E, teste de investimento.
3. Search Console/Bing/IndexNow: submissões ou configurações.
4. Wix/DNS: migração ou desligamento do domínio antigo.
5. Google Sheets/CRM: schema, migração e backfill.
6. Codame/jurídico e médica: preços, galerias, conteúdo sensível e comunicação.
7. Publicação: somente depois de commit intencional e autorização do commit exato.

## Rollback por camada

- **Código:** feature flag, commit-base e reversão apenas do pacote autorizado.
- **Dados:** backup, migração append-only, ledger de alterações e proibição de apagar a referência original.
- **Plataformas:** export/screenshot da configuração anterior, mudança unitária e confirmação posterior.
- **Domínio:** manter rotas antigas até redirects e indexação serem verificados; nunca desligar primeiro.
- **Conteúdo:** versão anterior preservada e rollback página a página.
- **Mídia:** orçamento/veiculação anterior documentados; interromper teste sem mexer no controle.

## Definição de desbloqueio

Uma dependência só é considerada resolvida com evidência, responsável, timestamp e teste. “Código pronto” não desbloqueia uma etapa que exija prova em produção; “evento preparado” não desbloqueia uma etapa que exija recibo de aceitação; “crawler permitido” não desbloqueia uma conclusão de indexação ou citação.
