# Auditoria integrada de SEO, IA, atribuição e comunicação

Data: 15/08/2026
Fuso: America/Sao_Paulo
Escopo: código, site público, fontes autenticadas disponíveis, atribuição, WhatsApp, bot, LEADS, CRM, SEO, mecanismos de IA e comunicação.
Estado no fechamento da auditoria: **baseline histórico, auditoria e plano somente**. Naquele corte, nenhuma recomendação havia sido implementada e não houve commit, push, deploy, alteração em página, planilha, CRM, bot, anúncios, analytics, Search Console, e-mail ou Calendar.

**Adendo de execução:** o trabalho local posterior e os lembretes de projeto autorizados no Calendar estão documentados em `16-REGISTRO-DE-EXECUCAO.md`; o estado atualizado dos 59 itens está em `17-STATUS-RECOMENDACOES.csv`. Esses dois adendos prevalecem para saber o que foi preparado depois deste baseline. Ainda não houve commit, deploy, migração ou ativação em produção.

## Inteligência e modo realmente usados

| Papel | Modelo/esforço efetivamente exposto | Modo | Responsabilidade |
|---|---|---|---|
| Coordenação raiz | N/D — o runtime não expôs ao relatório o identificador/esforço do coordenador | Ultra, coordenação paralela | Norte, contexto, dados live, síntese, matrizes, plano e resolução de contradições |
| Agente 1 — código/SEO | GPT-5.6 Sol — extra-alto | paralelo | arquitetura, 44 URLs, SEO técnico, performance e Google |
| Agente 2 — descoberta IA | GPT-5.6 Sol — extra-alto, no mesmo especialista técnico | paralelo | crawlers, entidade, ChatGPT/Copilot/Gemini/Perplexity, schema e protocolo de mensuração |
| Agente 3 — atribuição/dados | GPT-5.6 Sol — extra-alto | paralelo | Meta/Google, site→WhatsApp, webhook, bot, LEADS, CRM, consentimento e privacidade |
| Agente 4 — comunicação | GPT-5.6 Sol — alto | paralelo | 44 páginas, CRO, linguagem médica, CFM, imagens e jornada |
| Reconciliação intermediária | GPT-5.6 Sol — extra-alto | independente, somente leitura | gates do Norte, prioridades, omissões, PII e causalidade |
| Revisão final | GPT-5.6 Sol — máximo | independente, somente leitura | aprovada após validar completude, CSVs, PII, cálculos, compatibilidade, 570/570 testes e ausência de implementação |

Ultra foi usado como coordenação paralela, não como nível de raciocínio. Os modelos recomendados para implementar e revisar cada item estão em `13-MATRIZ-DE-EXECUCAO.csv`; eles não devem ser confundidos com a inteligência efetivamente usada nesta auditoria.

## Cinco conclusões principais

1. **O site não apresenta bloqueio técnico global de rastreamento.** As 44 URLs do sitemap responderam 200, têm canonical autorreferente, title, description e H1; não foram encontradas páginas órfãs, rotas HTML fora do sitemap nem CTA de WhatsApp sem `data-track`. Isso não prova indexação integral nem bom Core Web Vitals: GSC, CrUX e PageSpeed atuais ficaram N/D.
2. **Meta Ads → site → WhatsApp → LEADS → CRM não está comprovado.** O fluxo atual preserva na mesma sessão um conjunto reduzido de UTMs, código e click IDs, mas não fecha IDs separados de conjunto/anúncio, landing, página do CTA, retorno posterior, nova aba, first/last touch ou caminho. Nenhuma linha do snapshot traz M26F02S exato; isso não equivale a zero contatos Meta Site. Manter verba nova em zero até a sonda E2E.
3. **Há P0 de privacidade/medição antes de qualquer escala.** Três dos cinco transaction IDs legados no staging/ledger são potencialmente derivados/reversíveis pelo formato; logs Netlify incluem fragmentos/IDs brutos e correlação semântica; o evento GA4 é capaz de enviar página/grupo/texto/posição do CTA em contexto médico; e `auditorias/` não está explicitamente excluída do deploy. O recebimento histórico externo/GA4 permanece N/D onde não há recibo.
4. **A atribuição estrutural da planilha está melhor, mas ainda não é semanticamente suficiente.** O snapshot tem 130 oportunidades Amanda na aba visível e 130 no CRM, sem divergência atual de fase/plataforma no recorte; porém first touch, last touch, conversa atual e caminho não existem como conceitos separados. A aba pode trocar a plataforma por prioridade Google > Meta > Orgânico > WhatsApp, enquanto o CRM congela apenas uma origem inicial simplificada.
5. **A comunicação clínica tem uma base forte, mas há decisões regulatórias urgentes a formalizar.** A lógica causa → indicação → limites → recuperação → próximo passo é consistente e deve ser preservada. Faixas públicas de lifting, galerias de resultados, conteúdo mamário/corporal e autorizações exigem contenção de expansão, inventário e parecer Codame/jurídico. A auditoria não declara ilegalidade nem ausência de consentimento; essas conclusões concretas são N/D até verificação formal.

