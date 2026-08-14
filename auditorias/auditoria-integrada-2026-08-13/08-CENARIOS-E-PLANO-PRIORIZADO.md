# Cenários de investimento e plano priorizado

**Data de referência:** 13 de agosto de 2026<br>
**Horizonte de planejamento:** ciclos de 30 dias<br>
**Modo:** recomendações somente; nenhuma campanha, página, planilha, bot ou orçamento foi alterado<br>
**Decisão recomendada agora:** cenário 1 — correção e realocação sem aumento. O cenário 2 só deve ser liberado depois dos gates de mensuração e agenda.

## Resposta direta

Não há base para aumentar o investimento líquido hoje. A demanda existe — sobretudo na rota Meta → WhatsApp direto —, mas o sistema ainda não mede com segurança o que mais importa. O Google sofreu mudanças materiais em 13/08 e não possui janela comparável; sua conversão principal está em `Requer atenção`. A agenda concilia apenas 1 de 10 IDs da planilha, e os painéis derivados contam denominadores incorretos. A ordem economicamente correta é:

1. corrigir conversão offline, fase e agenda;
2. observar a configuração Google sem novas mudanças;
3. usar WhatsApp direto como controle Meta, sem chamar conversa de lead;
4. testar a passagem pelo site só depois de um teste ponta a ponta aprovado;
5. liberar crescimento por gates, não por CTR, LPV ou recomendação automática.

## Base de custo observada e limites da projeção

### Estado de orçamento ao vivo e envelope de planejamento

- Google Ads: R$ 98/dia, equivalente a um run-rate teórico de R$ 2.940 em 30 dias.
- Meta Ads: duas campanhas com orçamento vitalício de R$ 600 cada, programadas de 16/07 a 16/08; envelope total do flight atual de R$ 1.200.
- Referência combinada para o cenário 1: envelope de até R$ 4.140. É a soma do run-rate Google com o envelope Meta, **não um gasto histórico harmonizado de 30 dias**.

O valor de consulta de R$ 500 aparece no site, mas a condição de abatimento caso a cirurgia seja realizada não foi reconfirmada em uma fonte operacional nesta coleta. Ela foi excluída de anúncios, projeções e recomendações desta auditoria até confirmação explícita.

### Unidade econômica que pode ser usada com ressalvas

Na única coorte Meta harmonizada com resultado downstream, `M26F01W` de 28/07 a 12/08:

- R$ 326,13 de gasto;
- 48 conversas reportadas pela Meta;
- 41 contatos com oportunidade e código exato no CRM;
- custo observado por contato atribuído: R$ 7,95;
- 3 qualificações com data preenchida: R$ 108,71 por qualificação datada;
- 6 oportunidades atualmente em estágio qualificado ou posterior: R$ 54,36 por status atual, métrica menos confiável;
- 1 consulta provisória na planilha, sem validação no Calendar;
- 0 consultas realizadas registradas na coorte.

Para planejamento, usa-se uma faixa prudente de R$ 8–15 por contato atribuído — apenas um proxy de contato válido — e R$ 70–140 por qualificado Meta, incorporando incerteza de atribuição, validade semântica, preenchimento e saturação. **Não existe custo confiável por consulta, cirurgia ou receita.** Google e iniciativas novas permanecem sem projeção numérica até formar uma janela comparável.

## Gates obrigatórios antes de crescimento

