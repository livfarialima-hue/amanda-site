# Plano Mestre de Mudanças

Data-base: 15/08/2026
Fuso: America/Sao_Paulo
Situação no fechamento da auditoria: proposta; nenhuma mudança deste plano havia sido implementada naquele corte.

**Adendos atuais:** consulte `16-REGISTRO-DE-EXECUCAO.md` para a implementação local posterior e os lembretes de projeto autorizados, e `17-STATUS-RECOMENDACOES.csv` para o estado atualizado dos 59 itens. O plano abaixo permanece como baseline decisório; os adendos não significam publicação, migração ou ativação live.

## Decisão central

O cenário base recomendado começa por privacidade, medição e atribuição. Não é seguro usar mais tráfego ou comunicação como primeiro movimento enquanto:

1. três dos cinco transaction IDs legados presentes no staging/ledger puderem carregar identificador pessoal derivado ou reversível;
2. o fluxo Meta Ads → site → WhatsApp → LEADS → CRM não tiver uma prova controlada ponta a ponta;
3. first touch, last touch e caminho ainda forem projetados como um único rótulo de plataforma;
4. eventos offline não tiverem recibos que separem preparado, enviado, aceito, rejeitado, duplicado e atribuído;
5. documentação de consentimento e comportamento do código divergirem.
6. o evento `whatsapp_click` puder enviar página/grupo/texto/posição semanticamente associados a interesse médico, enquanto o recebimento efetivo no GA4 ainda é N/D.

O Norte Estratégico permanece canônico: não aumentar investimento em M26F02S e não usar o sinal offline para escala ou Smart Bidding até os respectivos gates serem cumpridos.

## Pacotes autorizáveis

| Pacote | Escopo | Inclui | Exclui | Saída de aceite |
|---|---|---|---|---|
| A — contenção crítica | Privacidade, corrupção e perdas P0 | bloquear novos IDs inseguros; inventariar possível envio histórico; transaction ID opaco; correlation ID de logs; impedir que `auditorias/**` entre em deploy; quarentena reversível; validação jurídica/Codame como ação separada | conteúdo, SEO, anúncios, mídia, backfill especulativo | zero novo ID reversível; auditorias fora do artefato público; rollback testado; relatório de histórico sem PII |
| B — código técnico sem comunicação | SEO, rastreabilidade técnica, performance e crawlers | HTTP/canonical/redirect/sitemap/robots/cache/carregamento/marcação estrutural/observabilidade/testes | qualquer mudança de significado, texto, CTA, alt, schema semântico novo | build/testes/smoke e inventário de URL aprovados |
| C — atribuição no código | Captura, persistência, transporte e webhook | first/last touch, caminho, G26/M26, landing/CTA, TTL, múltiplas abas, token opaco, confiança, deduplicação | planilha/CRM em produção e parâmetros externos sem autorização | 25 testes em sandbox; contrato ponta a ponta aprovado |
| D — planilha e CRM | Contrato de dados e projeções | colunas canônicas, enums, migração, reconciliação, recibos, dashboards, prevenção de sobrescrita | backfill incerto e alterações sem cópia/rollback | schema versionado; LEADS=CRM nos registros sintéticos |
| E — descoberta com impacto textual | Conteúdo encontrável e entidade | titles, descriptions, headings, alt, âncoras, schema semântico, autoria, revisão, FAQ e trechos citáveis | aplicação sem aprovação página a página | pacote de textos/diffs aprovado e conformidade revista |
| F — comunicação e conversão | Jornada e persuasão médica | textos, CTAs, layout, imagens, vídeos, WhatsApp e continuidade anúncio-página | mudanças técnicas não relacionadas | experimento isolado, hipótese e guardrail definidos |
| G — plataformas externas | Configurações autenticadas | Search Console, Bing Webmaster/IndexNow, GA4, Google Ads e Meta Ads | aplicação automática de recomendações | confirmação por tela/recibo e log de mudança |

## Fases e ordem