## Riscos P0

| Risco | Fato observado | Interpretação segura | Contenção proposta |
|---|---|---|---|
| Transaction IDs | 3/5 formatos legados são potencialmente pessoais/derivados | reversibilidade prática e envio/aceite externo por linha são N/D | bloquear novos formatos inseguros; auditar recibos; desenhar HMAC/UUID e migração sem reenvio cego |
| Logs externos | código registra fragmentos de telefone, IDs brutos e, em um fluxo, procedimento correlacionável | volume/retensão real N/D | correlation ID HMAC opaco; sem PII/PHI; raw ID só no store protegido indispensável |
| GA4 semântico | código pode enviar path, tipo/grupo, texto e posição do CTA | receipt real é N/D; risco de interesse médico é inferência forte | validar Network/DebugView sintético; reduzir a evento genérico; revisar política |
| Relatórios no deploy | `.netlifyignore` não exclui `auditorias/`; publish dir não está explícito | exposição pública atual é N/D | inspecionar artefato; excluir `auditorias/**`; smoke 404 antes de deploy |
| Meta Site | sem prova E2E; captura/persistência/hierarquia insuficientes | zero M26F02S exato não é zero pacientes | verba nova zero; contrato, sonda 100%; depois cobertura ≥80% e duplicidade <2% |
| Google offline | 5 eventos `ready`; demais estados N/D | preparado não é enviado/aceito/atribuído | 100% dos elegíveis atuais reconciliados, zero PII/duplicidade e sete dias sem alerta |
| Calendar/funil | consulta real não está comprovada no mesmo grão em todas as fontes | “zero registrado/ligado” não prova zero real nem gargalo causal | ≥95% das novas consultas com Opportunity ID+evento válido; nenhuma confirmação órfã |
| Conteúdo/imagens | faixas, galerias e conteúdo corporal estão publicados; consentimentos não estão no repo | enquadramento e autorizações operacionais são N/D | congelar expansão/reuso; inventariar; obter Codame/jurídico; editar só em Fase 7 autorizada |

## Parecer Meta → site → WhatsApp → LEADS → CRM

**Não aprovado para investimento.** O código local prova somente um contrato parcial na mesma sessão. Hoje:

- a URL observada leva `origem=M26F02S`, source, medium, campaign e `utm_content`;
- o site preserva esse subconjunto em `sessionStorage` e pode anexar referência ao WhatsApp;
- não preserva first/last/path, landing, CTA, timestamps, retorno posterior e múltiplas abas;
- IDs separados de conjunto e anúncio não estão presentes no contrato observado;
- o webhook tem mapa manual parcial de anúncios e já registrou um ID Meta sem campanha mapeada na instrumentação recente;
- LEADS e CRM não materializam o caminho completo;
- não houve sonda real nesta auditoria porque o escopo proibiu lead falso em produção.

Critério de liberação: sonda controlada autorizada com 100% dos campos esperados e LEADS=CRM; depois, no teste consentido, cobertura de pelo menos 80% entre clique, conversa e oportunidade e duplicidade inferior a 2%, conforme o Norte. M26F01W continua como controle; M26F02S permanece sem verba nova.

## Confiabilidade atual da atribuição

| Camada | Parecer | Confiança |
|---|---|---|
| HTTP/URLs/CTA técnico | consistente nas 44 URLs | alta |
| Meta direto estruturado | código/parser funcionam para códigos/mapeamentos conhecidos; hierarquia completa não comprovada | média |
| Meta Site | não comprovado ponta a ponta | baixa |
| Google click ID local | GCLID suportado e observado; GBRAID/WBRAID só em testes locais | média para GCLID; baixa para outros |
| Conversão offline Google | 5 preparados; estados externos por linha N/D | baixa para resultado externo |
| LEADS versus CRM | cardinalidade/fase/plataforma atuais reconciliadas em 130/130 | alta estrutural; média-baixa semântica |
| Consulta/realização/fechamento por origem | requer Calendar/Opportunity e marcos no mesmo grão | N/D |
| IA como origem | não há referrer/taxonomia suficiente; ausência de referrer não é direto nem IA | baixa/N/D |

## SEO, Google e IA