| Gate | Regra mínima | Bloqueia |
|---|---|---|
| Conversão Google saudável | `Lead qualificado GCLID` sem alerta por 7 dias; eventos elegíveis, enviados, aceitos e rejeitados reconciliados; zero duplicidade/PII | aumento Google, tCPA e escala de Maximizar conversões |
| Fase canônica | zero divergência nova CRM↔aba por 14 dias; duplicidades resolvidas reversivelmente | uso dos painéis e CPL qualificado oficial |
| Agenda reconciliada | ≥95% das novas consultas com `Opportunity ID` e evento Calendar válido; zero confirmação sem sala/equipe | projeção de consulta e qualquer escala por agendamento |
| Atribuição Meta Site | teste ponta a ponta do código `M26F02S`; diagnóstico de bloqueio do Pixel revisado sem ampliar coleta sensível; ≥80% de cobertura entre clique consentido, conversa e oportunidade; duplicidade <2% | renovação/escala da campanha Site |
| Operação | ≥95% das novas conversas com SLA calculável; zero P0/P1 vencido; rota válida em ≥99% | aumento de volume ou autonomia do bot |
| Capacidade | responsável e agenda para absorver o intervalo projetado; revisão diária de exceções | cenários 3 e 4 |

## Quatro cenários

As faixas abaixo representam somente o componente Meta WhatsApp, hoje o único com custo calculável por código de campanha em uma janela harmonizada. Os 41 contatos não foram auditados semanticamente nem conciliados pessoa a pessoa com as 48 conversas da plataforma; por isso a projeção é proxy, não promessa de contato válido. O total de Google e testes novos é indicado como `N/D` até existir base atual.

| Cenário | Envelope Google | Envelope Meta | Envelope total | Contatos atribuídos, proxy de válidos | Qualificados esperados | Consultas esperadas | Cirurgias | Prazo e capacidade |
|---|---:|---:|---:|---|---|---|---|---|
| 1. Correção e realocação sem aumento (`BUD-01`) | até R$ 2.940 | até R$ 1.200 | até R$ 4.140 | 40–75 Meta WA + Google N/D | 4,3–8,6 Meta + Google N/D | N/D até taxa Calendar-validada | N/D | 14 dias; revisão técnica diária e operação atual |
| 2. Crescimento conservador (`BUD-02`) | R$ 3.400 | R$ 1.400 | R$ 4.800 | 60–112,5 Meta WA + Google/novos N/D | 6,4–12,9 Meta + Google/novos N/D | N/D até taxa Calendar-validada | N/D | 30 dias; uma mudança material por campanha |
| 3. Crescimento base (`BUD-03`) | R$ 4.200 | R$ 1.800 | R$ 6.000 | 80–150 Meta WA + Google/novos N/D | 8,6–17,1 Meta + Google/novos N/D | N/D até taxa Calendar-validada | N/D | 30–60 dias; atendimento deve absorver pelo menos 4–6 contatos/dia adicionais |
| 4. Crescimento agressivo controlado (`BUD-04`) | R$ 5.880 | R$ 2.520 | R$ 8.400 | 100–187,5 Meta WA + Google/novos N/D | 10,7–21,4 Meta + Google/novos N/D | N/D até taxa Calendar-validada | N/D | 60–90 dias; plantão operacional, capacidade cirúrgica e revisão semanal de margem |

As faixas de contato e qualificação são divisões diretas e reproduzíveis do orçamento de `M26F01W` em cada cenário pelas faixas de R$ 8–15 e R$ 70–140, exibidas com até uma casa decimal. Verba de Site, teste novo e reserva não gera projeção até formar base própria.

### Como calcular o componente Google quando o gate abrir

Para cada campanha, usar a faixa:

`qualificados esperados = orçamento da campanha ÷ CPL qualificado aceito dos últimos 30 dias × 0,7 a 1,0`

O fator de 0,7 protege contra deterioração ao aumentar verba. Consulta só pode ser projetada multiplicando essa faixa pela taxa de qualificado → consulta **Calendar-validada** da mesma campanha e janela. Não usar o snapshot de 12/08, cliques no WhatsApp ou o histórico anterior às mudanças de 13/08.

## Distribuição Google por cenário

Valores por ciclo de 30 dias. Os cenários 2–4 são condicionais e não autorizam mudança.

