# Planejamento de mídia — agosto de 2026

> **Governança:** este arquivo preserva o registro operacional das alterações. O posicionamento, os objetivos, as métricas e as regras de decisão vigentes ficam em `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`.

## Registro de alterações

### 15 de agosto de 2026 — Google Ads | estrutura de lifting e comunicação de preço

- **Status:** decisão estratégica registrada; conta inspecionada somente em leitura; nenhuma alteração foi aplicada no Google Ads.
- **Campanha:** `S_BR_SP_LIFTING_FACIAL`.
- **Decisão:** manter os dois grupos e seus dois RSAs. `AG_LIFTING_FACIAL` atende a intenção geral e aponta para `/lifting-facial/`; `AG_LIFTING_FACIAL_PRECO` atende `preço`, `valor` e `quanto custa` e aponta para o guia específico de composição. Eles não são anúncios redundantes.
- **Página:** as faixas numéricas de cirurgia serão retiradas do site. O guia de preço continuará elegível como destino porque responde à intenção explicando componentes, fatores de variação e orçamento individual.
- **Métricas observadas na UI em 15/08/2026, fuso Brasília:** no período de 16/07 a 14/08, o grupo geral teve 450 cliques, 9.680 impressões, R$ 627,27 de gasto e 17 conversões exibidas; 16 eram cliques-proxy no WhatsApp e apenas uma era `Lead qualificado GCLID`. O grupo de preço, criado em 09/08, teve 39 cliques, 315 impressões, R$ 50,67 de gasto e nenhuma conversão exibida. Consulta e procedimento por grupo permanecem N/D.
- **Negativas de roteamento a manter:** `[lifting facial preço]` e `[mini lifting facial preço]`, exclusivamente em `AG_LIFTING_FACIAL`.
- **Negativas de roteamento planejadas, ainda não aplicadas:** `[preço mini lifting facial]`, `[quanto custa lifting facial]` e `[valor lifting facial]`, também exclusivamente em `AG_LIFTING_FACIAL` e somente após autorização específica.
- **Negativas que não devem ser criadas em campanha, conta ou lista:** `preço`, `valor`, `custo`, `quanto custa` e `valor médio`. A negativa compartilhada `preço popular` pode permanecer porque não bloqueia as consultas comuns de preço.
- **Anúncio de preço:** manter títulos que reconhecem a busca, mas usar descrições sobre equipe, hospital, anestesia, materiais e orçamento individual. Não prometer faixa pública. O valor da consulta particular é uma informação separada do preço cirúrgico e não foi alterado nesta decisão.
- **Janela:** abrir leitura preliminar depois de 28 dias completos da publicação da página revisada; não pausar ou consolidar antes de rastreamento validado e, preferencialmente, 100 cliques no grupo de preço.
- **Métrica principal:** contato válido, lead qualificado e consulta por grupo. CTR, CPC e clique-proxy são diagnósticos.
- **Regra para manter:** manter os dois grupos se a intenção continuar coerente e o grupo de preço produzir avanço real do funil a custo aceitável.
- **Regra para testar consolidação:** somente se, depois da amostra e da validação do rastreamento, o grupo de preço continuar sem contato válido. Antes de consolidar, remover todas as negativas exatas de roteamento do grupo geral.

### 4 de agosto de 2026 — Google Ads | Otoplastia

- Campanha: `S_BR_SP_OTOPLASTIA`.
- Alteração realizada pelo Daniel: orçamento médio diário aumentado de **R$ 8,00 para R$ 15,00**. O aumento foi intencional, embora o primeiro degrau sugerido na análise tenha sido R$ 12,00/dia.
- Objetivo: intensificar a captação de procura por otoplastia de forma gradual, pois a campanha aparecia como **limitada pelo orçamento**.
- Estratégia de lances mantida: **Maximizar cliques**.
- Nenhuma outra alteração de campanha deve ser feita durante a janela inicial de observação, para permitir atribuir os efeitos ao aumento de orçamento.
- Novo limite mensal teórico: **R$ 456,00** (`R$ 15,00 × 30,4`).
- Janela de revisão: **entre 9 e 11 de agosto de 2026**.

Na revisão, comparar termos de pesquisa, cliques, CPC, contatos no WhatsApp, leads, leads qualificados com GCLID, custo por lead e custo por lead qualificado. Considerar qualquer novo aumento somente se a qualidade permanecer adequada e a campanha continuar limitada pelo orçamento. Não mudar simultaneamente o orçamento e a estratégia para Maximizar conversões. A recomendação automática de migrar para Maximizar conversões com CPA desejado de R$ 134,41 não foi aplicada; uma eventual mudança deverá aguardar a validação da importação dos leads qualificados e do custo real por conversão relevante.