- 44/44 URLs do sitemap: HTTP 200, canonical próprio, title, description e H1.
- 0 páginas órfãs e 0 rotas HTML adicionais encontradas no repo/links.
- 19/30 páginas com `dateModified` divergem do `lastmod`; precisa haver uma fonte editorial única, nunca a data automática do deploy.
- Mídia referenciada chega a 63,07 MB em uma página e um arquivo chega a 42,64 MB; impacto real é N/D porque PSI retornou 429 e não houve CWV atual.
- O domínio Wix antigo ainda aparece em resultado de busca, mas não resolveu por DNS na coleta; o conflito no índice é fato, disponibilidade atual e impacto são N/D/inferência.
- OAI-SearchBot, GPTBot, Googlebot, Google-Extended, Bingbot e PerplexityBot foram analisados separadamente. Permissão técnica não garante crawl, indexação ou citação.
- O grafo Physician/MedicalClinic existente é consistente e 43 blocos JSON-LD são parseáveis. Expansão de sameAs/schema é textual/semântica e pertence ao pacote E.
- Há 33 vídeos em 16 páginas sem VideoObject/track; só vídeos elegíveis, com metadados verdadeiros e legenda/transcrição aprovadas, devem ser considerados.
- ChatGPT, Copilot, Gemini e Perplexity: presença/citação estável N/D. O plano propõe protocolo mensal reproduzível, não “ranking de IA”.

## Comunicação

Preservar:

- decisão individualizada;
- explicação anatômica e clínica;
- riscos, limites e recuperação;
- tom sóbrio, sem garantia, medo ou pressão;
- passagem direta ao WhatsApp sem formulário intermediário.

Tratar depois da fase técnica, com autorização página a página:

- credencial UNICAMP canônica e documentalmente precisa;
- pacote prático da consulta nas 11 páginas que não o apresentam;
- taxonomia de 21 rótulos de CTA, apenas depois de fechar atribuição;
- fontes, revisão médica e datas em seis artigos sem marcador de fontes;
- frase fiscal condicionada, sem promessa de dedução;
- escaneabilidade mobile de páginas densas;
- identidade da clínica/diretor técnico apenas com documentação.

## Plano Mestre e pacotes

1. **Fase 0 — baseline:** versão, testes, schema, códigos, métricas e rollback.
2. **Fase 1 — Pacote A:** transaction IDs, logs, payload GA4, relatórios fora do deploy, desenho de receipts e contenção/inventário regulatório.
3. **Fase 2 — observabilidade:** estados, perdas, Calendar, SLA, rota e ação Google.
4. **Fase 3 — Pacote B:** SEO/IA puramente técnico, sem mudar significado.
5. **Fase 4 — Pacote C:** atribuição no código e sonda Meta Site.
6. **Fases 5–6 — Pacotes C/D/G:** Google offline, contrato de dados, migração autorizada, LEADS/CRM.
7. **Fase 7 — Pacotes E/F:** entidade, conteúdo, comunicação, CTA, imagens e CRO, somente após autorização específica.
8. **Fase 8 — Pacote G:** plataformas externas.
9. **Fase 9 — publicação/monitoramento:** local = commit = produção, após autorização do commit exato.

Detalhes: `12-PLANO-MESTRE-DE-MUDANCAS.md`, `13-MATRIZ-DE-EXECUCAO.csv` e `14-MAPA-DE-DEPENDENCIAS.md`.

## Cenários

| Cenário | Escopo | Resultado | Limitação |
|---|---|---|---|
| Conservador | P0 de privacidade/medição, observabilidade e contenção regulatória | reduz risco e impede decisão com dados falsos | Meta Site e crescimento orgânico ainda não avançam |
| Base recomendado | conservador + SEO técnico + atribuição + contrato LEADS/CRM | prova Meta Site e cria mensuração confiável, sem mudar comunicação | exige múltiplas autorizações técnicas e teste controlado |
| Completo | base + conteúdo/CRO + plataformas | maior potencial de descoberta/conversão | mais complexo; depende de Codame/jurídico e janelas isoladas |

## Quick wins seguros — após autorização

1. Excluir `auditorias/**` do artefato e testar 404.
2. Bloquear no código novos transaction IDs fora do formato opaco.
3. Remover PII/semântica de logs e validar payload GA4 sintético.
4. Congelar e exportar baseline GSC/Bing/Ads em modo somente leitura.
5. Adicionar checks de CI para sitemap, canonical, noindex, H1, links, redirects e órfãs.
6. Criar ficha canônica de códigos e entidade sem publicar alterações semânticas.

## O que não deve ser alterado agora

- verba, lances, correspondência, anúncios ou M26F02S;
- conteúdo, CTA, title, description, headings, alt, schema semântico, imagens, vídeos ou layout;
- `llms.txt` como atalho;
- papel da conversão ou metas no Google Ads sem confirmação atual e receipts;
- planilha/CRM antes da aprovação do contrato de dados;
- histórico por matching aproximado;
- GPTBot/OAI-SearchBot/Google-Extended sem decisão explícita da política correspondente;
- domínio antigo sem propriedade, DNS, inventário e mapa URL a URL;
- qualquer publicação antes de excluir a auditoria do artefato e confirmar o commit exato.