| Campanha ativa / iniciativa | Cenário 1 | Cenário 2 | Cenário 3 | Cenário 4 |
|---|---:|---:|---:|---:|
| `S_BR_SP_BLEFAROPLASTIA` | R$ 690 | R$ 720 | R$ 900 | R$ 1.200 |
| `S_BR_SP_LIFTING_CERVICAL` | até R$ 690; R$ 360 se o aumento não foi aprovado ou falhar no guardrail | R$ 450 | R$ 600 | R$ 900 |
| `S_BR_SP_OTOPLASTIA` | R$ 450 | R$ 480 | R$ 600 | R$ 750 |
| `S_BR_SP_CIRURGIA_FACIAL` | R$ 240 | R$ 270 | R$ 360 | R$ 600 |
| `S_BR_SP_LIFTING_FACIAL` | R$ 720 | R$ 900 | R$ 1.200 | R$ 1.800 |
| `S_BR_SP_MARCA` | R$ 150 | R$ 150 | R$ 150 | R$ 180 |
| Novas iniciativas isoladas, sequenciais | R$ 0 | até R$ 430 | até R$ 390 | até R$ 450 |
| **Total máximo** | **R$ 2.940** | **R$ 3.400** | **R$ 4.200** | **R$ 5.880** |

No cenário 1, eventual retorno de lifting cervical a R$ 12/dia libera R$ 330, mas esse valor fica em reserva: não deve ser transferido automaticamente para outra campanha durante a janela. Nos cenários seguintes, os valores são tetos; aumentos devem ocorrer em degraus de 10%–20%, uma campanha por vez.

## Distribuição Meta por cenário

As campanhas atuais terminam em 16/08. Qualquer continuidade é uma nova decisão material e precisa de aprovação; nada deve ser renovado automaticamente por este relatório.

| Uso | Cenário 1 | Cenário 2 | Cenário 3 | Cenário 4 |
|---|---:|---:|---:|---:|
| WhatsApp direto — controle `M26F01W` | R$ 600 | R$ 900 | R$ 1.200 | R$ 1.500 |
| Site `M26F02S` | R$ 0 até QA; depois até R$ 300 | R$ 300 | R$ 300 | R$ 420 |
| Novo teste prospectivo isolado | R$ 0 | R$ 100 | R$ 300 | R$ 600 |
| Reserva não liberada | pelo menos R$ 300 | R$ 100 | R$ 0 | R$ 0 |
| **Gasto máximo liberado** | **R$ 600 antes do QA; até R$ 900 depois** | **até R$ 1.300** | **até R$ 1.800** | **até R$ 2.520** |
| **Envelope total, incluindo reserva** | **R$ 1.200** | **R$ 1.400** | **R$ 1.800** | **R$ 2.520** |

Reserva não liberada compõe o envelope, mas não o gasto autorizado. O controle Meta deve continuar direto ao WhatsApp. O Site só recebe verba depois de `M26F02S` aparecer de ponta a ponta. Um futuro teste criativo pode comparar `C01H01` e `C06H01` no mesmo objetivo, destino, público e janela. `C01` foi o melhor gerador de tráfego no Site; o recorte WhatsApp limpo por anúncio não foi obtido. Nenhum deles é “melhor vídeo” de negócio sem qualificação e consulta por criativo.

## Testes novos para mama, lipoaspiração e abdominoplastia

Os três testes são **prospectivos**, baseados em páginas atuais e demanda pública, não em campanhas antigas. Devem rodar em fila, no máximo um por vez no cenário 2, para preservar causalidade e orçamento.

