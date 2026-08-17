# Plano Meta Ads — ciclo de 15 dias

**Data da decisão:** 16/08/2026

**Conta:** Dra Amanda Schroeder — `1643959806249995`

**Fuso:** `America/Sao_Paulo`

**Estado:** `PUBLICADO E EM MONITORAMENTO — INÍCIO PROGRAMADO EM 17/08 ÀS 12H`

**Período observado na mídia:** 17/07/2026 a 15/08/2026, 30 dias completos; o dia 16/08 parcial foi excluído
**Regra:** Daniel autorizou integralmente a publicação em 17/08/2026. O pacote técnico foi publicado nos commits `2b5af19` e `436aff0`, o Apps Script canônico chegou à v97, o schema v1 foi habilitado, a sonda sintética concluiu com HTTP 200 e somente os três objetos listados neste plano foram publicados. Qualquer valor acima de R$ 900 no ciclo exige nova autorização.

## 1. Decisão recomendada

1. **Manter lifting facial somente no WhatsApp direto.** Renovar ou recriar `M26F01W` apenas com `C06H01` — Lifting; não manter `C01H01` — Avaliação e não renovar `M26F02S` — Site. A série de lifting continua porque já produziu contatos, qualificados e agendamentos, mas não será tratada como terceiro braço nem como controle causal do teste cervical.
2. **Interromper `M26O01W` antes de consumir o saldo restante.** Não abrir nova variante de otoplastia durante o ciclo cervical.
3. **Restringir o teste de destino ao lifting cervical:** `M26C01W` — WhatsApp direto — versus `M26C02S` — site → WhatsApp. Os dois braços usam o mesmo criativo `C07H01`, público rígido 40–65+, posicionamentos Advantage+, janela de 17/08/2026 às 12h a 01/09/2026 às 12h e orçamento total de R$ 300 por braço. O arquivo 1:1 é usado no Feed e o arquivo 9:16 enviado por Daniel é usado em Reels e Stories, sem recorte automático do quadrado. O lifting facial roda em paralelo, sempre por WhatsApp, e seus resultados serão acompanhados separadamente.
4. **Não iniciar o braço Site sem prova ponta a ponta.** Se Meta → site → WhatsApp → LEADS → CRM não chegar com campanha, criativo, landing page, página do CTA, caminho e confiança corretos, nenhum dos dois braços será publicado.
5. **Publicar organicamente sem reutilizar o post no anúncio.** Daniel decidiu publicar o Reels na quinta-feira, 20/08/2026, às 19h30. O orgânico deve ser identificado separadamente e não pode ser contado como resultado de `M26C01W` ou `M26C02S`; os anúncios usam os arquivos enviados diretamente ao Ads Manager para preservar igualdade e editabilidade.
6. **Preservar orçamento, público, posicionamentos, texto e criativo dos dois braços cervicais por 15 dias completos.** A única diferença deliberada entre eles será a rota. Mudanças na campanha de lifting facial não entram na análise causal do experimento cervical.

## 2. Evidência observada

### Campanhas

| Campanha | Gasto | Impressões | Alcance | Frequência | Cliques no link | CTR link | CPC link | Resultado Meta | Custo/resultado |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `M26F01W` — WhatsApp direto | R$ 598,45 | 7.013 | 3.398 | 2,06 | 108 | 1,54% | R$ 5,54 | 86 conversas | R$ 6,96 |
| `M26F02S` — site | R$ 595,38 | 50.839 | 28.152 | 1,81 | 2.537 | 4,99% | R$ 0,23 | 2.020 LPVs | R$ 0,29/LPV |
| `M26O01W` — otoplastia infantil | R$ 214,05 | 5.015 | 3.631 | 1,38 | 15 | 0,30% | R$ 14,27 | 1 conversa | R$ 214,05 |

`M26F01W` e `M26F02S` terminam em 16/08/2026. A campanha de otoplastia está programada até 19/08/2026, com orçamento total de R$ 270,00 e saldo nominal de R$ 55,95 no momento da leitura.

### Criativos faciais