## Métricas e janelas

- privacidade/IDs/logs: cada build + 24 h/7/30 dias;
- Meta Site: sonda imediata, 7 e 14 dias; gate ≥80% e duplicidade <2%;
- Google offline: todos os elegíveis atuais + sete dias sem alerta; depois coortes de 30 dias;
- LEADS/CRM/Calendar/SLA: diário por 14 dias e semanal por 30;
- SEO/Search: 28 e 90 dias, com GSC atual quando autorizado;
- IA: protocolo mensal, ≥3 repetições por consulta fixa;
- comunicação: 28 dias ou ≥30 contatos válidos, uma variável por teste.

## Arquivos produzidos

1. `00-RESUMO-EXECUTIVO.md`
2. `01-INVENTARIO-DE-URLS.csv`
3. `02-SEO-TECNICO-GOOGLE.md`
4. `03-DESCOBERTA-CHATGPT-E-IA.md`
5. `04-ATRIBUICAO-PONTA-A-PONTA.md`
6. `05-META-SITE-WHATSAPP-LEADS.md`
7. `06-CONTRATO-DE-DADOS-ORIGEM.csv`
8. `07-PLANILHA-E-CRM.md`
9. `08-PRIVACIDADE-E-CONSENTIMENTO.md`
10. `09-COMUNICACAO-E-CONVERSAO.md`
11. `10-MATRIZ-DE-MUDANCAS.csv`
12. `11-PLANO-DE-TESTES.md`
13. `12-PLANO-MESTRE-DE-MUDANCAS.md`
14. `13-MATRIZ-DE-EXECUCAO.csv`
15. `14-MAPA-DE-DEPENDENCIAS.md`
16. `15-PLANO-DE-MENSURACAO.md`
17. `EVIDENCIAS.md`

## Limitações

- GSC, Bing Webmaster/AI Performance, CrUX e GA4 atuais não ficaram acessíveis nesta coleta; GA4 histórico é apenas contexto.
- PageSpeed Insights respondeu 429; experiência de campo é N/D.
- Visual mobile completo foi feito somente na home; o inventário HTML cobre as 44 URLs.
- Meta dinâmica não expôs todos os objetos de forma estável; a URL viva e snapshot anterior foram usados com limitação.
- Não houve lead sintético, clique real, mensagem, upload, conversão, email ou Calendar criado.
- Autorizações de imagem e registros institucionais podem existir fora do repo; ausência no repo é N/D.
- Parecer regulatório final depende de Codame/jurídico.
- Buscas e respostas de IA são snapshots voláteis.

## Primeira autorização recomendada

**Pacote A1–A5, somente contenção e desenho:** bloquear no código novos transaction IDs inseguros; substituir identificadores de logs por correlation ID opaco; excluir `auditorias/**` do artefato; validar/minimizar o payload GA4; desenhar o ledger/receipts e a migração sem escrever ainda na planilha de produção. Em paralelo, autorizar apenas o inventário restrito e a consulta Codame/jurídica de preço/galerias, sem editar o site.

Qualquer commit, migração em produção, alteração externa ou publicação será apresentado para autorização separada.

| Fase | Pacote | Objetivo | Prioridade | Modelo | Esforço | Ultra | Revisor | Dependência | Autorização |
|---|---|---|---|---|---|---|---|---|---|
| 1 | A1–A5 | conter IDs/logs/GA4/deploy e desenhar receipts | P0 | Sol extra-alto no desenho; Sol alto na implementação | extra-alto | sim | Sol extra-alto independente + privacidade | baseline e acesso somente leitura aos recibos | **solicitar primeiro** |
| 1 | A regulatório | congelar expansão, inventariar e obter parecer | P0 | Sol extra-alto | extra-alto | sim | Codame/jurídico + Sol extra-alto | documentos/autorizações fora do repo | autorização separada, sem edição |
| 2–3 | B | observabilidade e SEO/IA técnico | P1 | Sol alto; Terra alto na aplicação | alto | parcial | Sol alto | A concluído | posterior |
| 4–6 | C/D/G | provar atribuição e reconciliar dados | P0/P1 | Sol extra-alto; Terra alto nos testes | extra-alto | sim | Sol extra-alto | A+B+contrato | posterior |
| 7 | E/F | conteúdo, comunicação e CRO | P0–P2 | Sol alto/extra-alto | alto | por pacote | Sol + médica/Codame/jurídico | mensuração estável | página a página |
| 8–9 | G/publicação | aplicar externamente e publicar commit aprovado | conforme item | Sol/Terra alto | alto | não em tarefas mecânicas | Sol alto | autorização explícita | separada |
