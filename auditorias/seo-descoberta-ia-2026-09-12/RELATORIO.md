# SEO e descoberta por IA — Dra. Amanda Schroeder

Data: 12/09/2026, horário de São Paulo. Candidato `SITE-SEO-AI-DISCOVERY-2026-09-12`. Situação: implementação local, publicação ainda não realizada. O Plano Executivo continua sendo o único painel de próximas ações.

## Conclusão executiva

O site já é acessível e tem conteúdo estático, páginas canônicas, biblioteca e sitemap. A prioridade é tornar a identidade profissional mais clara, melhorar a apresentação dos resultados que já recebem impressões e corrigir endereços específicos. Não há fundamento para multiplicar artigos semelhantes, criar páginas de cidades ou prometer posição/citação em IA. A finalidade continua sendo interesse qualificado em uma consulta com Amanda, não tráfego a qualquer custo.

## Fontes e limites

Cinco arquivos originais, lidos sem edição em `C:/Users/danie/Downloads/`, todos com prefixo `draamandaschroeder.com.br-`:

| Arquivo, após o prefixo | SHA-256 |
|---|---|
| Performance-on-Search-2026-09-12.xlsx | C68B40A9F1BC42EB8A4E4FF6AFD2B3F6529219289B678F460F92390D748D9B62 |
| Coverage-2026-09-12.xlsx | 4ACFC2EB53A49762A4D1E1EEDA208683DB575B3D04C0CC270AB12AD9E73FB8DF |
| Coverage-Drilldown-2026-09-12.xlsx | 4B81FF872B3988E19AA0DB88508AC8235247320C985F7B953EA3C203AFE5E4D7 |
| Coverage-Drilldown-2026-09-12-1.xlsx | 24B6394BADD9FFA9AF17DE52CE1050F81DCA85D585F01289A069AB36D67C1C92 |
| Coverage-Drilldown-2026-09-12-2.xlsx | E3C592DA12BA2222C6329133CAFA9A739033DFB59D2A4B9DB9224E268F6B6A6B |

O filtro informa Web/últimos três meses, mas a aba Gráfico tem 64 datas contínuas, de 09/07 a 10/09. Cobertura e drilldowns terminam em 03/09. Nenhum deles mede o resultado das publicações de hoje. As tentativas de acesso ao navegador falharam antes da inicialização; as duas planilhas compartilhadas retornaram 403 no conector. Não foi solicitado compartilhamento público nem extraída autenticação do Chrome.