| Rota | Criativo | Gasto | Impressões | Cliques no link | CTR link | CPC link | Resultado Meta | Custo/resultado |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| WhatsApp | `C06H01` — Lifting | R$ 565,69 | 6.705 | 106 | 1,58% | R$ 5,34 | 85 conversas | R$ 6,65 |
| WhatsApp | `C01H01` — Avaliação | R$ 32,76 | 308 | 2 | 0,65% | R$ 16,38 | 1 conversa | R$ 32,76 |
| Site | `C01H01` — Avaliação | R$ 489,12 | 43.716 | 2.210 | 5,06% | R$ 0,22 | 1.780 LPVs | R$ 0,27/LPV |
| Site | `C06H01` — Lifting | R$ 106,26 | 7.123 | 327 | 4,59% | R$ 0,32 | 240 LPVs | R$ 0,44/LPV |

O resultado muda com a rota. `C01H01` foi eficiente para gerar visita barata, mas não há resultado de negócio atribuído ao site. `C06H01` foi muito superior para iniciar conversa. Por isso, o próximo ciclo usa `C06H01` como controle de intenção no WhatsApp e não conclui que `C01H01` seja um vídeo ruim em qualquer contexto.

### Funil anônimo da LEADS

Janela de 30 dias:

- total Meta: 83 contatos, 13 qualificados ou posteriores, 2 agendados ou posteriores e 0 realizados/fechados registrados;
- `M26F01W`: 67 contatos, 12 qualificados ou posteriores e 2 agendados ou posteriores;
- custo observado de `M26F01W`: R$ 8,93 por contato, R$ 49,87 por qualificado e R$ 299,23 por agendamento registrado;
- 16 de 83 contatos Meta ficaram em caminho/campanha desconhecidos, 19,3%; nos últimos 7 dias foram 6 de 12, 50%;
- `M26F02S`: 0 registros pelo código exato. Isso significa **atribuição não comprovada**, não zero contatos reais;
- otoplastia: uma linha recente foi ligada ao ID do anúncio e permanece em `Novo`, sem consulta. O código `M26O01W` não chegou de forma canônica.

## 3. Parecer sobre os vídeos

### Avaliação facial versus lifting

**Fato observado:** no WhatsApp, `C06H01` teve CTR de link 2,4 vezes maior, CPC de link cerca de 67% menor e custo por conversa cerca de 80% menor que `C01H01`.

**Inferência:** `C06H01` comunica intenção e próximo passo melhor para pessoas prontas para conversar. A confiança é média-alta, apesar da entrega desigual, porque todos os sinais observáveis apontam na mesma direção.

**Limite:** a Meta direcionou 94,5% do gasto do conjunto a `C06H01`; portanto, esse recorte não é um experimento aleatorizado.

### Otoplastia

**Fato observado:** 5.015 impressões, frequência de apenas 1,38, CTR link de 0,30%, CPC link de R$ 14,27 e uma conversa a R$ 214,05.

**Inferência:** há sinal forte de baixa aderência entre criativo, promessa, público e próximo passo. A frequência baixa torna fadiga improvável. O vídeo é um provável componente do problema, mas não pode ser isolado como causa única porque havia um único anúncio e ele foi criado no Instagram, sem edição completa no Ads Manager.

**Decisão:** não gastar mais no criativo atual. Um futuro teste deve mostrar a médica nos primeiros dois segundos, falar com o responsável sem explorar vergonha, explicar quando vale avaliar, segurança e recuperação, e terminar com um único CTA para WhatsApp.

### Novo vídeo de lifting cervical

**Fato observado:** os arquivos locais de Feed `1080×1080` e Reels/Stories `1080×1920` têm 51,29 segundos, 30 fps, áudio e legendas. São adaptações do mesmo conteúdo, não dois criativos distintos. A abertura mostra a Dra. Amanda e apresenta gordura, flacidez, musculatura e perda do contorno; o vídeo diferencia lipo de papada, cervicoplastia e associação, reforça naturalidade, credenciais e avaliação individual.

**Decisão final do arquivo:** as novas versões 1080×1080 e 1080×1920 corrigem `cervecoplastia` para `cervicoplastia`. O áudio e a legenda embutida continuam com `Clique no link da bio`; Daniel aceitou formalmente essa inconsistência em 16/08/2026. O mesmo vídeo e a mesma mensagem textual do anúncio devem ser usados nos dois braços, de modo que o CTA embutido não varie entre eles.

