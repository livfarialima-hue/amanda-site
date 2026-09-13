# Gates técnicos de publicação e SEO

## Escopo

Este documento descreve apenas controles técnicos offline. Ele não autoriza publicação e não altera páginas, textos, dados estruturados semânticos, campanhas ou integrações.

## Método e diretório publicável

O site é estático. Para não publicar a raiz inteira do repositório, `netlify.toml` agora executa `node scripts/build-static-site.mjs` e publica somente `tmp/netlify-deploy`. O comando valida a fonte, monta o artefato e valida novamente o resultado; qualquer regressão crítica encerra o build com erro. As funções continuam no diretório padrão `netlify/functions` e o plugin de produção do IndexNow continua inalterado.

O script de build aplica as regras versionadas de `.netlifyignore` ao montar fisicamente o diretório publicável. `auditorias/` e o próprio diretório transitório `.netlify/` devem permanecer explicitamente excluídos. A configuração em `netlify.toml` prevalece sobre o ajuste de publish da UI; o Deploy File Explorer ainda deve ser conferido antes de uma publicação autorizada.

## Comandos locais

```powershell
npm.cmd run site:check
npm.cmd run site:build
npm.cmd test
```

Para uma saída curta de conferência local, preservando o código de saída do gate:

```powershell
node scripts/check-site-technical.mjs --summary
node scripts/check-site-technical.mjs --root tmp/netlify-deploy --artifact --summary
```

`site:check` não usa rede nem escreve no produto. Ele modela o mesmo inventário consumido pelo build, imprime JSON e falha quando encontra:

- arquivo de auditoria no artefato modelado;
- URL do sitemap sem documento estático correspondente — status esperado diferente de 200;
- canonical ausente ou diferente da URL do sitemap;
- meta robots ausente ou com `noindex`;
- quantidade de H1 diferente de um;
- página HTML fora do sitemap;
- página órfã;
- link interno para rota inexistente;
- imagem, vídeo, poster, script, fonte ou stylesheet local ausente;
- redirect não permanente, origem no sitemap, destino não canônico, autorreferência ou ciclo;
- imagem sem dimensões, vídeo sem poster ou script externo síncrono.

O JSON também preserva baseline técnico por URL: bytes do HTML, bytes dos recursos locais referenciados, maior recurso, imagens, vídeos, dependência de Google Fonts e scripts externos síncronos. Bytes referenciados não equivalem a bytes transferidos nem a Core Web Vitals.

O teste `campanhas/site-technical-regression.test.mjs` faz parte da suíte padrão e usa fixtures locais para demonstrar que as falhas críticas são detectadas e que o artefato físico exclui `auditorias/**`, sem rede.

## Identidade e descoberta — controle semântico de setembro de 2026

`campanhas/seo-discovery.test.mjs`, incluído na suíte padrão, exige identidade uniforme nas 54 páginas, `Person` para Amanda, `MedicalClinic` separado, CRM/RQE e endereço coerentes, perfil com formação verificável, títulos/descrições únicos, breadcrumb canônico e conexões com `WebSite`. O identificador legado `#physician` é preservado para não quebrar referências; o tipo passa a representar a pessoa corretamente. `ProfilePage` é exclusivo da biografia, não da home comercial.

Os dez artigos explicitamente pendentes de revisão nos recibos anteriores não podem ganhar `author`, `reviewedBy` ou `lastReviewed`. Atribuições antigas são preservadas, com referências à mesma pessoa; esse teste técnico não certifica uma revisão clínica.

O parser admite o sufixo Netlify `301!`, mantendo bloqueio de redirecionamentos temporários e ciclos, demonstrado por fixture. Apenas as rotas estáticas enumeradas do alias de produção são forçadas ao domínio canônico; funções, hosts de preview e variantes `index.html` não são abrangidos. Duas formas codificadas do endereço malformado fornecido no GSC levam ao artigo correspondente, sem regra genérica para 404.

As condições locais não provam indexação ou citação em IA. O pós-voo precisa conferir redirecionamentos reais, parâmetros de consulta, páginas equivalentes e funções/programações preservadas. Teste local de navegador sem limitação de rede não substitui Core Web Vitals de campo.

## Gate antes de publicação

Uma publicação futura, somente após autorização específica, deve exigir:

1. `npm.cmd run site:check` verde;
2. `npm.cmd test` verde;
3. build Netlify concluído com `tmp/netlify-deploy` como publish;
4. diff restrito ao pacote autorizado;
5. inspeção do manifesto/Deploy File Explorer sem `auditorias/**`;
6. smoke HTTP das URLs canônicas e de uma rota sentinela em `auditorias/`, que deve responder 404;
7. confirmação de que local, commit aprovado e versão publicada são equivalentes.

Se o teste bloquear uma rota legítima, corrija a regra ou registre uma exceção técnica estreita e versionada. Não desative os controles de exclusão de auditoria, canonical, indexabilidade ou status esperado para liberar um deploy.
