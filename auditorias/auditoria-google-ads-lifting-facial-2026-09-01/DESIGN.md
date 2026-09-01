# Design do relatório — lifting facial

## Leitor e decisão

- Público: Daniel, Amanda e equipe responsável por mídia e atendimento.
- Decisão: o que corrigir agora para melhorar conversão sem contaminar o teste vigente de lances.
- Tom: executivo, direto e auditável; métricas de mídia sempre separadas do funil real.

## Hierarquia visual

- Título e `Executive Summary` respondem primeiro se falta procura ou conversão.
- A faixa de métricas aparece depois da síntese, sem substituir a narrativa.
- A faixa de métricas, um gráfico de gasto e as tabelas preservam a forma e os valores exatos de grupos, funil, termos, ativos e decisões.
- Cores e destaques ficam a cargo do leitor portátil canônico; nenhum runtime ou CSS paralelo é usado.

## Mapa das evidências quantitativas

| Seção | Pergunta | Forma | Campos | Takeaway | Fonte |
|---|---|---|---|---|---|
| Termos visíveis | Onde o gasto visível se concentra? | barras + tabela ordenada | termo, gasto, cliques, conversões, intenção | preço domina, mas não deve ser bloqueado genericamente | Google Ads ao vivo |

## QA final

- Barras com zero como base e termos ordenados por gasto; a tabela preserva a leitura integral dos rótulos e as conversões excepcionais.
- Tabelas têm ordenação explícita e unidades no cabeçalho.
- Nenhuma linha contém PII ou identificador de paciente.
- O HTML final deve ser gerado pelo empacotador portátil canônico e aceitar somente a verificação emitida por ele.