| Procedimento | Intenção e página | Canal/mensagem | Orçamento e duração | Evento e métrica | Guardrail e desligamento |
|---|---|---|---|---|---|
| Mama | intenção específica de mastopexia/redução/volume; `/mama/` e guia de custo de mama | Google Pesquisa frase/exata; “entender qual abordagem faz sentido, participação direta e composição de custos” | R$ 15/dia por 14 dias, teto R$ 210 | contato válido e qualificado com click ID; CPQL | página e tracking aprovados; sem faixa não aprovada; desligar com R$ 210 ou 30 cliques sem contato válido, ou >30% de termos incompatíveis |
| Lipoaspiração | intenção de gordura localizada e planejamento; `/lipoaspiracao/` e guia de custo corporal | Google Pesquisa frase/exata; “indicação, regiões, limites, recuperação e custos compreensíveis” | R$ 15/dia por 14 dias, teto R$ 210 | contato válido, qualificado e termo de busca | sem promessa de emagrecimento; desligar nos mesmos limites ou se qualificação ficar abaixo do piso aprovado |
| Abdominoplastia | intenção de pele/diástase/abdome após gestação ou perda de peso; `/abdominoplastia/` e guia corporal | Google Pesquisa frase/exata; “avaliar pele e parede abdominal, estrutura e custo” | R$ 15/dia por 14 dias, teto R$ 210 | contato válido, qualificado e consulta solicitada quando o campo existir | excluir curso/SUS/grátis/caseiro; não misturar com lipo; desligar com teto sem contato válido ou tráfego incompatível |

Não executar os três simultaneamente. A ordem deve ser escolhida por volume atual no Planejador/termos e capacidade, fontes que não ficaram disponíveis nesta auditoria. Nenhum teste usa Performance Max ou correspondência ampla nesta fase.

## Otoplastia

O Google tem uma campanha ativa de otoplastia, mas três palavras exatas foram adicionadas em 13/08; não existe janela pós-mudança. Nenhuma campanha Meta de otoplastia estava ativa, portanto campanhas/criativos antigos foram excluídos e **não é possível concluir nesta auditoria que o problema atual seja o vídeo**.

Depois dos gates, um novo teste Meta pode isolar a hipótese criativa: vídeo específico para pais, presença da médica no início, indicação/segurança/recuperação e CTA direto; destino, público e orçamento devem permanecer idênticos entre variantes. O teste é uma iniciativa nova, não “reativação do vencedor antigo”, e só avança se produzir contato válido/qualificado, não visualização.

## Critérios de interrupção, manutenção e expansão

### Interromper ou voltar ao cenário anterior

- conversão Google em alerta por mais de 24 horas após tentativa de correção;
- duplicidade ou exposição de PII/PHI em qualquer evento;
- divergência plataforma↔CRM acima de 10% depois da latência acordada;
- reconciliação Calendar abaixo de 95% nas novas consultas;
- custo por qualificado mais de 30% acima da faixa aprovada por sete dias;
- termos incompatíveis acima de 30% do gasto de um teste;
- qualquer resposta do bot em rota ambígua/proibida ou P0/P1 operacional vencido;
- incapacidade de responder aos novos contatos dentro do SLA publicado.

### Manter

- mensuração saudável e reconciliada;
- qualidade e custo dentro da faixa por um ciclo completo;
- nenhuma regressão de fase, agenda ou privacidade;
- capacidade operacional suficiente.

### Ampliar

- dois ciclos consecutivos dentro dos guardrails;
- no Google, ao menos 20–30 conversões qualificadas aceitas em 30 dias antes de considerar tCPA;
- consultas confirmadas e realizadas reconciliadas, e não apenas agendadas na planilha;
- aumento de 10%–20% por vez, sem mudar simultaneamente lance, criativo, página e público.

## Plano priorizado

### Bloqueadores de mensuração

1. `GAD-01` + `DAT-08`: restaurar e reconciliar a conversão offline qualificada.
2. `DAT-01` a `DAT-04`: corrigir fase, duplicidade e vínculo oportunidade–consulta–Calendar.
3. `WEB-01` + `MAD-01`: fechar clique/conversa/oportunidade e o código `M26F02S`.
4. `BOT-03` + `BOT-04`: substituir fonte legada do painel humano e criar SLA por evento.

### Correções críticas

1. `GAD-03`: validar autorização e guardrail do aumento de lifting cervical.
2. `GAD-04`: confirmar que recomendações automáticas de lance permanecem desativadas.
3. `OPS-02`: unificar escolha, confirmação humana e Calendar.
4. `SEO-01` + `SEO-03`: consolidar domínio antigo e reconciliar horários públicos.

