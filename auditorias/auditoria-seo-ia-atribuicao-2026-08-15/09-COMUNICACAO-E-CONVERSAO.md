# Auditoria de comunicação e conversão

**Escopo:** comunicação médica, jornada e conversão das 44 URLs do sitemap, incluindo `/lifting-facial/`
**Data da auditoria:** 2026-08-15
**Fuso:** America/Sao_Paulo (UTC−03:00)
**Agente responsável:** AGENTE 4 — comunicação, conversão, jornada e conformidade médica
**Natureza:** auditoria somente leitura; nenhuma recomendação foi implementada

## Parecer executivo

O site tem uma base de comunicação acima da média para uma jornada médica eletiva: explica causa antes de técnica, fala de limites, recuperação e riscos, evita garantias explícitas e sustenta uma proposta coerente de naturalidade, cuidado direto e decisão sem pressão. Essa base deve ser preservada.

Há, porém, dois riscos que justificam **contenção e revisão prévia P0**, sem edição automática:

1. **Preço público de procedimentos:** o HTML de `/lifting-facial/` e `/conteudos/quanto-custa-lifting-facial-sao-paulo/` publica faixas de preço de minilifting e lifting facial, inclusive em FAQ/schema. Isso é **fato observado**. A compatibilidade com a Resolução CFM nº 2.336/2023 é uma **inferência jurídico-regulatória**, não uma conclusão legal: o art. 9º, VI permite divulgar valor de consulta; o art. 9º, VII trata do acordo entre as partes sobre valores de procedimentos particulares; a cautela contra anunciar previamente valores de procedimentos dependentes de diagnóstico/avaliação consta da **Exposição de Motivos**, e não literalmente do inciso VII. A decisão exige validação documentada com Codame/CRM e jurídico.
2. **Galerias de resultados e imagens corporais:** há galerias ou imagens de resultado em 17 páginas; imagens mamárias/corporais aparecem em páginas sem aviso/restrição etária identificável no HTML, e um mesmo caso é reutilizado em várias páginas. Isso é **fato observado**. A aplicação dos requisitos do art. 14 — finalidade educativa, contexto, resultados satisfatórios e insatisfatórios/complicações, anonimato, autorização e cuidado adicional em áreas íntimas — é **inferência regulatória** e precisa de revisão caso a caso. A existência de autorizações escritas é **N/D**; sua ausência não foi presumida.

Outros pontos de alto impacto são a inconsistência de credenciais, a fragmentação de CTAs, a ausência de informações práticas da consulta em 11 de 23 páginas comerciais e lacunas de fontes/datas em parte do conteúdo clínico. A continuidade página → WhatsApp é forte no desenho, mas sua eficácia até contato válido, qualificação, consulta e procedimento é **N/D** sem reconciliação operacional.

## 1. Método, escopo e regras de evidência

Foram examinados o HTML das 44 páginas do repositório, o sitemap, componentes e mensagens de WhatsApp, documentos estratégicos e operacionais, uma amostra pública das páginas, a auditoria anterior disponível e fontes oficiais do CFM e da Receita Federal. O norte canônico adotado foi `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`; nenhum norte concorrente foi criado.

### Classificação usada

| Classe | Uso neste relatório |
|---|---|
| Fato observado | Conteúdo, marcação, CTA, imagem ou comportamento diretamente encontrado no repositório/site/documento. |
| Cálculo | Contagem derivada de inventário reproduzível, sem inferir causalidade. |
| Inferência | Interpretação sustentada por fatos, mas que depende de contexto ou julgamento. |
| Hipótese | Explicação ou efeito ainda não demonstrado, a validar por teste. |
| N/D | Não disponível ou não demonstrado; nunca tratado como zero. |

### Limitações relevantes

- O inventário de HTML cobre as 44 URLs do sitemap no repositório. A extração semântica do site público foi parcial por limitações do mecanismo de acesso; por isso, paridade exata entre repositório e produção é **N/D** neste relatório. Status HTTP, renderização, desempenho e indexação pertencem às frentes técnicas.
- Não houve leitura de conversas de pacientes, planilha LEADS, CRM, bot em produção ou autorizações de imagem. Conversão real, qualidade dos contatos e consentimentos de imagem são **N/D**.
- Não se realizou teste com lead real nem se enviou mensagem pelo WhatsApp.
- Esta é avaliação de comunicação e risco, não parecer jurídico. Toda conclusão normativa é indicada como inferência e deve ser validada com Codame/CRM e jurídico antes de qualquer decisão editorial.
- Não foram copiados nomes, telefones, e-mails, mensagens literais, identificadores ou imagens de pacientes.

## 2. Registro das evidências