**Parecer:** os arquivos estão aprovados para o ciclo. Não criar um segundo gancho agora: a pergunta é rota, não vídeo. A publicação orgânica será separada dos anúncios e estes não reutilizarão o post existente.

## 4. Desenho do próximo ciclo

### Cenário base recomendado

| Campanha | Destino | Público | Criativo | Orçamento | Janela | Papel |
|---|---|---|---|---:|---|---|
| `M26F01W` — lifting facial | WhatsApp direto; nova campanha de Tráfego com meta de conversas | São Paulo +20 km, 40–65+ rígido, todos os gêneros | somente `C06H01` — Lifting; 1:1 no Feed e 9:16 em Reels/Stories | R$ 300 total | 17/08 12h a 01/09 12h | campanha contínua, analisada separadamente; o objeto histórico não será reativado |
| `M26C01W` — lifting cervical | WhatsApp direto; campanha de Tráfego com meta de conversas | São Paulo +20 km, 40–65+ rígido, todos os gêneros | `C07H01`; quadrado no Feed e arquivo 9:16 próprio em Reels/Stories | R$ 300 total | 17/08 12h a 01/09 12h | braço A |
| `M26C02S` — lifting cervical | `/lifting-cervical/` → WhatsApp; campanha de Tráfego com meta de LPV | idêntico ao braço A | o mesmo `C07H01` e as mesmas adaptações por posicionamento | R$ 300 total | 17/08 12h a 01/09 12h | braço B |

O experimento cervical soma R$ 600 em 15 dias. A continuidade do lifting facial acrescenta R$ 300 no rascunho, levando o cenário base a R$ 900. Os braços cervicais usam orçamento total fixo de R$ 300 em campanhas separadas, sem Advantage Campaign Budget redistribuir verba entre eles. A equivalência planejada é de orçamento, público, duração, texto e criativo; os algoritmos ainda podem selecionar inventário e pessoas diferentes, portanto o resultado é operacional, não um ensaio causal puro.

### Objetos Meta publicados seletivamente em 17/08/2026

| Rota | Campanha | Conjunto | Anúncio principal | Controle de legado |
|---|---:|---:|---:|---|
| Lifting facial → WhatsApp | `120251254720690627` | `120251254720700627` | `120251254720680627` | anúncio herdado `120251254720710627` desligado; extensão do objeto histórico descartada |
| WhatsApp direto | `120251248762160627` | `120251248762180627` | `120251248762170627` | anúncio herdado `120251248762190627` desligado |
| Site → WhatsApp | `120251249058750627` | `120251249058780627` | `120251249058760627` | anúncio herdado `120251249058770627` desligado |

Os dois anúncios cervicais principais usam o texto aprovado, título `Entenda o lifting cervical` e descrição `Avaliação individual do pescoço e da mandíbula.`. O braço direto usa CTA `Fale conosco` e o modelo salvo com `Ref. M26C01W-C07H01`; o braço Site usa CTA `Saiba mais`, URL `/lifting-cervical/` e os parâmetros canônicos. Em ambos, Feed recebe `Campanha cervical 1x1 arrumado final.mp4` e Reels/Stories recebem `Campanha Lifting Cervical - Reels Stories 9x16 - ritmo e audio.mp4` em 1080×1920. O anúncio facial usa o vídeo vencedor de 46,9 segundos em suas versões 1:1 e 9:16, o texto histórico de `C06H01`, título `Cirurgia ou outro tratamento?`, descrição `A indicação começa pela avaliação.` e o modelo salvo com `Ref. M26F01W-C06H01`. A Meta confirmou em cada publicação exatamente uma campanha, um conjunto e um anúncio; os anúncios herdados permaneceram desligados.

### O que este experimento responderá

O teste compara as duas rotas operacionais completas, não apenas o clique. O braço WhatsApp usa a otimização natural de conversa; o braço Site usa chegada à página e a pessoa decide se avança ao WhatsApp. Como os objetivos de entrega não são idênticos, a conclusão será `qual rota produz mais contatos válidos, qualificados e consultas com o mesmo orçamento`, e não uma causalidade pura do destino isolado.