| Fase | Objetivo | Pacotes | Inteligência para desenho | Implementação | Revisão | Gate de saída |
|---|---|---|---|---|---|---|
| 0 — linha de base | Congelar versão, métricas, schema, códigos, testes e rollback | todos | Terra alto; Sol extra-alto se houver divergência | Terra alto | Sol alto | commit, produção e baseline identificados sem alteração |
| 1 — riscos P0 | Conter exposição, corrupção e medição inválida | A | Sol extra-alto | Sol alto | Sol extra-alto | zero novo identificador reversível; envios externos seguros ou bloqueados |
| 2 — observabilidade | Tornar perdas e estados visíveis | A, C, D | Sol alto | Terra alto | Sol alto | cada etapa e erro têm estado, timestamp e ID opaco |
| 3 — SEO/IA técnico | Corrigir infraestrutura sem mudar comunicação | B | Sol alto; Sol extra-alto para domínio/canonical | Terra alto | Sol alto | inventário 100%, build e smoke aprovados; nenhum texto alterado |
| 4 — Meta → site → contato | Fechar parâmetros, sessão/retorno, webhook, LEADS e CRM | C, D | Sol extra-alto ou máximo | Sol alto + Terra alto nos testes | Sol extra-alto | cenário Meta Site passa E2E e reconcilia LEADS/CRM |
| 5 — Google/offline | Fechar G26, click IDs, transaction IDs, recibos e deduplicação | C, D, G | Sol extra-alto | Sol alto | Sol extra-alto | 100% dos eventos elegíveis atuais reconciliados; sete dias sem alerta; zero PII/duplicidade |
| 6 — planilha/CRM | Migrar schema aprovado e painéis | D | Sol extra-alto | Sol alto/Terra alto | Sol extra-alto | migração reversível, sem divergência e sem campos duplicados |
| 7 — comunicação | Testar mudanças sem contaminar mensuração | E, F | Sol alto; extra-alto em comunicação médica sensível | Terra alto após texto aprovado | Sol alto + revisão médica/jurídica quando necessária | uma hipótese por janela, sem promessa excessiva |
| 8 — plataformas externas | Aplicar apenas configurações autorizadas | G | Sol alto | Terra alto | Sol alto | recibo/tela + documentação + reconciliação |
| 9 — publicação e monitoramento | Publicar exatamente o commit aprovado e medir | todos | Sol alto | Terra alto | Sol alto | local = commit = produção; smoke e janela de observação registrados |

## Desenho das mudanças críticas

### A1 — transaction IDs e conversões offline

1. Pausar a geração ou projeção de novos IDs que não cumpram um formato opaco versionado.
2. Auditar o histórico do Data Manager sem expor valores e classificar cada evento legado como `não enviado`, `aceite N/D`, `aceito`, `rejeitado` ou `duplicado`, conforme recibo real.
3. Gerar novo transaction ID com HMAC-SHA-256 e segredo de pelo menos 32 bytes, domínio/versionamento próprios e entrada estável que não contenha PII nem click ID.
4. Guardar o vínculo interno somente no ambiente protegido necessário à operação.
5. Não reenviar eventos legados até resolver risco de duplicidade e estado externo.
6. Fazer migração reversível do staging/ledger; o rollback interrompe projeção, mas nunca restaura o formato inseguro.

### A2 — logs e correlação

Substituir `patientLast4`, raw `wamid` e outros identificadores reversíveis nos logs externos por correlation ID HMAC opaco. O ID bruto só pode existir no armazenamento operacional protegido quando tecnicamente indispensável, com acesso e retenção definidos. Logs não devem conter conteúdo de mensagem ou informação clínica.

### A3 — isolamento dos relatórios internos

`.netlifyignore` não exclui atualmente `auditorias/` e `netlify.toml` não explicita o diretório publicado. Antes do próximo deploy, confirmar o manifesto/publish dir, excluir `auditorias/**` do artefato e executar smoke test que exija 404 para uma rota sentinela. A auditoria não comprovou exposição pública atual; o risco é preventivo.

### A4 — minimização do evento GA4

O código é capaz de enviar `page_path`, grupo/tipo de página e texto/posição do CTA no evento `whatsapp_click`. Em um site médico, esses parâmetros podem revelar interesse em procedimento. O recebimento real no GA4 não foi comprovado. Antes de inferir exposição, validar Network/DebugView sem paciente; como contenção de desenho, reduzir o evento a payload genérico não semântico e alinhar a política pública somente com revisão de privacidade/jurídica.

### A5 — recibos e estados offline

Projetar o ledger com estados separados `prepared`, `sent`, `accepted`, `rejected`, `duplicate` e `attributed`, mantendo o recibo limitado e o erro sem PII. Para o backlog atual, todos os eventos elegíveis precisam de estado reconciliado; não usar uma tolerância percentual para deixar evento N/D. A auditoria não enviou conversões e não alterou a plataforma.

### C1 — modelo de atribuição

O modelo recomendado é orientado a eventos, e não a uma única coluna de origem:

- `first_touch`: imutável após captura válida;
- `last_touch`: último toque identificável, sem apagar o primeiro;
- `conversation_origin`: origem da conversa atual;
- `conversion_path`: sequência normalizada;
- `patient_reported_source`: informação declarada, separada da evidência técnica;
- dimensões de campanha/anúncio e landing/CTA;
- `confidence` e `fallback_reason` obrigatórios;
- projeções visíveis derivadas do ledger, sem ranking Google > Meta que reescreva história.

### C2 — Meta Site

Definir códigos estáveis de campanha, conjunto, anúncio e criativo na plataforma; capturar os parâmetros na landing; preservar navegação, mudança de aba e retorno dentro de TTL; registrar landing e CTA separadamente; transportar um token opaco; resolver o token no webhook; materializar em LEADS/CRM; impedir que retorno direto sobrescreva Meta. Somente depois executar uma sonda controlada e liberar investimento de teste.

O gate permanece o do Norte: sonda controlada com 100% dos campos esperados; em seguida cobertura consentida de pelo menos 80% entre clique, conversa e oportunidade, com duplicidade inferior a 2%. Não elevar esse limiar silenciosamente nem tratá-lo como garantia de causalidade.

