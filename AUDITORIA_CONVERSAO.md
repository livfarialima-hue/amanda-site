# Auditoria e revisão das páginas auxiliares

**Projeto:** site da Dra. Amanda Schroeder  
**Data:** 10/07/2026  
**Escopo:** páginas auxiliares, SEO, conversão, mensuração, privacidade e redirecionamentos.  
**Fora do escopo:** alteração da página principal (`index.html`).

## Diagnóstico inicial

As páginas já tinham uma base visual coerente, registro profissional visível, CTA para WhatsApp e conteúdo prudente. Os principais obstáculos encontrados foram:

1. **Arquitetura orientada por nomes técnicos.** A paciente precisava saber previamente se procurava mastopexia, prótese ou redução.
2. **Páginas muito semelhantes.** A repetição reduzia diferenciação por intenção e criava risco de concorrência entre URLs de mama.
3. **Excesso de conteúdo aberto.** FAQs longas e repetitivas aumentavam a densidade visual no celular.
4. **Baixa clareza do primeiro contato.** O CTA não explicava suficientemente o que aconteceria após a mensagem.
5. **Metadados incompletos ou inconsistentes.** Havia descrições truncadas, pouca estrutura social e dados estruturados incompletos.
6. **Galerias sem distinção suficientemente explícita entre procedimento isolado e cirurgia combinada.**
7. **Mensuração incompleta para gestão de mídia.** Faltavam eventos de intenção intermediária, atribuição persistente, proteção contra duplicidade e uma documentação operacional atualizada.
8. **Biblioteca de conteúdos extensa sem ferramenta de descoberta.** Eram 137 links distribuídos em oito categorias.

## Estratégia adotada

A jornada foi organizada em cinco etapas:

1. **Reconhecimento:** a página começa pelo incômodo percebido, não pela técnica.
2. **Orientação:** explica possibilidades e limites sem prometer indicação.
3. **Confiança:** mostra formação, registro, local, segurança e critérios de decisão.
4. **Redução de incerteza:** esclarece consulta, cicatrizes, recuperação e o que ocorre no primeiro contato.
5. **Ação:** usa CTAs de baixa fricção, como “Conversar com a equipe” e “Ver disponibilidade”.

Não há promessa de aumento percentual de conversão. As mudanças removem fricções plausíveis e tornam o funil mensurável; o efeito real deve ser verificado por campanhas e testes controlados.

## Página única de mama

As páginas de mastopexia, mastopexia com prótese, mamoplastia redutora e prótese foram consolidadas em `/mama/`.

### Nova lógica

A paciente pode começar por uma das quatro queixas:

- queda ou aréola baixa;
- pouco volume ou esvaziamento;
- peso, volume ou desconforto;
- queda associada a falta de preenchimento.

Cada opção leva a um bloco expansível dentro da mesma página. O bloco explica:

- quando a técnica pode fazer sentido;
- o objetivo da cirurgia;
- o que ela não resolve sozinha;
- cicatriz e decisões de planejamento;
- CTA específico para a equipe.

### Vantagem para mídia paga

Uma única URL concentra autoridade, aprendizagem e remarketing, mas cada anúncio ainda pode abrir a técnica correspondente com o parâmetro `procedimento`. Isso evita manter quatro páginas quase duplicadas e permite comparar criativos por intenção.

### Redirecionamentos

As URLs antigas foram transformadas em páginas `noindex,follow`, com canonical para `/mama/`, preservação de parâmetros e fallback de navegação. Também foram entregues regras 301 para Apache e hosts compatíveis com `_redirects`.

## Antes e depois

Foram selecionados os arquivos mais adequados já presentes na pasta de campanhas e geradas versões WebP otimizadas.

- Mama: três vistas do caso combinado de mama e abdome.
- Abdome/contorno: vistas frontal, oblíqua e/ou perfil do mesmo caso, conforme a página.
- Blefaroplastia: resultado específico de pálpebras.
- Lifting facial/cervical: imagens já existentes e coerentes com o procedimento.
- Otoplastia: imagem específica já disponível.

O caso de mama/abdome é identificado explicitamente como **cirurgia combinada**, inclusive no texto alternativo e no aviso abaixo da galeria. Ele não é apresentado como resultado isolado de uma única técnica. Quando houver caso autorizado específico de mastopexia, prótese ou redução, a substituição por uma galeria dedicada será melhor para precisão e segmentação.

## Alterações aplicadas às páginas de procedimento

Foram revisadas:

- abdominoplastia;
- blefaroplastia;
- braquioplastia;
- contorno corporal;
- lifting cervical;
- lifting facial;
- lipo de papada;
- lipoaspiração;
- ninfoplastia;
- otoplastia;
- cirurgia pós-bariátrica;
- página consolidada de mama.

Mudanças recorrentes:

- título e descrição específicos por busca/intenção;
- hero mais direto e menos técnico;
- bloco “você não precisa ter certeza da técnica”;
- navegação interna orientada à jornada;
- FAQs em acordeão nativo e acessível;
- CTAs com ação e expectativa claras;
- explicação do primeiro contato;
- fatos da consulta próximos ao CTA;
- diferenciação entre informação educativa e indicação individual;
- links de privacidade e preferências de cookies;
- imagens com dimensões, carregamento tardio e texto alternativo;
- remoção de galerias potencialmente ambíguas onde não havia caso específico adequado.

## Biblioteca de conteúdos

A página `/conteudos/` ganhou:

- busca instantânea sem envio do termo a servidores próprios;
- atalhos para as oito categorias;
- contagem de resultados;
- ocultação automática das categorias sem correspondência;
- eventos de busca e clique educativo;
- metadados sociais e dados estruturados;
- CTAs e fluxo de contato alinhados às demais páginas.

## SEO técnico e conteúdo

Foram adicionados ou corrigidos:

- canonical por página;
- `robots` apropriado;
- Open Graph e Twitter Cards;
- títulos e descrições locais, com procedimento + São Paulo;
- dados estruturados para médico, clínica, breadcrumb, página médica/procedimento e perguntas frequentes;
- sitemap apenas com URLs canônicas indexáveis;
- `lastmod` de 10/07/2026;
- redirecionamento das antigas páginas de mama;
- links internos e navegação por âncora;
- conteúdo que responde intenção clínica sem repetição artificial de palavras-chave.

O FAQ schema foi mantido como marcação semântica, mas não se deve contar com um resultado visual expandido no Google: esse recurso é exibido de forma restrita, sobretudo para sites governamentais e de saúde reconhecidos como autoritativos.

## Mensuração e privacidade

### Implementado

- GA4, Google Ads e Meta Pixel por configuração central;
- Consent Mode com estados granulares;
- banner aceitar/recusar e política de privacidade;
- persistência de primeira e última atribuição;
- UTMs e identificadores de clique preservados;
- clique no WhatsApp como sinal secundário de intenção;
- sem disparo automático de `generate_lead`, conversão de Ads ou `Lead` do Meta no clique;
- eventos de abertura de procedimento, FAQ, busca, leitura e profundidade de scroll;
- contexto de página e procedimento em cada evento;
- exclusão deliberada de texto clínico, fotos, nomes e telefones dos eventos de publicidade.

### Dependência externa

A Meta Conversions API exige backend, CRM ou ambiente server-side seguro. O projeto estático não permite implementá-la corretamente. Quando houver essa infraestrutura, a recomendação é importar “consulta agendada” ou “consulta realizada” e deduplicar Pixel/CAPI com o mesmo `event_id`.

## Conformidade médica

A revisão evitou:

- garantia de resultado;
- superlativos ou superioridade;
- indicação cirúrgica sem consulta;
- apresentação de cirurgia combinada como procedimento isolado;
- manipulação declarada de forma corporal;
- coleta de dados clínicos no site.

As imagens de pacientes devem permanecer condicionadas à autorização válida, anonimização e finalidade educativa. A pasta entregue pressupõe que as autorizações dos casos já existentes estão arquivadas pela clínica; isso não pôde ser verificado tecnicamente no site.

## Padrões externos considerados

A revisão utilizou padrões recorrentes em páginas públicas de cirurgiões e clínicas bem posicionadas — hero por queixa, comparação de técnicas, autoridade visível, resultados próximos da decisão, FAQ e CTA contínuo. Não foi possível auditar desempenho financeiro ou taxa de conversão dessas campanhas públicas; portanto, elas foram tratadas como referências de estrutura, não como prova de sucesso.

A literatura em cirurgia plástica apoia a importância de fotografias e conteúdo digital na escolha do cirurgião, mas também documenta vieses de apresentação e risco de expectativas irreais. Isso orientou o uso de galerias com identificação do procedimento combinado, limites e variabilidade de resultados.

## Referências principais

- Conselho Federal de Medicina. Resolução CFM nº 2.336/2023 e materiais explicativos sobre publicidade médica e uso educativo de imagens.
- Wu C et al. *What Do Our Patients Truly Want? Conjoint Analysis of an Aesthetic Plastic Surgery Practice Using Internet Crowdsourcing.* Aesthetic Surgery Journal. 2017;37(1):105-118. PMID: 27651401.
- Shauly O et al. *The New Era of Marketing in Plastic Surgery: A Systematic Review and Algorithm of Social Media and Digital Marketing.* Aesthetic Surgery Journal Open Forum. 2023.
- ElAbd R et al. *Aesthetic Surgery Before-and-After Photography Bias on Instagram.* Aesthetic Surgery Journal. 2023. PMID: 37253847.
- Valiquette CR et al. *Can We Reach a Consensus on the Appropriate Use of Before and After Photos in Breast Surgery?* Aesthetic Surgery Journal. 2022. PMID: 34285856.
- Google Search Central. Helpful, reliable, people-first content; structured data; FAQ feature availability.
- Google. Consent Mode and consent type documentation.
- Meta Business. Pixel/Conversions API event deduplication and test events documentation.

## Arquivos técnicos relevantes

- `campanhas/tracking-config.js`
- `campanhas/tracking-loader.js`
- `campanhas/conversion-tracking.js`
- `campanhas/landing-behavior.js`
- `campanhas/landing.css`
- `TRACKING_SETUP.md`
- `.htaccess`
- `_redirects`
- `sitemap.xml`
- `privacidade/index.html`

## Checklist de publicação

- Confirmar que o servidor reconhece uma das regras de 301.
- Publicar e testar em celular real.
- Verificar consentimento no Tag Assistant.
- Verificar eventos no GA4 DebugView, Meta Test Events e Google Ads.
- Cadastrar e enviar o novo sitemap no Search Console.
- Solicitar indexação de `/mama/` e das páginas prioritárias.
- Manter as antigas URLs fora do sitemap.
- Confirmar por escrito as autorizações das imagens de pacientes.
- Após volume suficiente, comparar taxa de clique no WhatsApp, consulta agendada e custo por consulta por procedimento/criativo.