`M26F01W/C06H01` permanece como campanha contínua de lifting facial, não como braço C. Seus resultados servem para acompanhar a continuidade de uma frente que já funcionou e a saúde operacional do WhatsApp, mas não para escolher a rota do lifting cervical. Sobreposição de audiência e exposição cruzada serão limitações registradas, não ignoradas.

`M26F02S` provou que a Meta consegue entregar LPVs baratos, mas não provou o vínculo até o contato. Por isso, o teste cervical só começa depois que uma sonda controlada demonstrar esse vínculo; sem a sonda, o experimento é cancelado ou adiado.

## 5. Gates antes de publicar

Todos são obrigatórios:

1. os dois braços cervicais devem permanecer com São Paulo +20 km e limite original rígido 40–65+; no braço direto, somente WhatsApp pode estar selecionado como destino de mensagem;
2. `M26C01W-C07H01` deve identificar o WhatsApp direto; `M26C02S-C07H01` deve sair do CTA do site sem depender de o paciente manter o texto manualmente;
3. o braço Site deve entrar em `/lifting-cervical/` com `origem=M26C02S`, `utm_source=meta`, `utm_medium=paid_social`, `utm_campaign=M26C02S` e `utm_content=C07H01`; campanha, conjunto e anúncio devem receber parâmetros/IDs estáveis quando fornecidos pela Meta;
4. o modo rico e o schema v1 foram ativados de forma coordenada após autorização integral, com rollback documentado e sem usar dado de paciente;
5. uma sonda sintética sem paciente deve comprovar Meta → landing → navegação → CTA → WhatsApp → webhook → LEADS → CRM, com origem inicial `Meta Ads`, caminho `site → WhatsApp`, campanha `M26C02S`, criativo `C07H01`, landing e página do CTA corretas, confiança explícita, zero PII e zero first touch sobrescrito;
6. `M26C01W` e `M26C02S` devem entrar no registro de campanhas, no agregado anônimo e na lógica de resultado principal da rotina Meta;
7. os Meta Ad IDs `120251248762170627`, `120251249058760627` e `120251254720680627` devem estar no mapa explícito do webhook como fallback; nunca inferir por semelhança;
8. verificar `age_min=40` nos dois braços, não apenas no nome ou na sugestão Advantage+;
9. salvar baseline e horário de ativação; o dia parcial de lançamento não entra na comparação.
10. a continuidade de `M26F01W` deve usar o novo objeto de Tráfego, somente `C06H01`, destino WhatsApp, R$ 300 total, São Paulo +20 km e controle rígido 40–65+; `C01H01`, a rota Site e o objeto histórico permanecem fora desse ciclo.

Se qualquer gate falhar, adiar o início dos dois braços. Não lançar apenas um braço, não aceitar público 25+ nos braços cervicais e não usar uma referência textual simples como prova suficiente da rota Site.

## 6. Checkpoints e regras

`D0` é 17/08/2026 às 12h, início programado na Meta; o dia seguinte é o primeiro dia completo. Os checkpoints absolutos são 20/08, 24/08, 01/09 e 08/09. A publicação orgânica ficou agendada separadamente para 20/08/2026 às 19h30.

| Checkpoint | Janela | Avaliar | Regra |
|---|---|---|---|
| D+3 | 3 dias completos | equilíbrio de gasto, idade efetiva, código, mensagem, LPV, clique no CTA, conversas e contatos identificados | corrigir somente falha técnica; pausar ambos se a atribuição do Site não for comprovável |
| D+7 | 7 dias completos | contatos identificados, válidos e qualificados por rota; cobertura conversa/CTA → contato | pausar um braço se gastar ≥R$ 150 sem contato válido com tracking saudável; não trocar criativo |
| D+15 | 15 dias completos | qualificados, agendados, custo/qualificado e custo/agendamento por rota | declarar vencedor só com diferença de negócio e amostra suficiente; caso contrário, N/D e não escalar |
| D+22 | sete dias de latência | classificações, comparecimento e consultas tardias | consolidar a decisão sem reabrir a janela de mídia |

Guardrails permanentes:

- sonda sintética do braço Site com 100% dos campos obrigatórios; durante a veiculação, cobertura entre conversas/cliques de CTA identificáveis e contatos de pelo menos 80%; abaixo disso, resultado por rota fica N/D;
- zero resposta perdida, duplicidade, PII em relatório ou first touch sobrescrito;
- não mudar orçamento, público, posicionamento, destino ou criativo durante a janela;
- não ampliar orçamento antes de pelo menos cinco qualificados e uma consulta agendada na rota candidata, além de custo por qualificado igual ou inferior a R$ 75;
- reverter diante de idade efetiva abaixo de 40, código ausente nos primeiros contatos, rota incorreta ou perda operacional.

## 7. O que não fazer neste ciclo

- não renovar `M26F02S`, não reativar `C01H01` e não acrescentar uma versão Site ao lifting facial durante o teste;
- não usar `M26F01W/C06H01` como terceiro braço nem comparar diretamente seus resultados com cervical como se procedimento e criativo fossem equivalentes;
- não rodar novo criativo de otoplastia ao mesmo tempo que o cervical;
- não reutilizar a publicação orgânica como anúncio e não misturar tráfego orgânico com os resultados dos dois braços pagos;
- não alterar a campanha Google de lifting cervical por causa deste teste Meta;
- não tratar conversa iniciada como paciente, consulta ou cirurgia;
- não publicar o rascunho atual de otoplastia sem revisão: ele contém mudanças de nome, público e posicionamento e não é a campanha cervical.

## 8. Fontes e limitações

- Meta Ads Manager, conta `1643959806249995`, leitura em 16/08/2026 BRT, período 17/07–15/08;
- agregado anônimo `Meta_Agregados`, gerado em 16/08/2026 às 08:27 BRT;
- planilha LEADS, consulta somente a campos não identificadores em 16/08/2026;
- `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` e `campanhas/REGISTRO-CODIGOS-ATRIBUICAO.md`.

Retenção de vídeo por segundo/quartil do criativo de otoplastia e do novo vídeo cervical ficou N/D nesta coleta. O vídeo cervical foi revisado por metadados, legendas embutidas e quadros-chave, não por dados de entrega. Consultas realizadas e procedimentos fechados permanecem N/D; zero registrado não prova zero real enquanto Calendar, CRM e oportunidade não estiverem integralmente reconciliados.

## 9. Checklist único para 17 de agosto

Executar nesta ordem, sem pular o gate:

1. revisar o diff e confirmar o commit local do pacote cervical;
2. validar os três IDs canônicos do Apps Script com `apps-script:verify-target`;
3. publicar o Apps Script preservando o deployment canônico e habilitar o schema v1 pelo procedimento documentado;
4. publicar no Netlify exatamente o mesmo commit, com `attributionJourneyEnabled=true`, os dois Meta Ad IDs mapeados e os novos assets da página;
5. verificar produção em mobile: vídeo cervical destacado em `/lifting-cervical/` e `/lipo-de-papada/`, sem autoplay, sem overflow e com poster;
6. rodar a sonda sintética e exigir sucesso até LEADS/CRM, sem paciente real;
7. no Gerenciador de Anúncios, revisar e publicar **somente** as três campanhas, conjuntos e anúncios principais listados na seção 4; não publicar os anúncios herdados, o rascunho de otoplastia nem outros itens da fila;
8. confirmar depois da publicação: campanha/conjunto/anúncio ativos, datas e orçamento corretos, WhatsApp como único destino do braço direto, URL/UTMs do Site, idade rígida 40–65+ e arquivo 9:16 em Reels/Stories;
9. revisar e publicar separadamente o novo `M26F01W` somente se campanha, conjunto e anúncio principal coincidirem com os IDs da seção 4, `C01H01` continuar desligado e o controle efetivo permanecer 40–65+;
10. registrar a hora real de ativação e então criar os checkpoints D+3, D+7, D+15 e D+22. Se a ativação ocorrer em 17/08 às 12h, as referências são 20/08, 24/08, 01/09 e 08/09.

Qualquer falha nos passos 2–6 bloqueia os dois braços cervicais. Uma falha apenas em `M26F01W` não autoriza mudar o desenho cervical; apenas adia a extensão facial.
