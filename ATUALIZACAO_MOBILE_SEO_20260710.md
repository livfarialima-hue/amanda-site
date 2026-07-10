# Atualização mobile, resultados, injetáveis e SEO — 2026-07-10

## Implementado

- Conteúdos secundários recolhíveis com botão “+” no mobile, mantendo os textos integrais e visíveis sem JavaScript.
- Linhas horizontais com rolagem por gesto para procedimentos e resultados no mobile.
- FAQ da página inicial convertido para formato expansível.
- Novo resultado de otoplastia, preservando o resultado de lobuloplastia, com apresentação específica para telas pequenas.
- Resultado de preenchimento de queixo incluído na página inicial.
- Nova página `/injetaveis/` para toxina botulínica, preenchedores e bioestimuladores, pronta para receber galeria futura.
- Links internos mantidos na mesma aba; links externos continuam identificados como externos.
- Metadados Open Graph, Twitter, hreflang, dados estruturados, sitemap e links internos atualizados.
- Imagens locais com dimensões explícitas, lazy-loading abaixo da dobra e decodificação assíncrona.
- Mensuração centralizada no carregador com consentimento; tags duplicadas da página inicial removidas.
- Cabeçalhos de cache, compressão e segurança preparados para Apache e hosts compatíveis com `_headers`.
- Eventos de analytics preparados para abertura dos blocos, rolagem horizontal e navegação interna.

## Arquivos compartilhados novos

- `campanhas/site-enhancements.css`
- `campanhas/site-enhancements.js`
- `_headers`

## Observação de publicação

Após publicar, enviar novamente o `sitemap.xml` no Google Search Console e validar a página `/injetaveis/` no teste de resultados avançados.
