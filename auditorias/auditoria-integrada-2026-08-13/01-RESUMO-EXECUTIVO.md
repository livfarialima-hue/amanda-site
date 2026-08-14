# Resumo executivo

**Data da auditoria:** 13 de agosto de 2026<br>
**Modo:** somente leitura nas plataformas e sistemas de produção<br>
**Escopo de mídia:** exclusivamente as seis campanhas Google Ads e as duas campanhas Meta Ads confirmadas ativas ao vivo

## Atualização de execução — 14 de agosto de 2026

Os principais reparos técnicos autorizados foram executados depois do snapshot de auditoria. `Funil Comercial` e `Painel Econômico` agora usam oportunidades canônicas e fecham em 128 registros, com 32 qualificadas, 11 agendadas, 7 realizadas e 2 convertidas. Os 10 registros de consulta que têm `event_id` conciliam 10/10 com o Calendar por ID e agenda exatos. O Google Ads já recebeu 3 conversões na ação principal e classifica a qualidade dos dados importados como excelente; as recomendações automáticas estão totalmente desativadas. Esses avanços corrigem a tubulação, mas **não liberam aumento de investimento**: Google, Meta Site e SLA ainda precisam completar suas janelas de observação, e há duas revisões humanas vencidas.

Permanecem dependências externas que não podem ser resolvidas com segurança por inferência: o domínio antigo `.com` está sem resolução DNS e exige acesso ao registrador/Wix para um 301 preservando serviços; o horário físico da LIV precisa ser confirmado antes de alinhar GBP/site/schema; e o rascunho Meta que altera nome, posicionamento e público precisa de decisão explícita do proprietário. A página `/lifting-facial/` permaneceu intocada.

## Diagnóstico

Existe demanda, mas ainda não existe uma cadeia de mensuração confiável até consulta e cirurgia. Hoje o sistema consegue demonstrar tráfego barato no Site e conversas no WhatsApp, porém perde ou contradiz informação ao atravessar atribuição, CRM, planilha, agenda e marcos comerciais. A consequência é importante: **aumentar investimento agora ampliaria sinais intermediários, não resultados de negócio comprovados**.

A recomendação imediata é manter o investimento combinado no **cenário 1, sem aumento líquido, com envelope de planejamento de até R$ 4.140**. Esse envelope soma o run-rate Google de 30 dias ao orçamento vitalício do flight Meta atual; não é um gasto histórico harmonizado. Primeiro devem ser corrigidos os bloqueadores P0 e formada uma janela limpa. O WhatsApp direto deve funcionar como controle da Meta; a rota pelo Site deve permanecer um teste instrumentado e só receber nova verba depois que o código `M26F02S` aparecer de ponta a ponta. No Google, não há base comparável depois das mudanças de 13/08 e a ação principal de lead qualificado está com status `Requer atenção`.

## O que está funcionando

- O Site tem boa fundação técnica básica: 44/44 URLs do sitemap responderam 200, canonicals e metadados essenciais estavam presentes e 213/213 links de WhatsApp auditados possuíam marcação.
- O GA4 registrou intenção real entre usuários consentidores: 519 sessões, 49 `whatsapp_click` e 35 eventos principais entre 16/07 e 12/08. `/avaliacao-facial/` teve o melhor sinal direcional entre as landing pages observadas, com 61 sessões e 13 eventos principais.
- A Meta WhatsApp gera entrada rastreável no CRM: na janela harmonizada de 28/07 a 12/08, a plataforma reportou 48 conversas e o CRM continha 41 contatos com o código exato `M26F01W`. Esses totais não foram conciliados pessoa a pessoa, mas demonstram que a rota curta chega ao sistema comercial.
- A base transacional é recuperável: o CRM contém 139 oportunidades com IDs únicos e ponteiros íntegros. O problema principal está na sincronização dos estados e nos relatórios derivados, não na ausência total de estrutura.
- O contrato local do bot é defensivo e os 486 testes locais passaram. Isso reduz risco de regressão no código, embora não prove a execução histórica ao vivo.
- Na amostra semântica recente, profissional/rota acertou 12/12 casos avaliáveis, origem paga 5/5 e procedimento/intenção explícita 5/5. Esses acertos são diagnósticos, não taxas populacionais.

## Cinco achados que mudam a decisão

