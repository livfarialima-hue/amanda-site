# Bruna — abordagem de preço, 12/09/2026

A abordagem passa a tratar preço como planejamento. A lista de cirurgias autorizadas e a exigência de primeira resposta sem números permanecem. A oferta seguinte fica mais simples, não exige leitura do guia, não acrescenta desconto espontâneo e não pressiona o agendamento.

## Fundamento e aplicação

O SHARE da AHRQ orienta diálogo sobre opções, preferências e o que importa à pessoa, com espaço para decidir. Aqui isso se traduz em reconhecer a dúvida de custo, explicar a dependência da avaliação e respeitar a pausa. A Bruna apoia a conversa administrativa; decisão e indicação clínicas continuam com a médica. [AHRQ SHARE](https://www.ahrq.gov/sdm/share-approach/index.html).

O material de comunicação de números da AHRQ recomenda linguagem compreensível e contexto. A aplicação ao preço é uma adaptação: intervalo legível, escopo e incerteza explícitos, sem sugerir um orçamento garantido. [AHRQ — comunicação de números](https://www.ahrq.gov/sites/default/files/wysiwyg/sdm/share-approach/share-communicating-numbers.pdf).

Da venda consultiva/SPIN, aproveita-se a compreensão da necessidade e a comunicação de valor pertinente. Não se usa a etapa de implicações para aumentar insegurança com o corpo, nem se transforma interesse em compromisso de operar. A fonte da Huthwaite é B2B: não demonstra aumento de conversão em cirurgia plástica. [Huthwaite — necessidades e valor](https://www.huthwaiteinternational.com/blog/whats-it-really-worth-how-to-uncover-your-hidden-value).

## Comportamento

| Situação | Conduta |
| --- | --- |
| Primeiro preço de lifting/minilifting, cervical ou otoplastia | Explicação breve sem números; guia uma vez; oferta opcional de faixa. |
| Aceite claro ou novo pedido | Faixa autorizada uma vez; minilifting e facial separados quando nomeados. |
| Depois da faixa | Aguardar a pessoa. Pagamento somente se perguntado. Sem CTA de agenda automático. |
| Outra cirurgia | E-mail com pergunta, fonte, proposta de faixa e rascunho completo para conferência e envio manual. |
| Variante sem fonte compatível | SEM FAIXA SEGURA; esclarecimento, sem número inventado. |
| Humano já respondeu | Histórico e controle de atividade permanecem soberanos; nenhuma repetição da faixa. |

Faixas automáticas preservadas: minilifting R$ 18–25 mil; lifting facial R$ 26–42 mil; cervicoplastia R$ 18–26 mil; otoplastia R$ 8–14 mil. Todas são informativas, não orçamento, proposta ou garantia; valor final depende de avaliação e planejamento e pode ficar fora da faixa. Consulta de R$ 500 continua informação separada.

## Referência interna e fronteira humana

A TABELA DR. JOÃO 2025.xlsx (Drive `1B94iLuyK-D-YTFPMu5dJaZu7lzCas_eV`) foi relida; contém as referências históricas já usadas no código. Ela não comprova preços atuais da Amanda. O e-mail identifica ano/origem e exige confirmar atualidade, variante, hospital e composição. Os números de honorários/hospital não são expostos isoladamente ao paciente.

Blefaroplastia superior expressamente nomeada usa apenas internamente a faixa R$ 14–18 mil, derivada dos valores profissionais R$ 9.752,40–10.495,44 e hospital R$ 5.500 da fonte, com o mesmo método anterior: 10% abaixo/acima, arredondamento em milhares. Blefaroplastia completa mantém R$ 18–23 mil no rascunho interno. Inferior isolada não herda essa estimativa. Revisão/incompleta de rinoplastia e ninfoplastia em consultório não recebem a referência de uma variante diferente.

Não há aprovação de preço por responder genericamente ao e-mail. A equipe confere e envia o texto manualmente; a aprovação de marcos de cuidado é outro fluxo. Publicação geral nunca aprova um preço individual. Quando falta uma referência compatível, a resposta proposta permanece sem preço até a equipe definir uma faixa.

## Verificação e limites

Oito cenários reproduziram falhas no baseline: oferta longa, valor interno em construtor direto, pagamento espontâneo, referência facial excessiva, fonte/ressalva ausentes, variante incorreta, falta de aviso de referência ausente e valor extra passando junto de uma faixa autorizada. A nova suíte cobre também planejamento → oferta → aceite → faixa → bloqueio de repetição e o conteúdo completo do e-mail, usando somente dados sintéticos.

Há conferência entre consumidores: webhook, retomada após atuação humana, guardas de saída, política numérica e e-mail. Publicação verificada: commit `24a6f19ad5e29660653744c697ae6fbd356417e9`, Netlify `6aa60d89d5920c0008dc059e`, em 12/09 às 23h42. Suíte integral 1.456/1.456, seleção final entre consumidores 74/74, escopo de 25 arquivos, arquitetura e site sem erros. Domínio e URL imutável HTTP 200/Bruna ativa; POST sem assinatura HTTP 401; 12 funções/cinco programações preservadas. Recibo: `PUBLICACAO.json`. Nenhuma mensagem de teste para pacientes ou e-mail real foi enviado. LEADS, Calendar, Apps Script v150, filas, cadências, consentimentos e permissões individuais não são alterados neste ajuste.

Não houve avaliação adicional do modelo vivo nem medição de ganho de conversão. Acompanhamento por Daniel/equipe em 24h e D+7 (19/09): utilidade da resposta, abandono após preço, consultas por contato qualificado e falhas de revisão. Contexto truncado, identidade incerta, urgência, cuidado ativo, negociação e atividades novas continuam sujeitos às proteções existentes.