As posições que vieram como datas são N/D: não se reconstrói um decimal a partir de uma data. Os registros de rastreamento em 31/12/1969 das duas páginas apenas detectadas são ausência/artefato do export, não rastreamento real. CTR foi recalculada por cliques ÷ impressões. Totais por página, consulta e propriedade têm granularidades diferentes; consultas omitidas por privacidade impedem interpretar a tabela de consultas como todo o tráfego. [Definições do Search Console](https://support.google.com/webmasters/answer/17010961?hl=en).

## O que os dados mostram

| Recorte da aba Gráfico | Cliques | Impressões | CTR recalculada |
|---|---:|---:|---:|
| 09/07–10/09, 64 dias | 21 | 2.042 | 1,03% |
| 17/07–13/08, 28 dias | 7 | 424 | 1,65% |
| 14/08–10/09, 28 dias | 10 | 1.550 | 0,65% |

Impressões cresceram 265,6%, mas são apenas três cliques adicionais. Há maior exposição, não demonstração de consultas ou efeito causal das mudanças. A queda da CTR pode envolver composição de páginas/consultas/dispositivos; não foi atribuída a um motivo sem os cruzamentos necessários. Gráfico, Países e Dispositivos concordam em 21/2.042. A tabela Páginas soma 22/2.446 e Consultas 5/281; não foram somadas entre si nem substituíram o total da propriedade.

Oportunidades na aba Páginas: guia de preço de lifting facial, linha 4, 552 impressões/3 cliques (0,54%); mama, linha 11, 508/0; corporal, linha 12, 266/0. As posições médias numéricas desses registros são 7,83, 9,23 e 11,17; não são a posição atual de uma busca específica. Melhorar a descrição do que a pessoa encontrará é um teste de apresentação, não licença para inventar preços ou prometer orçamento sem consulta. Todos os 40 endereços da tabela pertencem ao sitemap anterior; ausência de uma página nesse export não prova não indexação.

## Indexação: decisão por endereço

Cobertura em 03/09: 42 indexadas e oito não indexadas entre 50 endereços conhecidos. Os motivos somam oito: três redirecionamentos, um 404, duas detectadas e duas rastreadas. As três URLs redirecionadas não constam dos arquivos de detalhe fornecidos; sua exclusão do índice pode ser esperada. Não chamar todos os itens da aba “Problemas críticos” de falhas críticas.

| Detalhe, aba Tabela | Verificação pública em 12/09, 22:25 BRT | Decisão |
|---|---|---|
| 404, A2: `/conteudos/ Toxina [quebra de linha]botulínica-preenchimento-bioestimulador/` | Tanto a codificação literal quanto a normalização do navegador respondem 404; artigo correto responde 200 | Duas regras exatas de 301 para `/conteudos/botox-preenchimento-bioestimulador/`; nenhum link interno para a forma malformada foi encontrado |
| Detectada, A2: `/avaliacao-facial/` | 200, canonical próprio, presente no sitemap e ligado no site | Preservar e reforçar identidade/navegação; inspeção GSC após recrawl |
| Detectada, A3: `/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` | 200, canonical próprio, presente no sitemap e biblioteca | Manter função de guia geral, distinta dos guias por procedimento; não clonar nem excluir |
| Rastreada, A2: `/campanhas/assets/amanda-apresentacao.mp4?v=optimized-20260710` | 200, `video/mp4` | Não é uma página comercial ausente. Preservar vídeo e seu carregamento; não forçar indexação como HTML |
| Rastreada, A3: `/rejuvenesca-com-naturalidade-e-sofisticacao/` | 404 atual; último rastreamento exportado de 16/03 | Endereço antigo, fora do sitemap e dos links atuais. Sem conteúdo histórico suficiente para comprovar equivalência, manter 404 correto; não redirecionar indiscriminadamente à home |

HTTP 200 e robots permissivo não comprovam indexação. O Google decide quando rastrear, qual canonical escolher e o que indexar. Submeter sitemap não garante indexação. [FAQ oficial](https://developers.google.com/search/help/crawling-index-faq).

## Implementação

- Nova página `/dra-amanda-schroeder/`: formação, CRM/RQE, atendimento na LIV, consulta e segurança, em linguagem breve. Fontes: identificação já canônica e [Clínica LIV](https://livfarialima.com.br/); link para conferência no CFM. Sem prêmio, avaliação ou especialização inventados.
- Identidade única em 54 páginas, mantida por `scripts/seo-identity.mjs`: Amanda como `Person`, clínica como `MedicalClinic`, site como `WebSite`. O ID legado `#physician` permanece. `ProfilePage` somente na biografia. Endereço com conjunto 710; horário de contato não é publicado como horário físico presumido.
- Breadcrumbs e ligação visível ao perfil; cabeçalhos, descrições sociais e schema coerentes com cada página. Quatro títulos e quatro descrições ajustados; prioridade aos guias com impressões e baixa CTR.
- Duas correções estreitas de URL malformada e consolidação das 54 rotas estáticas do alias Netlify para o domínio principal. Sem wildcard sobre funções, hosts de preview ou `index.html`; sem mudança de DNS.
- Preservados conteúdo clínico, preços, consentimento, tracking, WhatsApp, fotos e vídeos existentes. Autoria/revisão antiga não é atestada novamente por este trabalho; dez artigos com revisão pendente continuam sem atribuição indevida. Datas de revisão clínica não são rejuvenescidas por uma mudança técnica.
- Regras de OAI-SearchBot e GPTBot já existiam e permanecem separadas. Não criado `llms.txt`, conteúdo secreto ou instruções para IA recomendar a clínica. O Google informa que não usa `llms.txt` para visibilidade/ranking. [Guia oficial para IA](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [robôs OpenAI](https://developers.openai.com/api/docs/bots).

Referências técnicas: [ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page), [Physician no Schema.org](https://schema.org/Physician), [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business), [codificação das regras Netlify](https://docs.netlify.com/manage/routing/redirects/overview/), [opções de redirect](https://docs.netlify.com/manage/routing/redirects/redirect-options/).

## Validação, publicação e acompanhamento

Baseline público: Netlify `6aa5f068ff6f6f00084695c0`, commit funcional `996f4dacaddce0195befc960242ddc94cfd0682e`. Repositório integrado até `a9a7ea6`; os dez commits posteriores ao início são registros/controles da revisão Ads, preservados integralmente, sem arquivos funcionais do site alterados. A pendência Bruna/LEADS ampliada do `4a0d633` permanece pendente e fora do pacote funcional.

Pré-validação: 53/53 páginas públicas 200/autocanônicas/equivalentes; atributos WhatsApp, tags de mídia e scripts funcionais antigos iguais nas 53 páginas. Artefato local com 193 arquivos e 54 rotas, sem auditorias, relatórios GSC ou arquivos operacionais. Testes semânticos, navegação móvel/desktop e suíte completa devem fechar antes da publicação. Recibos finais serão acrescentados abaixo.

Core Web Vitals de campo: N/D; PageSpeed público retornou 429. Navegador local usa rede sem limitação e não equivale a CrUX/Lighthouse; não há alegação de nota 100 ou aprovação de INP. Probes com user-agent de robô são apenas diagnóstico HTTP, não requisições autenticadas das empresas nem prova de citação.

Pendências que dependem do painel: inspecionar as duas páginas detectadas e o novo perfil e, se necessário, solicitar indexação; conferir sitemap, ações manuais/segurança, Core Web Vitals e controles/relatório de recursos de IA disponíveis na propriedade. Nada disso foi marcado como executado. Não usar a Indexing API de vagas/lives para páginas médicas comuns.

Revisão: integridade após publicação e em 24h; indexação após novo rastreamento; primeira leitura em 26/09 e comparação de 28 dias em 10/10. Janelas são observação, não bloqueio de novas correções. Métricas finais: contatos orgânicos válidos, qualificados e consultas, quando houver atribuição verificável. Oscilação de baixa amostra não exige reversão. Corrigir imediatamente regressão técnica ou informação imprecisa. Não foi criada automação.

### Recibos finais

Validação local: **1.357/1.357 testes**, arquitetura e escopo de 72 arquivos aprovados; build de 193 arquivos/54 URLs, sem vazamentos de auditoria. Chrome local: 20 combinações de dez páginas e duas larguras, 390/1440 px, sem overflow, sem imagens quebradas detectadas e com link institucional após execução do JavaScript. Inspeção visual corrigiu a proporção da foto apenas no novo perfil. Um caso de CLS local de aproximadamente 0,142 em artigo legado precisa de medição de campo; não se declara aprovação de Core Web Vitals.

O teste no navegador revelou que o rodapé dinâmico removia o novo link institucional. Foi acrescentado um único link ao template em `site-enhancements.js` e atualizada sua revisão de cache nas páginas consumidoras; tracking, consentimento e demais comportamentos foram preservados. Três asserções de versão no teste de site situado em `apps-script/clinica-liv-leads/site-contrast.test.mjs` foram atualizadas; nenhum arquivo executável do Apps Script foi alterado. Conferência dos IDs canônicos concluída somente em leitura.

Conferência viva de 12/09 às 22:36 BRT: 191 arquivos do provedor comparados, zero divergência não prevista da base; delta público exato de 56 arquivos existentes e um novo perfil, sem remoções. Doze funções e cinco programações capturadas para comparação pós-publicação. Atributos WhatsApp e tags de mídia nas 53 páginas antigas permanecem idênticos; scripts no HTML diferem apenas pela revisão do rodapé. Nova releitura dos três drilldowns às 22:39 confirma os status iniciais.

Governança paralela: a ampliação Bruna/retomadas de cuidado foi relida do commit `6327ce3c8a7a48b8bfd0b7e418d3d97fa68f7fe3`; sua projeção de 162963 caracteres coincidiu com o Drive. Incorporado apenas o registro no Plano, sem publicar o código pendente ou acionar atendimento.

Pendente: commit, deploy, pós-voo e igualdade da projeção no Drive.