### D1 — planilha e CRM

Inventariar e adaptar o schema existente antes de criar campos. Remover cabeçalhos placeholder/duplicados somente com migração aprovada. Manter valores enumerados e validações. Registrar estados de conversão offline e não depender da posição da aba. Fazer backfill apenas com correspondência determinística; o restante permanece N/D.

### B/E — SEO e descoberta

Primeiro executar apenas correções técnicas sem mudança de significado. Alterações de title, description, headings, alt, âncoras, schema semântico, FAQ ou autoria pertencem ao pacote E, mesmo quando realizadas em código. O conflito do domínio Wix antigo deve ser resolvido como decisão de propriedade/migração, com inventário de URLs e redirects antes de qualquer desligamento.

### F — comunicação e conformidade

Propostas de texto, preço, galeria, aviso de conteúdo sensível e CTA ficam fora das fases técnicas. As inferências regulatórias precisam de validação Codame/jurídica e de conferência das autorizações de imagem, que não são comprovadas pelo repositório. A ausência de autorização no código é N/D, não prova de ausência operacional.

## Dependências que impedem paralelismo

- Não migrar planilha antes de aprovar o contrato de dados.
- Não testar Meta Site com investimento antes de C1/C2 e os testes de privacidade.
- Não reimportar conversões legadas antes do inventário de recibos.
- Não alterar domínio antigo sem propriedade e mapa de redirects confirmados.
- Não mudar comunicação e tráfego na mesma janela de um teste de atribuição.
- Não publicar schema semântico antes de validar que o conteúdo visível o sustenta.

## Cenários

### Conservador

Escopo: Fases 0–2 e apenas o P0 técnico do Pacote A. Mantém mídia e comunicação inalteradas. É a menor superfície de risco e deve terminar em IDs/logs seguros, recibos observáveis e baseline confiável. Limitação: Meta Site continua sem possibilidade de escala e a descoberta orgânica não melhora ainda.

Inteligência: Sol extra-alto no desenho e revisão; Sol alto na implementação; Terra alto no QA mecânico.

### Base recomendado

Escopo: cenário conservador + Pacotes B, C e D nas Fases 3–6. Corrige SEO técnico, cria o contrato de atribuição, prova Meta → site → contato e reconcilia planilha/CRM, sem mudar comunicação. É o melhor equilíbrio entre impacto, risco e capacidade de medir.

Inteligência: Sol extra-alto na arquitetura de dados/atribuição; Sol alto nas decisões SEO; Terra alto em implementação delimitada e testes; Sol extra-alto no QA ponta a ponta.

### Completo

Escopo: cenário base + Pacotes E, F e G. Inclui comunicação, entidade, conteúdo, CTAs, imagens/vídeos e plataformas externas em janelas separadas. Tem maior potencial, mas depende de autorização página a página, revisão médica/regulatória e baseline estabilizado. Não há promessa de ranking, citação por IA ou conversão.

Inteligência: Sol alto/extra-alto para propostas médicas e estratégia; Terra alto para aplicar textos já aprovados; Sol alto + revisão humana especializada para conformidade.

## Economia de inteligência

- **Sol extra-alto/máximo:** arquitetura multi-sistema, privacidade, migração de IDs, precedência first/last touch, conflitos de canonical/domínio e revisão final. Usar inteligência inferior aumenta o risco de falsa atribuição, duplicidade ou rollback incompleto.
- **Sol alto:** SEO técnico, schema, webhook, regras de negócio e comunicação médica. Alternativa econômica: Terra alto implementa um desenho já fechado, com revisão Sol.
- **Terra alto:** mudanças delimitadas, normalização, fórmulas aprovadas, documentação e testes. Não deve decidir sozinho questões críticas.
- **Terra médio:** inventário e conferências repetitivas. Sempre escalar discrepâncias ao Sol.
- **Ultra:** somente quando frentes independentes possam avançar em paralelo sem editar o mesmo arquivo e houver uma revisão única posterior.

## Publicação e consistência

Para cada futura autorização:

1. registrar commit-base e versão pública;
2. aplicar apenas o pacote autorizado;
3. testar e revisar o diff;
4. atualizar a documentação canônica se a estratégia mudar;
5. obter autorização de publicação;
6. criar commit intencional;
7. publicar exatamente esse commit;
8. validar produção e smoke tests;
9. confirmar que versão local, commit e publicação são iguais.

## Primeira autorização recomendada

Autorizar apenas **Pacote A1/A2/A3/A4/A5 — contenção de privacidade e medição**: bloquear no código a geração de novos transaction IDs reversíveis, substituir identificadores de logs externos por IDs opacos, excluir relatórios internos do artefato de deploy, validar/minimizar o payload GA4 e **desenhar** a migração/ledger de recibos. A auditoria histórica pode ser somente leitura. Qualquer escrita ou migração na planilha de produção, configuração externa, commit ou publicação exige autorização posterior e específica.