1. **WhatsApp direto é o único controle Meta com sinal downstream observável.** Na coorte harmonizada, houve 41 contatos atribuídos, seis oportunidades atualmente qualificadas ou posteriores, apenas três datas de qualificação preenchidas, uma consulta provisória na planilha e zero consulta realizada. O custo observado foi R$ 7,95 por contato atribuído e R$ 108,71 por qualificação datada; o segundo valor ainda depende de melhorar completude e reconciliação.
2. **A campanha Site comprou tráfego, mas não demonstrou aquisição no CRM.** Entre 24/07 e 12/08 foram 1.290 visualizações de página a R$ 0,31, enquanto o CRM continha zero registro com o código exato `M26F02S`. O Pixel recebia `PageView` pelo navegador, mas a Meta exibia diagnóstico ativo de bloqueio de alguns dados do domínio por possível contexto de saúde, e CAPI não foi evidenciada. Isso não prova que nenhuma pessoa virou lead; prova que a passagem e a atribuição não permitem saber.
3. **O Google atual ainda não pode ser julgado.** Palavras-chave, negativas, preferências de autoaplicação e o orçamento de lifting cervical mudaram em 13/08. A ação `Lead qualificado GCLID` está principal e incluída nas metas, mas `Requer atenção`. O retrato de 12/08 — 704 impressões, 44 cliques, R$ 77,49 e zero conversão — é diagnóstico, não baseline da configuração atual.
4. **Os painéis executivos não representam a fonte.** Há 129 linhas visíveis para 126 oportunidades da Dra. Amanda, 26/126 fases divergentes entre CRM e aba operacional e um painel que mostra 499 ao contar fórmulas vazias. Só 1/10 IDs de consulta da planilha conciliou com o Calendar.
5. **O bot reconhece rota e origem, mas perde o estado mais recente.** Em amostra estratificada de 15 conversas recentes, etapa/status estava coerente em apenas 7/14 casos avaliáveis, contexto/próxima ação em 9/15 e decisão de responder, silenciar ou fazer handoff em 12/15. Duas continuidades ficaram órfãs e um sinal de potencial urgência recebeu handoff insuficiente. A amostra é diagnóstica, não populacional.

## Três riscos prioritários

- **Otimização pelo proxy errado:** conversas da Meta, cliques do Site e cliques do Google podem crescer sem aumentar qualificados, consultas ou cirurgias.
- **Perda operacional após o contato:** agenda quase não conciliada, duas pendências vencidas, oito jobs órfãos, um contador anômalo de 170 tentativas e perda de contexto/handoff na amostra criam risco de perder intenção já paga ou atrasar revisão humana necessária.
- **Falsa precisão gerencial:** fases conflitantes, denominadores quebrados e marcos de orçamento, aceite, realização e pagamento ainda não tipados impedem calcular custo por consulta, cirurgia, receita ou ROAS com segurança.

## O que corrigir antes de investir mais

As cinco ações de maior impacto, na ordem, são:

1. **Restaurar a conversão offline qualificada** (`GAD-01` + `DAT-08`): reconciliar elegíveis, enviados, aceitos e rejeitados, unificar o nome da ação e provar que o Google recebe o evento correto sem PII ou informação clínica.
2. **Unificar oportunidade, fase e consulta** (`DAT-01` a `DAT-04` + `OPS-02`): impedir duplicidade, preservar correção humana e fazer solicitado → escolhido → confirmado → realizado/falta/cancelado compartilhar `Opportunity ID` e `event_id` reais.
3. **Fechar a rota Meta Site** (`WEB-01` + `MAD-01` + `MAD-04` + `DAT-07`): testar clique consentido, código `M26F02S`, conversa e oportunidade; revisar o diagnóstico do Pixel sem ampliar coleta sensível; exigir cobertura ≥80% no teste inicial e duplicidade <2% antes de renovar ou escalar.
4. **Congelar novas mudanças materiais no Google** (`GAD-02`) e validar o aumento de lifting cervical e as preferências de autoaplicação (`GAD-03` e `GAD-04`). Deve-se formar uma janela de sete dias para leitura preliminar e 14 dias para decisão, salvo dano evidente.
5. **Corrigir contexto, handoff, operação e painéis** (`BOT-02` a `BOT-05`, `DAT-06`, `DAT-09`, `OPS-01` e `OPS-03`): rota obrigatória e fila de segurança, fonte humana vigente, SLA por evento, tratamento de jobs, fórmulas por oportunidade e rotina diária de pendências.

Em paralelo, consolidar o domínio antigo, reconciliar os horários públicos e auditar a elegibilidade de um perfil individual antes de qualquer criação (`SEO-01`, `SEO-03` e `SEO-04`).

## O que já pode ser testado, sem ampliar mídia

Após aprovação para um trabalho de implementação, quatro testes técnicos podem começar sem elevar orçamento: um evento sintético e sem dado pessoal para `M26F02S`; o ciclo elegível → enviado → aceito/rejeitado da conversão Google; uma consulta controlada vinculada por `Opportunity ID` e `event_id`; e queries de reconciliação dos painéis contra a fonte. Esses testes validam a tubulação, não desempenho comercial, e devem falhar fechado sem atingir paciente real.

## O que testar depois dos gates