| ID | Fonte | Data/hora | Método e período | Evidência usada | Limitação | Confiança |
|---|---|---|---|---|---|---|
| E-COM-01 | `AGENTS.md` | 2026-08-15 08:50–09:00 −03:00 | Leitura integral; versão local corrente | Obrigatoriedade do Norte Estratégico e limites de publicação | Regra interna, não prova de produção | Alta |
| E-COM-02 | `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md` | 2026-08-15 08:50–09:20 −03:00 | Leitura integral; versão local corrente | Prioridade facial; naturalidade; cuidado direto; consulta de R$ 500; CTA principal e resultado de negócio | Estratégia declarada; eficácia real exige dados | Alta |
| E-COM-03 | Guia de linguagem, plano de simplificação e manuais operacionais locais | 2026-08-15 08:55–09:25 −03:00 | Leitura documental | Linguagem permitida, continuidade WhatsApp e decisões anteriores | Pode divergir do comportamento de produção | Alta para o desenho; média para execução |
| E-COM-04 | 44 arquivos `index.html`, sitemap e componentes do repositório | 2026-08-15 09:05–09:40 −03:00 | Inventário automatizado + leitura dirigida; snapshot local | Títulos, H1/H2, CTAs, preços, credenciais, fontes, galerias e informações de consulta | Paridade pública exata N/D | Alta para o snapshot |
| E-COM-05 | `https://draamandaschroeder.com.br/` e URLs internas | 2026-08-15 09:10–09:45 −03:00 | Abertura pública e extração de conteúdo | Confirmação parcial de mensagens, credenciais e faixas públicas | Algumas páginas não foram extraídas; cache possível | Média |
| E-COM-06 | [Resolução CFM nº 2.336/2023 — PDF oficial](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf) | 2026-08-15 09:15–09:40 −03:00 | Leitura dirigida da norma e exposição de motivos; vigente consultada na data | Identificação, permissões, vedações e imagens de pacientes | Aplicação ao caso concreto requer Codame/jurídico | Alta para o texto; média para o enquadramento |
| E-COM-07 | [Manual comentado CFM — capítulo 2](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-2), [capítulo 4](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-4), [capítulo 6](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-6) e [capítulo 9](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-9) | 2026-08-15 09:15–09:45 −03:00 | Consulta às páginas oficiais | Interpretação institucional sobre identificação, preços, promessas e imagens | Comentário institucional não substitui análise do caso concreto | Alta |
| E-COM-08 | [Manual de Publicidade Médica — portal CFM](https://portal.cfm.org.br/bb_publicacoes/manual-de-publicidade-medica/) | 2026-08-15 09:20–09:45 −03:00 | Consulta oficial | Contexto complementar da regulamentação | Não é parecer individual | Alta |
| E-COM-09 | [Receita Federal — estética](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/imposto-de-renda/dirpf/deducoes/despesas-medicas-relacionadas-a-estetica) e [comprovação de despesas médicas](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/malha-fiscal/antecipacao/despesas-medicas) | 2026-08-15 09:25–09:45 −03:00 | Consulta a páginas oficiais vigentes na data | Condições para dedução e comprovação | Situação fiscal individual varia | Alta |
| E-COM-10 | Auditoria integrada anterior, janela de 28 dias declarada no documento | 2026-08-15 09:00–09:30 −03:00 | Leitura do relatório local, sem reconsulta às plataformas | Sinal de 35 sessões e nenhum evento principal em `/lipo-de-papada/`; 49 eventos WA e 35 key events agregados | Dados não revalidados; não provam causalidade nem conversão final | Média |

## 3. Achados transversais

### 3.1 Base estratégica e ética a preservar

**Fato observado, confiança alta.** A maioria das páginas comerciais organiza a narrativa em torno de queixa, causa anatômica, opções, limites, riscos, recuperação e decisão individualizada. Expressões de cautela como “quando indicado”, “pode”, “depende” e a possibilidade de não indicar intervenção aparecem de forma consistente. O uso de “deep plane” é condicionado à indicação e não apresentado como técnica universalmente superior.

**Inferência, confiança alta.** Essa estrutura é coerente com o Norte Estratégico e reduz risco de promessa excessiva. Também favorece qualificação: pacientes chegam ao WhatsApp com expectativa mais realista e pergunta mais específica.

**Regra:** preservar a lógica causa → indicação → limites → recuperação → próximo passo; qualquer otimização deve ser testada contra contatos válidos, qualificados e consultas, não apenas cliques.

### 3.2 Faixas públicas de preço de lifting: revisão P0

**Fato observado, confiança alta.** `/lifting-facial/` e `/conteudos/quanto-custa-lifting-facial-sao-paulo/` exibem as faixas “R$ 18–25 mil” para minilifting e “R$ 26–42 mil” para lifting facial, tanto em conteúdo visível quanto em respostas estruturadas/FAQ. A consulta de R$ 500 é divulgada em outras páginas.

**Enquadramento normativo — inferência, confiança média.** O art. 9º, VI da Resolução CFM nº 2.336/2023 permite divulgar o valor da consulta. O art. 9º, VII registra a possibilidade de acordo entre as partes sobre valores de procedimentos particulares antes do atendimento/execução. A cautela específica sobre anunciar previamente valores de procedimentos cuja definição depende de diagnóstico e avaliação aparece na **Exposição de Motivos** da resolução. Portanto, não é correto atribuir uma proibição literal ao art. 9º, VII. A publicidade dessas faixas pode gerar conflito interpretativo relevante por se tratar de cirurgia individualizada, mas a conclusão depende de Codame/CRM e jurídico.

**Ação proposta:** conter expansão/reutilização das faixas, inventariar todas as ocorrências visíveis e estruturadas e obter decisão formal documentada. Não remover nem editar nesta auditoria.

### 3.3 Imagens de resultados, número de casos e acesso etário: revisão P0

**Cálculo, confiança alta.** Dezessete páginas contêm galerias ou imagens de resultados. As contagens abaixo são de imagens/montagens encontradas no HTML, não de pacientes.

| Página | Imagens/montagens de resultado no HTML | Pacientes/casos distintos demonstráveis | Observação |
|---|---:|---|---|
| `/` | 4 | N/D | A home reúne resultados de quatro procedimentos; pacientes e autorizações documentais são N/D. |
| `/avaliacao-facial/` | 3 | N/D | Número de pacientes não pode ser inferido com segurança por vistas. |
| `/blefaroplastia/` | 3 | N/D | Autorizações: N/D. |
| `/lifting-facial/` | 4 | N/D | Conjunto exige revisão de contexto, complicações e autorização. |
| `/lifting-cervical/` | 4 | N/D | Múltiplas vistas podem representar menos pacientes. |
| `/lipo-de-papada/` | 2 | N/D | Não tratar duas imagens como dois pacientes. |
| `/injetaveis/` | 3 | N/D | Autorizações: N/D. |
| `/otoplastia/` | 3 | N/D | Autorizações: N/D. |
| `/otoplastia-adulto/` | 2 | N/D | Autorizações: N/D. |
| `/otoplastia-infantil/` | 2 | Ao menos 2 casos descritos no HTML; documentação N/D | O HTML identifica “caso 1” e “caso 2”; autorizações documentais fora do repositório são N/D. |
| `/mama/` | 3 | Ao menos 1; total N/D | O HTML descreve múltiplas vistas do mesmo caso combinado. |
| `/mastopexia/` | 3 | Ao menos 1; total N/D | Reutiliza ativo do mesmo caso presente em outras páginas. |
| `/mastopexia-com-protese/` | 3 | Ao menos 1; total N/D | Múltiplas vistas não equivalem a pacientes distintos. |
| `/mamoplastia-redutora/` | 3 | Ao menos 1; total N/D | Mesmo caso/ativo aparece em outras rotas. |
| `/protese-de-mama/` | 3 | Ao menos 1; total N/D | Mesmo caso/ativo aparece em outras rotas. |
| `/contorno-corporal/` | 3 | Ao menos 1; total N/D | Caso combinado mama/abdome reutilizado. |
| `/abdominoplastia/` | 2 | Ao menos 1; total N/D | Caso combinado reutilizado; total de pacientes N/D. |

**Fato observado, confiança alta.** Um mesmo ativo de antes/depois mamário/abdominal aparece em oito páginas, inclusive na home. O HTML não contém aviso ou controle textual de acesso para maiores de 18 anos nas páginas inventariadas. Algumas imagens mostram áreas mamárias/corporais e algumas imagens faciais, embora parcialmente ocultadas, podem manter características potencialmente reidentificáveis. Não foi encontrada no repositório documentação de autorização; isso significa **N/D**, não “sem autorização”.

**Enquadramento normativo — inferência, confiança média-alta.** O art. 14 e o capítulo 9 comentado pelo CFM vinculam o uso de imagens a finalidade educativa, informações de indicação/fatores que influenciam o resultado, apresentação de evolução satisfatória e insatisfatória/complicações, anonimato e autorização. Para conjuntos de “antes e depois”, o texto oficial estabelece composição com imagens de, no mínimo, quatro pacientes; por isso, a contagem de montagens ou vistas do mesmo caso não satisfaz automaticamente esse critério. O material oficial também trata de restrição/aviso para acesso de maiores de 18 anos em imagens de mamas, glúteos e regiões íntimas em sites. A suficiência de cada galeria e o tratamento de características reidentificáveis exigem avaliação individual com Codame/jurídico e conferência da autorização específica.

**Ação proposta:** não ampliar nem reutilizar galerias antes da revisão; criar inventário interno por caso, vistas, contexto, autorização, data, revogabilidade e canais; validar necessidade de aviso/controle etário e adequação de cada ativo. Nenhuma imagem foi alterada.

### 3.4 Credenciais inconsistentes

**Fato observado, confiança alta.** Oito páginas usam a formulação “médica formada pela UNICAMP”; outras usam “Formação pela UNICAMP” ou “Graduada e formada em Cirurgia Plástica pela UNICAMP”; poucas explicitam residência médica. Documentos estratégicos internos determinam verificar e preferir formulação precisa sobre residência em Cirurgia Plástica. A instituição da graduação médica, separada da residência, é **N/D** neste trabalho.

**Inferência, confiança alta.** Variações podem confundir graduação, formação especializada e residência, afetando confiança e consistência da entidade. Recomenda-se validar os fatos documentais e adotar uma única redação aprovada, sem ampliar credenciais.

### 3.5 Fragmentação de CTA e informações práticas

**Cálculo, confiança alta.** Foram encontrados 213 links rastreados para WhatsApp em 43 das 44 páginas e 21 rótulos visíveis distintos. Os mais frequentes incluem “Conversar com a equipe”, “Ver horários para avaliação”, “Ver disponibilidade”, “Ver horários da consulta” e “Ver disponibilidade da consulta”.

**Inferência, confiança média-alta.** A variedade dilui a promessa operacional de um caminho principal e dificulta comparar desempenho. Não há prova de que um rótulo específico converta melhor. Recomenda-se uma taxonomia simples: CTA primário de agenda/disponibilidade e CTA secundário de dúvida, preservando mensagens e códigos de atribuição até a frente técnica autorizar qualquer mudança.

**Cálculo, confiança alta.** Das 23 páginas comerciais/roteadoras, 12 exibem valor/formas de pagamento da consulta e 11 não: `/procedimentos/`, `/mastopexia/`, `/mastopexia-com-protese/`, `/mamoplastia-redutora/`, `/protese-de-mama/`, `/lip-lifting/`, `/lipoaspiracao/`, `/abdominoplastia/`, `/pos-bariatrica/`, `/braquioplastia/` e `/ninfoplastia/`.

**Hipótese, confiança média.** A falta de informação prática nessas páginas pode gerar perguntas repetitivas, abandono ou lead desalinhado. Deve ser testada por contatos válidos e agendamentos, não por CTR isolado.

### 3.6 Conteúdo clínico: fontes e atualização

**Cálculo, confiança alta.** Entre 19 artigos clínicos/educacionais além do hub, 14 exibem data de atualização e 13 têm seção de fontes/referências identificável. Seis não apresentaram marcador de fontes no HTML: consulta, segurança, naturalidade, lipoenxertia facial, papada/contorno cervical e cuidados de cicatrização. Quatro desses artigos têm aproximadamente 271–312 palavras.

**Inferência, confiança média-alta.** Extensão curta não é defeito por si só. O risco relevante é responder questões médicas sem fonte verificável, data/revisão ou contexto suficiente. Recomenda-se completar revisão médica, fontes primárias e limitações, sem aumentar texto artificialmente.

### 3.7 Continuidade página → WhatsApp

**Fato observado, confiança alta para o desenho.** CTAs carregam mensagens contextualizadas por página/procedimento, e o manual operacional orienta a equipe a responder à pergunta antes de repetir links e a manter continuidade. Não há formulário intermediário.

**N/D.** Não foi demonstrado neste trabalho se o código/intenção chega ao webhook, bot, LEADS e CRM, nem se resulta em contato válido, qualificação, consulta ou procedimento.

**Hipótese, confiança média.** A continuidade semântica tende a reduzir atrito, mas só deve ser considerada eficaz após reconciliação de uma amostra anônima ponta a ponta.

### 3.8 Nota fiscal e Imposto de Renda

**Fato observado, confiança alta.** A home afirma que a nota fiscal “pode ser usada no Imposto de Renda”. A Receita informa que procedimentos estéticos realizados por médico em estabelecimento médico podem se enquadrar como despesa médica, com condições de comprovação e limitação à parcela não reembolsada.

**Inferência, confiança média-alta.** A frase é direcionalmente compatível, mas ampla para situações fiscais individuais. Recomenda-se condicioná-la à legislação aplicável, documentação e caso do contribuinte, sem prometer dedução.

## 4. Avaliação das 44 páginas

Legenda: **FO** fato observado; **INF** inferência; **HIP** hipótese; **N/D** não demonstrado.

| URL | Intenção e acerto principal | Lacuna/risco observado | Recomendação de comunicação | Classe / prioridade |
|---|---|---|---|---|
| `/` | Descoberta ampla; posicionamento natural, consulta e cuidado direto claros | Galeria corporal reutilizada; credencial ambígua; frase fiscal ampla; múltiplos CTAs | Revisar imagem/18+, validar credencial, qualificar afirmação fiscal e simplificar CTA após baseline | FO+INF / P0 imagem; P1 demais |
| `/procedimentos/` | Roteia por região/queixa sem forçar procedimento | Não exibe pacote prático da consulta; rótulos de CTA variam | Preservar função de roteador; testar bloco curto de consulta e CTA canônico | FO+HIP / P1 |
| `/avaliacao-facial/` | Excelente para intenção incerta; prioriza diagnóstico e naturalidade | Galeria e credencial exigem revisão; múltiplas ações | Revisar conjunto de imagens e unificar credencial/CTA somente após aprovação | FO+INF / P0; P1 |
| `/mama/` | Roteia por queixa e diferencia opções mamárias | Caso/imagens mamárias, múltiplas vistas e ausência de aviso 18+ no HTML | Revisão Codame/jurídica, autorização e controle etário antes de qualquer ampliação | FO+INF / P0 |
| `/mastopexia/` | Explica flacidez e decisão com/sem implante | Imagens mamárias/caso reutilizado; consulta prática incompleta | Revisar galeria; depois inserir informação validada de consulta | FO+HIP / P0; P1 |
| `/mastopexia-com-protese/` | Boa diferenciação entre elevar e preencher | Mesmo risco de galeria; consulta prática incompleta | Revisar imagens e expectativa; completar consulta sem divulgar preço cirúrgico | FO+INF / P0; P1 |
| `/mamoplastia-redutora/` | Foco funcional/estético equilibrado | Galeria mamária reutilizada; consulta prática incompleta | Revisar ativo/18+ e explicitar próximo passo após autorização | FO+INF / P0; P1 |
| `/protese-de-mama/` | Trata volume, proporção e escolha individual | Galeria mamária reutilizada; consulta prática incompleta | Revisar galeria e manter linguagem sem promessa de tamanho/resultado | FO+INF / P0; P1 |
| `/injetaveis/` | Diferencia classes de tratamento e reconhece limites | Galeria e credencial; risco de simplificação excessiva do “não cirúrgico” | Revisar imagens/credencial; preservar contraindicações e limites | FO+INF / P0; P1 |
| `/blefaroplastia/` | Boa correspondência com queixa e recuperação | Galeria e credencial imprecisa | Revisar conjunto e normalizar credencial verificada | FO+INF / P0; P1 |
| `/lifting-facial/` | Página forte de alta intenção, com indicação, limites e recuperação | Faixas públicas no visível/schema; galeria; credencial | Conter expansão; decisão formal sobre preços e imagens; nenhuma edição automática | FO+INF / P0 |
| `/lifting-cervical/` | Diferencia pescoço, mandíbula e causas | Galeria com 4 vistas/imagens; credencial | Revisar número real de casos, contexto e autorização; normalizar credencial | FO+INF / P0; P1 |
| `/lipo-de-papada/` | Boa diferenciação entre gordura e flacidez | Galeria; auditoria anterior sinalizou 35 sessões/0 key event, sem causalidade | Revisar imagens e diagnosticar jornada antes de mudar texto | FO+HIP / P0; P1 T7 |
| `/lip-lifting/` | Intenção específica e linguagem objetiva | Consulta prática incompleta; profundidade limitada sobre seleção/risco | Adicionar somente informação clínica validada e consulta prática após revisão | FO+HIP / P1 |
| `/otoplastia/` | Roteamento adulto/infantil e decisão cuidadosa | Galeria e credencial; prova visual exige revisão | Revisar conjunto e manter separação por público | FO+INF / P0; P1 |
| `/otoplastia-adulto/` | Responde constrangimento, recuperação e naturalidade | Galeria; densidade alta em mobile é N/D | Revisar galeria; testar escaneabilidade sem cortar conteúdo essencial | FO+HIP / P0; P2 |
| `/otoplastia-infantil/` | Valoriza maturidade e participação da criança | Galeria com 2 imagens e dois casos rotulados no HTML; documentação/autorização fora do repositório é N/D; compreensão do responsável/criança não foi medida | Revisar a galeria com Codame/jurídico e conferir autorizações antes de qualquer ampliação; preservar autonomia e, depois, testar navegação/compreensão | FO+INF / P0; P2 |
| `/contorno-corporal/` | Roteia por excesso de pele/gordura e limites | Caso corporal/mamário reutilizado; sem aviso 18+ no HTML | Revisar acesso, autorização, contexto e reutilização | FO+INF / P0 |
| `/lipoaspiracao/` | Distingue gordura localizada de emagrecimento | Consulta prática incompleta | Adicionar bloco curto de consulta; manter “não é método de emagrecimento” | FO+HIP / P1 |
| `/abdominoplastia/` | Explica pele, musculatura e cicatriz | Imagem corporal/mamária; consulta prática incompleta; sem 18+ no HTML | Revisar imagem/acesso; depois completar consulta | FO+INF / P0; P1 |
| `/pos-bariatrica/` | Reconhece múltiplas áreas e planejamento por etapas | Consulta prática incompleta; jornada complexa pode exigir triagem clara | Explicar primeiro passo e planejamento sem prometer número de cirurgias | FO+HIP / P1 |
| `/braquioplastia/` | Queixa e cicatriz apresentadas com franqueza | Consulta prática incompleta; redação de credencial precisa validação | Completar consulta e normalizar credencial documental | FO+HIP / P1 |
| `/ninfoplastia/` | Linguagem discreta e centrada em sintomas/decisão | Consulta prática incompleta; sensibilidade exige revisão de privacidade e expectativas | Manter discrição; explicitar consulta e limites sem explorar vulnerabilidade | FO+INF / P1 |
| `/conteudos/` | Hub por dúvida/tema, útil para intenção informacional | Próximo passo e hierarquia de temas podem competir | Medir entrada → artigo → contato antes de alterar; CTA editorial discreto | FO+HIP / P2 |
| `/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` | Responde composição de custos sem prometer valor único | Conteúdo longo; escaneabilidade mobile N/D | Manter ausência de faixa cirúrgica; testar sumário e perguntas prioritárias | FO+HIP / P2 |
| `/conteudos/quanto-custa-lifting-facial-sao-paulo/` | Alta aderência à pergunta de preço | Faixas públicas de procedimento no conteúdo e schema | Conter expansão e submeter a decisão formal Codame/jurídica | FO+INF / P0 |
| `/conteudos/quanto-custa-cirurgia-plastica-mama-sao-paulo/` | Explica componentes e necessidade de avaliação | Pode frustrar busca de preço sem explicar por que não há faixa | Reforçar lógica de individualização e consulta, sem criar faixa | FO+HIP / P1 |
| `/conteudos/quanto-custa-cirurgia-plastica-corporal-sao-paulo/` | Explica variáveis de custo e planejamento | Mesmo risco de expectativa de preço direto | Responder com composição, limites e próximo passo mensurável | FO+HIP / P1 |
| `/conteudos/lifting-facial-ou-injetaveis/` | Boa comparação baseada em causa e grau de flacidez | Atualização e fontes precisam manutenção periódica | Preservar matriz decisória; revisar fontes/data em rotina | FO / P2 |
| `/conteudos/blefaroplastia-quando-faz-sentido/` | Alinha indicação e limites | Conversão final e compreensão não medidas | Manter tom educativo; testar CTA editorial sem pressão | FO+HIP / P2 |
| `/conteudos/mastopexia-com-ou-sem-protese/` | Responde decisão frequente com nuances | Pode induzir autodiagnóstico se resumo for isolado | Reforçar que decisão depende de exame e objetivo | INF / P2 |
| `/conteudos/lipoaspiracao-ou-abdominoplastia/` | Compara gordura, pele e musculatura | Risco de leitura simplificada | Manter critérios e exceções; revisar fontes/data | FO+INF / P2 |
| `/conteudos/recuperacao-lifting-facial/` | Expectativa de recuperação detalhada e útil | Prazos individuais podem ser lidos como promessa | Reforçar variabilidade e sinais para contato médico; preservar fontes | INF / P2 |
| `/conteudos/cicatrizes-cirurgia-de-mama/` | Aborda objeção central com franqueza | Conteúdo precisa atualização contínua | Preservar limites e revisar referências/data | FO / P2 |
| `/conteudos/cirurgia-plastica-apos-emagrecimento/` | Boa preparação para jornada complexa | Sequenciamento pode ser interpretado como plano individual | Manter caráter educativo e dependência de avaliação | INF / P2 |
| `/conteudos/como-escolher-protese-de-mama/` | Reduz foco simplista em volume | Risco de autoseleção por formato/tamanho | Preservar decisão compartilhada e fontes | INF / P2 |
| `/conteudos/botox-preenchimento-bioestimulador/` | Diferencia objetivos e limites | Termos populares/marcas exigem atualização cuidadosa | Manter linguagem por mecanismo/objetivo, sem superioridade | FO+INF / P2 |
| `/conteudos/consulta-cirurgia-plastica/` | Explica claramente o que acontece na consulta | Sem seção de fontes/revisão identificada no inventário | Acrescentar revisão/autoria e manter como principal apoio de conversão | FO / P1 |
| `/conteudos/seguranca-cirurgia-plastica/` | Tema crítico e boa orientação geral | Sem seção de fontes identificada; afirmações exigem suporte primário | Adicionar fontes oficiais e data/revisão médica | FO+INF / P1 |
| `/conteudos/naturalidade-envelhecimento/` | Alinha filosofia da marca | Curto e sem fontes identificadas; conceito pode ficar abstrato | Adicionar exemplos clínicos não promocionais, limites e fontes | FO+HIP / P1 |
| `/conteudos/lipoenxertia-facial/` | Explica alternativa específica | Curto e sem fontes identificadas; riscos/indicação podem ficar incompletos | Completar seleção, limitações, riscos e fontes validadas | FO+INF / P1 |
| `/conteudos/papada-contorno-cervical/` | Diferencia causas e direciona avaliação | Curto, sem fontes identificadas; se sobrepõe a páginas comerciais | Consolidar resposta e interligar por causa, sem duplicar promessa | FO+HIP / P1 |
| `/conteudos/cuidados-cicatrizacao-cirurgia/` | Responde dúvida prática frequente | Curto, sem fontes identificadas; risco de conselho genérico | Adicionar fontes, alertas e orientação para seguir equipe assistente | FO+INF / P1 |
| `/privacidade/` | Transparência e direitos; não é página de aquisição | Clareza para leigo e aderência ao comportamento real são N/D nesta frente | Revisão conjunta com privacidade; resumo claro sem simplificar obrigações | N/D+HIP / P2 T7 |

## 5. Cruzamento com publicidade médica

| Tema | Fato no site | Referência oficial | Avaliação | Confiança / ação |
|---|---|---|---|---|
| Identificação da médica | CRM/RQE aparecem; redação de formação varia | Res. 2.336/2023, arts. 4º e 6º; [capítulo 2 comentado](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-2) | Identificação básica presente; precisão da formação precisa validação documental | Alta / P1 |
| Identificação da clínica/RT | Não foi identificado no conteúdo auditado um bloco completo de registro da pessoa jurídica e diretor técnico | Res. 2.336/2023, art. 5º | Aplicação ao domínio pessoal que também promove clínica é interpretação do caso, não violação concluída | Média / validar Codame/jurídico, P1 |
| Valor da consulta | R$ 500 e formas de pagamento aparecem em 12 páginas comerciais | Art. 9º, VI; [capítulo 4 comentado](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-4) | Divulgação de valor de consulta é prevista; consistência e condições devem ser mantidas | Alta / manter, corrigir inconsistências apenas com autorização |
| Valor de procedimentos | Faixas de lifting aparecem em duas URLs e em schema/FAQ | Art. 9º, VII + Exposição de Motivos da resolução | Conflito interpretativo relevante para procedimento individualizado; não há proibição literal atribuída ao inciso VII | Média / P0 revisão formal |
| Garantia/superioridade | Não foi encontrada garantia explícita; técnica é geralmente condicionada à indicação | Art. 11; [capítulo 6 comentado](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-6) | Estrutura cautelosa e proporcional | Alta / preservar |
| Antes/depois | 17 páginas com galerias/resultados; pacientes distintos e autorizações são N/D | Art. 14; [capítulo 9 comentado](https://publicidademedica.cfm.org.br/manual/resolucao-comentada/capitulo-9) | Suficiência de contexto, conjunto e anonimização depende de revisão por caso | Média-alta / P0 inventário e validação |
| Áreas mamárias/íntimas | Imagens corporais/mamárias no HTML; nenhum aviso 18+ identificado | Art. 14 e orientação comentada oficial | Necessidade e forma do controle devem ser validadas; risco prioritário | Média-alta / P0 |
| Depoimentos/prova | Há prova social pública atribuída | Art. 14 e regras gerais de sensacionalismo/resultado | Não foi auditada a autorização nem a representatividade; não reproduzir depoimentos no relatório | N/D / P1 revisão documental |

## 6. Backlog de comunicação autorizável

Todas as mudanças abaixo são propostas. **Nenhuma foi executada.** Alterações de title, description, heading, alt, anchor, aria-label semântico, FAQ, schema textual, mensagem de WhatsApp, imagem, vídeo ou layout comunicacional permanecem fora da primeira fase técnica.

### COM-01 — Decisão formal sobre faixas públicas de lifting

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P0 / T5+T6 / Fase 1 / Pacote A — contenção crítica |
| Local | `/lifting-facial/`; `/conteudos/quanto-custa-lifting-facial-sao-paulo/`; conteúdo visível e FAQ/schema |
| Elemento atual / hipótese | Faixas cirúrgicas em cards e FAQ. Hipótese: uma formulação validada pode preservar transparência sem criar interpretação de preço fechado; eficácia e admissibilidade são N/D. |
| Problema e evidência | Faixas públicas de procedimento no HTML; enquadramento depende da Exposição de Motivos e análise do caso |
| Mudança exata proposta | Suspender expansão/reuso; inventariar ocorrências; obter manifestação Codame/CRM e jurídico; então aprovar manter, qualificar ou retirar, com decisão canônica documentada |
| Impactos | Texto visível: possível; texto não visível: sim; schema: sim; atribuição: não; planilha: não; ação externa: sim |
| Impacto / confiança / esforço / risco | Alto / alta no fato, média no enquadramento / médio / alto regulatório e de expectativa |
| Dependências | Decisão formal, validação da estratégia de preço e baseline da página |
| Teste / métrica | Rastreamento de contatos válidos, qualificados e agendados; compreensão de preço em amostra de atendimento; 28 dias antes/depois, sem outra mudança na página |
| Guardrail | Não ocultar custo da consulta; não criar preço alternativo não sustentado; não reduzir informação clínica |
| Rollback / manter / reverter | Repor versão aprovada anterior; manter se validação formal e qualidade de leads não piorarem; reverter se houver objeção regulatória, confusão ou queda relevante de qualidade |
| Documentação | Norte Estratégico, guia de linguagem, log jurídico/regulatório e inventário de schema |
| Inteligência | Desenho: Sol extra-alto; Ultra: sim; revisão: Sol extra-alto + Codame/jurídico. Risco de inteligência inferior: atribuição normativa incorreta ou divergência entre texto e schema. Alternativa econômica: Terra alto apenas para inventário mecânico. |

### COM-02 — Conformidade e rastreabilidade das galerias

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P0 / T5+T6 / Fase 1 / Pacote A |
| Local | 17 páginas listadas em §3.3 e ativos reutilizados |
| Elemento atual / hipótese | Galerias e montagens de resultado. Hipótese: um conjunto documentado e contextualizado reduz risco e melhora expectativa; autorizações e efeito real são N/D. |
| Problema e evidência | Imagens/montagens não demonstram número de pacientes; mesmo caso reutilizado; autorizações N/D |
| Mudança exata proposta | Criar inventário interno por ativo/caso/vista/página, indicação, fatores de resultado, resultados insatisfatórios/complicações, autorização, canais, validade e revogação; decisão caso a caso antes de ampliar |
| Impactos | Texto visível: possível; texto não visível: possível; schema: possível; atribuição: não; planilha: não; ação externa: sim |
| Impacto / confiança / esforço / risco | Alto / alta no inventário, média no enquadramento / alto / alto privacidade-regulatório |
| Dependências | Arquivo de autorizações, Codame/jurídico, proprietário de cada ativo |
| Teste / métrica | Checklist 100% dos ativos; zero ativo sem caso, autorização e canal documentados; revisão visual em desktop/mobile |
| Guardrail | Não copiar PII para relatório; não presumir que vistas são pacientes; não expandir galeria durante revisão |
| Rollback / manter / reverter | Restaurar apenas ativos formalmente aprovados; manter se todos os requisitos estiverem documentados; retirar/limitar se autorização ou contexto forem insuficientes |
| Documentação | Ledger de mídia seguro, política de imagens, registro de revogação e manual editorial |
| Inteligência | Desenho: Sol extra-alto; Ultra: sim; revisão: Sol extra-alto + Codame/jurídico + privacidade. Terra alto pode executar somente o inventário aprovado. |

### COM-03 — Acesso etário e minimização de reidentificação

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P0 / T5+T6 / Fase 1 / Pacote A |
| Local | Home, `/mama/`, páginas mamárias, `/contorno-corporal/`, `/abdominoplastia/` e qualquer área íntima |
| Elemento atual / hipótese | Imagens corporais/mamárias carregadas na página. Hipótese: controle proporcional reduz exposição indevida sem inviabilizar o conteúdo educativo; forma adequada é N/D. |
| Problema e evidência | Imagens explícitas no HTML sem aviso/controle 18+ identificado; marcas potencialmente reidentificáveis |
| Mudança exata proposta | Validar com Codame/jurídico mecanismo de aviso/restrição; revisar recorte, anonimização, exposição e necessidade clínica; aplicar somente após autorização específica |
| Impactos | Texto visível: sim; texto não visível: possível; schema: não em princípio; atribuição: não; planilha: não; ação externa: sim |
| Impacto / confiança / esforço / risco | Alto / média-alta / médio / alto |
| Dependências | COM-02, decisão jurídica e teste de acessibilidade/usabilidade |
| Teste / métrica | Acesso sem consentimento etário, teclado/leitor de tela, mobile; zero exposição antes do controle definido; taxa de abandono como guardrail secundário |
| Guardrail | Não usar mecanismo enganoso; não coletar data de nascimento desnecessária; não prejudicar acessibilidade |
| Rollback / manter / reverter | Voltar ao estado aprovado ou remover temporariamente o ativo; manter se válido e funcional; reverter se controle falhar ou criar coleta indevida |
| Documentação | Política de conteúdo sensível, parecer e teste de acessibilidade |
| Inteligência | Desenho: Sol extra-alto; Ultra: sim; revisão: Sol extra-alto + jurídico/privacidade/acessibilidade. Terra alto apenas para aplicação de solução aprovada. |

### COM-04 — Credencial canônica e verificável

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T5 / Fase 7 / Pacote E |
| Local | Home e páginas com “formada”, “formação” ou “graduada e formada” pela UNICAMP |
| Elemento atual / hipótese | Blocos de credenciais com formulações distintas. Hipótese: redação factual única melhora compreensão e consistência da entidade; ganho de conversão é N/D. |
| Problema e evidência | Formulações diferentes podem confundir graduação e residência; fato documental completo N/D |
| Mudança exata proposta | Verificar diploma, residência, título, CRM e RQE; aprovar uma redação canônica precisa e aplicar a todas as superfícies, inclusive schema textual |
| Impactos | Texto visível: sim; texto não visível: sim; schema: sim; atribuição/planilha: não; ação externa: possível validação documental |
| Impacto / confiança / esforço / risco | Alto em confiança/entidade / alta / médio / médio-alto se credencial for ampliada sem prova |
| Dependências | Documentos oficiais e aprovação médica/jurídica |
| Teste / métrica | Varredura com zero variante não aprovada; pesquisa de compreensão; conversão qualificada como secundária |
| Guardrail | Não inferir instituição de graduação; não transformar residência em graduação |
| Rollback / manter / reverter | Retornar à última redação documentalmente comprovada; manter enquanto registro válido |
| Documentação | Guia de linguagem, ficha canônica da entidade e schema |
| Inteligência | Desenho: Sol alto; Ultra: não, salvo divergência documental; aplicação: Terra alto; revisão: Sol alto + responsável médico. |

### COM-05 — Pacote prático da consulta em páginas comerciais

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T5 / Fase 7 / Pacote F |
| Local | 11 páginas comerciais listadas em §3.5 |
| Elemento atual / hipótese | CTAs sem bloco prático completo de consulta. Hipótese: antecipar fatos operacionais reduz contatos desalinhados e melhora agendamento, a confirmar. |
| Problema e evidência | Valor/formas de pagamento e expectativa da consulta não aparecem de modo consistente |
| Mudança exata proposta | Após validar dados, inserir bloco curto com o que acontece, duração apenas se comprovada, local, valor de R$ 500, formas de pagamento, nota fiscal e ausência de pressão; sem preço de procedimento |
| Impactos | Texto visível: sim; texto não visível/schema: possível; atribuição: não; planilha: não; ação externa: não |
| Impacto / confiança / esforço / risco | Médio-alto / média / médio / baixo-médio |
| Dependências | Dados operacionais atualizados; COM-01 para separar consulta/procedimento |
| Teste / métrica | Experimento isolado por cluster; contatos válidos, qualificados, agendados e objeções de preço; 28 dias ou ≥30 contatos válidos |
| Guardrail | Não prometer disponibilidade; não inventar duração; preservar indicação individual |
| Rollback / manter / reverter | Remover bloco; manter se melhora qualidade/agendamento sem queda de validade; reverter com piora persistente |
| Documentação | Norte, guia de linguagem e manual de atendimento |
| Inteligência | Proposta: Sol alto; Ultra: não; aplicação aprovada: Terra alto; revisão: Sol alto. Terra médio pode conferir consistência, não decidir redação médica. |

### COM-06 — Taxonomia de CTA e continuidade semântica

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T5+T3 / Fase 7 após Fase 4 / Pacote F |
| Local | 213 links de WhatsApp em 43 páginas; 21 rótulos visíveis |
| Elemento atual / hipótese | Vinte e um rótulos visíveis e mensagens contextualizadas. Hipótese: taxonomia menor melhora previsibilidade e comparabilidade sem reduzir contatos válidos. |
| Problema e evidência | Promessas de ação fragmentadas e comparabilidade limitada |
| Mudança exata proposta | Definir um CTA primário de agenda/disponibilidade e um secundário de dúvida por intenção; preservar código, página, procedimento e mensagem até contrato técnico aprovado |
| Impactos | Texto visível: sim; texto não visível: sim; schema: não; atribuição: sim; planilha: não; ação externa: possível WhatsApp/bot |
| Impacto / confiança / esforço / risco | Alto / média / alto / alto se quebrar atribuição |
| Dependências | Fase 4 de atribuição, contrato M26/G26, baseline por CTA |
| Teste / métrica | CTA → conversa → contato válido → qualificado → agendado; teste por página sem mudanças simultâneas |
| Guardrail | Não trocar URL/mensagem/código sem teste ponta a ponta; não medir só clique |
| Rollback / manter / reverter | Repor rótulo e mensagem anteriores; manter somente com ganho de negócio e atribuição estável |
| Documentação | Design system de CTA, mapa de eventos, bot e atendimento |
| Inteligência | Arquitetura: Sol extra-alto por cruzar atribuição; Ultra: sim na revisão ponta a ponta; redação: Sol alto; aplicação delimitada: Terra alto. |

### COM-07 — Diagnóstico de `/lipo-de-papada/` antes de reescrita

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T7 / Fase 2 / Pacote B ou G de observabilidade |
| Local | `/lipo-de-papada/` e funil associado |
| Elemento atual / hipótese | Página e CTAs atuais, sem alteração. Hipóteses concorrentes: falha de medição, baixo volume, intenção, origem ou fricção; nenhuma foi demonstrada. |
| Problema e evidência | Auditoria anterior registrou 35 sessões e nenhum key event em 28 dias; causa N/D |
| Mudança exata proposta | Não alterar texto inicialmente; validar evento, CTA, dispositivo, origem, conversa válida e qualificação; só então formular hipótese editorial |
| Impactos | Texto/schema/atribuição/planilha: não nesta etapa; ação externa: leitura de analytics/LEADS/CRM |
| Impacto / confiança / esforço / risco | Alto potencial / média no sinal, baixa na causa / médio / baixo |
| Dependências | Acesso somente leitura e definição de eventos |
| Teste / métrica | Reconciliação sessão → clique → conversa → lead; 28/90 dias; erro de instrumentação como guardrail |
| Guardrail | Não concluir que a copy falhou; ausência de evento não é zero de contatos |
| Rollback / manter / reverter | Não há mudança; se houver teste posterior, manter apenas com resultado final melhor |
| Documentação | Plano de mensuração e backlog da página |
| Inteligência | Diagnóstico: Sol alto; Ultra: não inicialmente; conferência repetitiva: Terra médio/alto; revisão: Sol alto. |

### COM-08 — Fontes, revisão médica e datas nos artigos

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T5+T2 / Fase 7 / Pacote E |
| Local | Seis artigos sem seção de fontes identificada; prioridade para segurança, cicatrização, lipoenxertia e papada |
| Elemento atual / hipótese | Conteúdo clínico sem seção de fontes/data visível em parte do acervo. Hipótese: suporte verificável melhora confiança e compreensão, sem garantia de tráfego/citação. |
| Problema e evidência | Afirmações clínicas sem fonte/data claramente verificável em parte do acervo |
| Mudança exata proposta | Revisão médica, fontes primárias pertinentes, data de revisão, limitações e autoria; acrescentar somente o que a fonte sustenta |
| Impactos | Texto visível: sim; texto não visível/schema: sim; atribuição/planilha: não; ação externa: pesquisa bibliográfica oficial |
| Impacto / confiança / esforço / risco | Médio-alto / alta / alto / médio |
| Dependências | Revisão médica e fontes primárias atualizadas |
| Teste / métrica | 100% das afirmações materiais rastreáveis; revisão editorial; engajamento/lead qualificado como secundários |
| Guardrail | Não usar fonte para decorar; não criar recomendação individual; não aumentar texto sem valor |
| Rollback / manter / reverter | Retirar afirmação/fonte inadequada; manter enquanto atual e aplicável |
| Documentação | Política editorial, ficha de revisão e schema de autoria |
| Inteligência | Pesquisa e redação médica: Sol alto; Ultra: não; aplicação aprovada: Terra alto; revisão: Sol alto + responsável médico. |

### COM-09 — Qualificar mensagem sobre Imposto de Renda

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T5 / Fase 7 / Pacote F |
| Local | Home e qualquer repetição futura |
| Elemento atual / hipótese | Frase sobre uso da nota fiscal no IR. Hipótese: condicionar a afirmação reduz interpretação de promessa fiscal sem prejudicar confiança. |
| Problema e evidência | Frase atual pode ser lida como promessa geral; regras dependem de prova, natureza da despesa e situação do contribuinte |
| Mudança exata proposta | Redação condicionada à legislação e ao caso individual, com referência oficial; orientar confirmação com profissional tributário quando necessário |
| Impactos | Texto visível: sim; texto não visível/schema: possível; atribuição/planilha: não; ação externa: não |
| Impacto / confiança / esforço / risco | Médio / alta / baixo / médio reputacional |
| Dependências | Validação jurídica/tributária da redação |
| Teste / métrica | Revisão de compreensão e contagem de dúvidas/contestações; não otimizar por clique |
| Guardrail | Não prometer dedução, restituição ou percentual |
| Rollback / manter / reverter | Repor frase anterior apenas se juridicamente aprovada; manter formulação enquanto Receita sustentar condições |
| Documentação | Guia de linguagem e fonte oficial |
| Inteligência | Proposta: Sol alto; Ultra: não; aplicação: Terra alto; revisão: Sol alto + validação tributária/jurídica. |

### COM-10 — Escaneabilidade de páginas densas

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P2 / T5 / Fase 7 / Pacote F |
| Local | Guias de preço, lifting facial e otoplastia infantil/adulto |
| Elemento atual / hipótese | Páginas extensas e estrutura sequencial. Hipótese: progressão por intenção melhora compreensão mobile; problema de uso ainda é N/D. |
| Problema e evidência | Conteúdo extenso; experiência real mobile N/D |
| Mudança exata proposta | Testar sumário, respostas curtas no início, acordeões acessíveis apenas para conteúdo secundário e progressão por intenção; não cortar riscos/limites |
| Impactos | Texto visível: possível; layout: sim; schema/atribuição/planilha: não; ação externa: não |
| Impacto / confiança / esforço / risco | Médio / baixa-média / médio / médio |
| Dependências | Dados mobile, acessibilidade e baseline |
| Teste / métrica | Compreensão, avanço ao CTA, contato válido e Core Web Vitals como guardrail técnico; ≥28 dias |
| Guardrail | Conteúdo essencial disponível sem interação; não ocultar contraindicações |
| Rollback / manter / reverter | Restaurar estrutura; manter se compreensão e resultado final melhorarem sem dano de acessibilidade |
| Documentação | Padrão editorial e componentes aprovados |
| Inteligência | Desenho: Sol alto; Ultra: não; implementação aprovada: Terra alto; revisão: Sol alto + acessibilidade. |

### COM-11 — Mensuração da continuidade anúncio → página → WhatsApp

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T7+T3 / Fases 2 e 4 / Pacotes C e G |
| Local | Landing pages, CTAs, WhatsApp, bot, LEADS e CRM |
| Elemento atual / hipótese | Mensagens contextuais e códigos desenhados para continuidade. Hipótese: perdas podem ocorrer entre CTA, conversa e sistemas; ponto e magnitude são N/D. |
| Problema e evidência | Continuidade está desenhada; entrega operacional e resultado final N/D |
| Mudança exata proposta | Medir por página/intenção/código: visita, CTA, conversa, contato válido, qualificação, agendamento, realização e procedimento; reconciliar perdas sem PII no relatório |
| Impactos | Texto/schema: não; atribuição: sim; planilha: sim apenas em pacote próprio; ação externa: sim, somente leitura inicialmente |
| Impacto / confiança / esforço / risco | Alto / alta sobre necessidade / alto / alto de privacidade se mal desenhado |
| Dependências | Contrato de dados, consentimento e reconciliação LEADS/CRM |
| Teste / métrica | Taxa de origem/caminho conhecidos, perdas por etapa e divergência; 28 e 90 dias |
| Guardrail | IDs opacos; sem mensagens/telefones; não classificar ausência de referrer como direto |
| Rollback / manter / reverter | Desativar apenas instrumentação nova se houver privacidade/qualidade ruim; preservar baseline |
| Documentação | Contrato de dados, catálogo de eventos e plano de mensuração |
| Inteligência | Arquitetura: Sol máximo/extra-alto; Ultra: sim; testes mecânicos: Terra alto; revisão: Sol extra-alto ponta a ponta. |

### COM-12 — Identidade da clínica e diretor técnico

| Campo | Especificação |
|---|---|
| Prioridade / trilha / fase / pacote | P1 / T6+T5 / Fase 7 / Pacote E |
| Local | Home, rodapé, páginas de clínica/local e schema de organização |
| Elemento atual / hipótese | Identidade médica presente, sem bloco PJ/RT completo identificado. Hipótese: informação canônica comprovada reduz ambiguidade; aplicabilidade legal é N/D. |
| Problema e evidência | Bloco completo de registro PJ/diretor técnico não foi identificado; aplicabilidade ao domínio é inferência |
| Mudança exata proposta | Inventariar razão/registro aplicável, diretor técnico e relação médica–clínica; validar com Codame/jurídico; publicar somente campos obrigatórios e comprovados |
| Impactos | Texto visível: possível; texto não visível/schema: sim; atribuição/planilha: não; ação externa: sim |
| Impacto / confiança / esforço / risco | Médio-alto / média / médio / alto se informação incorreta |
| Dependências | Documentos da clínica e enquadramento formal do site |
| Teste / métrica | Consistência 100% entre rodapé, página, schema e fontes oficiais; revisão jurídica |
| Guardrail | Não inventar CRM-PJ, vínculo ou responsabilidade técnica |
| Rollback / manter / reverter | Remover campo não comprovado; manter enquanto registro/vínculo estiver vigente |
| Documentação | Ficha canônica da entidade e política editorial |
| Inteligência | Enquadramento: Sol alto; Ultra: sim se houver conflito entidade/domínio; aplicação: Terra alto; revisão: Sol alto + Codame/jurídico. |

## 7. Plano de testes e mensuração da comunicação

### Baseline obrigatório

Antes de qualquer mudança textual ou visual, registrar por URL, CTA e origem, em janelas de 28 e 90 dias:

- sessões/entradas apenas como contexto;
- cliques de CTA e conversas iniciadas;
- contatos válidos;
- leads qualificados;
- consultas agendadas e realizadas;
- procedimentos fechados;
- origem, campanha e caminho conhecidos;
- desistências, objeções, cancelamentos e no-show quando disponíveis;
- divergência entre WhatsApp, LEADS e CRM;
- reclamações, incidentes de privacidade e questionamentos regulatórios.

### Regra de teste

| Elemento | Regra |
|---|---|
| Métrica principal | Avanço para contato válido, qualificação, consulta realizada e procedimento — não clique isolado |
| Janela | 28 dias antes e 28 dias depois; usar 90 dias para itens de menor volume/sazonalidade |
| Amostra | Preferência por pelo menos 30 contatos válidos por condição; se não houver, ampliar janela e declarar incerteza |
| Isolamento | Uma mudança de significado por página/cluster de cada vez; não misturar preço, CTA, galeria e layout na mesma janela |
| Segmentação | Página de entrada, página do CTA, intenção, dispositivo e origem; preservar first touch e caminho |
| Guardrails | Origem desconhecida, quebra de atribuição, validade, qualificação, cancelamento/no-show, acessibilidade, privacidade e conformidade |
| Sucesso | Melhora sustentada no resultado de negócio sem piora material de guardrails; significância prática antes de estatística formal em baixo volume |
| Falha | Piora sustentada, atribuição inconsistente, aumento de contatos inválidos/confusão ou risco regulatório/privacidade |
| Rollback | Restaurar versão textual/visual anterior, mantendo eventos e baseline; documentar data e motivo |

### Testes prioritários

1. **P0 regulatório:** checklist jurídico/Codame de preços e imagens; sucesso é decisão formal e 100% dos ativos/ranges classificados, não aumento de conversão.
2. **Consulta prática:** adicionar o bloco validado em pequeno cluster de páginas sem preço da consulta; medir contato válido → agendado.
3. **CTA:** depois de provar atribuição, testar uma taxonomia canônica contra rótulos atuais, preservando destino e código.
4. **Conteúdo:** atualizar um artigo por vez com fonte/data/limitações e medir tráfego qualificado e continuidade, sem esperar ganho imediato de ranking.
5. **Página lipo de papada:** primeiro reconciliar instrumentação e leads; somente testar copy se a perda ocorrer de fato entre leitura e CTA/conversa.

## 8. O que não deve ser alterado nesta etapa

- Nenhum texto, CTA, title, description, heading, alt, anchor, aria-label semântico, FAQ, schema textual, mensagem do WhatsApp, imagem, vídeo ou layout.
- Nenhuma faixa de preço deve ser removida, ampliada ou replicada sem decisão formal Codame/jurídica e autorização do responsável.
- Nenhuma galeria deve ser ampliada ou reutilizada antes da conferência de caso, autorização, contexto, anonimização e acesso etário.
- Não trocar códigos, parâmetros ou mensagens dos CTAs durante uma iniciativa puramente editorial.
- Não converter “médica formada pela UNICAMP” em outra credencial sem prova documental.
- Não reduzir conteúdo de riscos, limitações, contraindicações ou recuperação para encurtar páginas.
- Não tratar clique em WhatsApp como contato válido, consulta ou procedimento.
- Não usar o sinal de `/lipo-de-papada/` como prova de falha de copy.
- Não reproduzir depoimentos, imagens ou quaisquer dados identificáveis em documentação de auditoria.

## 9. Ordem recomendada

| Ordem | Fase/pacote | Ações | Modelo recomendado | Revisão |
|---:|---|---|---|---|
| 1 | Fase 1 / A | COM-01, COM-02 e COM-03: contenção, inventário e decisão formal | Sol extra-alto para desenho; Terra alto para inventário mecânico | Sol extra-alto + Codame/jurídico |
| 2 | Fase 2 / B-G | COM-07 e baseline de COM-11 | Sol alto para arquitetura; Terra médio/alto para validação | Sol alto |
| 3 | Fase 4 / C | Provar continuidade e atribuição antes de alterar CTA | Sol máximo/extra-alto | Sol extra-alto ponta a ponta |
| 4 | Fase 7 / E | COM-04, COM-08 e COM-12 | Sol alto; Terra alto para aplicação aprovada | Sol alto; jurídico quando aplicável |
| 5 | Fase 7 / F | COM-05, COM-06, COM-09 e COM-10, em janelas separadas | Sol alto para proposta; Terra alto para aplicação | Sol alto |

Ultra é modo de coordenação, não esforço. É recomendável na revisão de COM-01 a COM-03 e COM-11, pois cruzam conteúdo, jurídico, privacidade, atribuição e operação. Para ajustes editoriais delimitados já aprovados, Terra alto é suficiente, com revisão Sol alto. Nenhuma dessas inteligências foi usada para implementar mudanças nesta auditoria.

## 10. Conclusão

**Conclusão principal, confiança alta:** a comunicação já apresenta boa coerência com o Norte Estratégico e não deve ser reescrita em massa. O primeiro pacote recomendado é de contenção e revisão documental de preços e imagens, seguido de observabilidade do funil. Só depois devem entrar credenciais, informações práticas, fontes e CTAs, sempre em janelas separadas.

**Limitação decisiva:** sem dados reconciliados de conversa, LEADS e CRM, a capacidade atual da comunicação de produzir contatos válidos, qualificação, consulta e procedimento permanece **N/D**. Não há base para declarar causalidade, sucesso ou fracasso das páginas.

**Confirmação de escopo:** este arquivo documenta diagnóstico, hipóteses, recomendações, testes e rollback. Nenhuma recomendação foi implementada; nenhum arquivo de produto, plataforma externa, planilha, CRM, bot, campanha ou publicação foi alterado.