### Ganhos rápidos

- corrigir painel de saúde e fórmulas (`DAT-06`, `DAT-09`);
- revisar o rascunho Meta antes de qualquer publicação (`MAD-05`);
- expirar slots passados e fechar pendências vencidas (`OPS-01`, `OPS-03`);
- formalizar política separada de OAI-SearchBot/GPTBot (`SEO-07`).

### Testes

- Meta: C01 versus C06 no mesmo objetivo/destino, após reconciliação (`MAD-03`);
- lipo de papada: diagnóstico por termo/dispositivo/CTA antes de alterar (`WEB-03`);
- mama, lipoaspiração e abdominoplastia: fila de testes Google isolados;
- otoplastia Meta: somente iniciativa nova e prospectiva após gates.

### Mudanças estruturais

- ledger único de estágio, autoria e marcos comerciais;
- máquina de estados de agenda e reconciliação Calendar;
- entidade unificada entre `.com`, `.com.br`, clínica, médica e perfis controlados;
- Web Vitals de campo e dashboards por coorte.

### Ações que não devem ser executadas

- não aumentar Google agora nem usar `Limitada pelo orçamento` como justificativa;
- não adotar tCPA, Performance Max, correspondência ampla ou autoaplicação (`GAD-06`);
- não renovar/escalar Meta Site antes do teste ponta a ponta;
- não declarar `C06` melhor vídeo de negócio nem `C01` pior por gerar menos conversa;
- não reativar campanha Meta de otoplastia com base em histórico (`MAD-06`);
- não alterar texto, layout, vídeo, CTA ou qualquer característica de `/lifting-facial/` (`WEB-08`);
- não enviar PII, PHI, conversa ou procedimento a Pixel/CAPI/conversões aprimoradas;
- não apresentar consulta, cirurgia, receita ou ROAS antes de fechar agenda e financeiro (`BUD-05`).

## Mudanças estratégicas propostas — ainda não vigentes

### 1. Orçamento como escada por gates

- **Decisão atual:** orçamento Google de referência próximo de R$ 2.800/mês; distribuição vigente em observação.
- **Mudança proposta:** adotar teto de R$ 4.140 no cenário 1 e transição condicionada aos cenários 2–4.
- **Motivo/evidência:** live Google em R$ 98/dia, Meta em R$ 1.200 por ciclo e mensuração downstream incompleta.
- **Hipótese:** corrigir e liberar verba por evidência reduzirá desperdício sem sufocar demanda válida.
- **Métrica:** custo por qualificado aceito e consulta Calendar-validada.
- **Guardrail:** gates desta página; uma mudança material por vez.
- **Revisão:** 20/08 para técnica e 27/08 para primeira janela; depois a cada 30 dias.
- **Manter/ampliar/reverter:** conforme os critérios acima.

### 2. WhatsApp direto como controle Meta

- **Decisão atual:** Meta é teste complementar e o site/WhatsApp são rotas comparadas.
- **Mudança proposta:** usar WhatsApp direto como controle, mantendo Site apenas como teste instrumentado.
- **Evidência:** 41 contatos atribuídos no controle harmonizado versus zero código exato do Site; a causa do zero Site ainda não foi isolada.
- **Hipótese:** a rota curta preserva intenção; uma rota Site só deve competir se demonstrar qualidade, não LPV.
- **Métrica:** contato válido, qualificado e consulta confirmada.
- **Guardrail:** mesmo criativo/público/orçamento no teste de rota; nenhum aumento por conversa reportada.
- **Revisão:** após 14 dias e pelo menos 30 desfechos conciliados.
- **Regra:** manter controle enquanto rastreável; ampliar Site somente se empatar/superar qualidade; reverter extensão se o código continuar ausente.

Nenhuma dessas propostas altera o norte canônico nesta fase. Se aprovada para implementação, deve atualizar `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` e o histórico no mesmo trabalho.