- **Meta rota e criativo:** manter WhatsApp direto como controle e comparar Site somente com o mesmo público, criativo, janela e orçamento. Depois da reconciliação, testar `C01H01` versus `C06H01` no mesmo objetivo e destino. `C01H01` foi o melhor gerador de tráfego no Site; o recorte WhatsApp limpo por anúncio não foi obtido. Ainda não existe “melhor vídeo” por qualificação ou consulta.
- **Lipo de papada:** diagnosticar termos, dispositivo, origem e CTA antes de mudar a página ou ampliar tráfego; houve 35 sessões e zero evento principal no recorte GA4.
- **Otoplastia:** não havia campanha Meta ativa, portanto histórico antigo não pode sustentar conclusão sobre vídeo. Um futuro teste deve ser uma iniciativa prospectiva isolada, com resultado por qualificado e consulta, nunca por visualização ou conversa isolada.
- **Mama, lipoaspiração e abdominoplastia:** testes Search sequenciais, um de cada vez, em frase/exata, R$ 15/dia por 14 dias e teto de R$ 210 por teste, somente após página, tracking e capacidade aprovados.

Nenhum teste proposto autoriza alteração automática. A página `/lifting-facial/` permanece protegida: **nenhum texto, layout, vídeo, CTA ou característica foi alterado ou recomendado para alteração nesta fase**.

## Realocação e cenários de investimento

| Cenário | Envelope Google | Envelope Meta | Envelope total | Decisão |
|---|---:|---:|---:|---|
| 1. Correção, sem aumento | até R$ 2.940 | até R$ 1.200 | até R$ 4.140 | **Recomendado agora.** Manter reserva; Site recebe zero até QA e, depois, no máximo R$ 300 de teste. |
| 2. Crescimento conservador | R$ 3.400 | R$ 1.400 | R$ 4.800 | Liberar somente após os gates mínimos e capacidade confirmada. |
| 3. Crescimento base | R$ 4.200 | R$ 1.800 | R$ 6.000 | Exige dois ciclos estáveis, consulta conciliada e volume de qualificados. |
| 4. Agressivo controlado | R$ 5.880 | R$ 2.520 | R$ 8.400 | Teto condicional, não plano atual; exige margem, agenda e receita reconciliadas. |

Na Meta, `M26F01W` permanece o controle. `M26F02S` não deve receber nova verba antes do QA ponta a ponta. No Google, os valores são tetos; aumentos futuros devem ocorrer em degraus de 10%–20%, uma campanha por vez. Não adotar tCPA, Performance Max ou correspondência ampla enquanto a conversão qualificada e o volume não sustentarem Smart Bidding.

## Como decidir manter, ampliar ou reverter

- **Manter:** ação Google saudável; ≥95% de completude dos novos marcos; diferença entre fontes <2%; agenda conciliada em ≥95%; Meta Site com ≥80% de cobertura no teste inicial; capacidade operacional sem P0/P1 vencido.
- **Ampliar:** depois de 14–30 dias limpos, aumentar apenas 10%–20% por vez se custo por qualificado permanecer dentro da faixa aprovada e a taxa de consulta Calendar-validada não cair. Migrar de cenário somente após fechar o gate anterior.
- **Reverter ou interromper:** custo por qualificado piorar >30% por duas leituras comparáveis; atribuição ou agenda perder cobertura; aparecer duplicidade/PII; ocorrer conflito de sala, fila crítica, queda de capacidade ou tráfego incompatível acima do guardrail.
- **Revisões:** técnica em 20/08/2026, primeira janela em 27/08/2026 e depois a cada 30 dias, sempre preservando uma única mudança material por comparação.

## O que ainda não é confiável concluir

- quantos leads reais a campanha Meta Site gerou;
- qual vídeo produz mais qualificados, consultas ou cirurgias;
- se o problema histórico de otoplastia foi o criativo;
- CPQL da configuração atual do Google;
- taxa causal de campanha para consulta realizada;
- custo por cirurgia, receita atribuível ou ROAS;
- SLA humano oficial;
- acurácia populacional do classificador e do contexto do bot; a amostra confirmou casos Google e Meta, mas não preservou cobertura independente de orgânico, profissional e qualificado/não qualificado;
- Core Web Vitals de campo.

Ausência de dado foi tratada como `N/D`, não como zero. Nenhuma campanha inativa entrou em benchmark, cálculo, escolha de criativo ou orçamento.

## Mapa dos artefatos

- Fontes, filtros, estado das fases e inventário: `00-ESTADO-ESCOPO-E-FONTES.md` e `INVENTARIO-CAMPANHAS-ATIVAS.csv`.
- Dados e funil: `02-QUALIDADE-LEADS-E-FUNIL.md`.
- Mídia ativa: `03-GOOGLE-ADS-CAMPANHAS-ATIVAS.md` e `04-META-ADS-CAMPANHAS-ATIVAS.md`.
- Site, SEO, local e IA: `05-SITE-E-CONVERSAO.md` e `06-SEO-LOCAL-E-DESCOBERTA-IA.md`.
- Bot e operação: `07-BOT-WHATSAPP-E-OPERACAO.md`.
- Cenários, gates e plano: `08-CENARIOS-E-PLANO-PRIORIZADO.md`.
- Backlog completo com impacto, confiança, owner, prazo e regras: `MATRIZ-RECOMENDACOES.csv`.

Nenhuma recomendação foi aplicada. Não houve alteração em campanha, planilha, bot, site, agenda, mensagem, permissão, publicação ou documento canônico.
