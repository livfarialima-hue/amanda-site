# Plano de simplificação e conversão do site

> **Governança:** este arquivo registra a implementação do site. O norte estratégico vigente para aquisição e conversão do Google Ads fica em `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`.

Status: implementado, validado e preparado para publicação em 2 de agosto de 2026, após autorização expressa do responsável pelo site.

Extensão de 9 de agosto de 2026: o guia geral de custos foi preservado como hub e passou a direcionar por procedimento. Uma página própria de preço de lifting facial foi criada para responder às buscas específicas, sem duplicar o conteúdo genérico.

## 1. Objetivo

Simplificar a experiência sem apagar páginas que podem captar buscas no Google, Bing e ferramentas de IA.

A paciente não deve ser convidada a conhecer o site inteiro. Cada página deve responder à intenção que a trouxe e oferecer um próximo passo único.

Princípio central:

> Manter várias portas de entrada para busca, mas apenas um caminho de conversão dentro de cada página.

## 2. Escopo desta implementação

Páginas que serão revisadas:

1. `/` — página inicial.
2. `/avaliacao-facial/` — página comercial para quem ainda não sabe qual procedimento procura.
3. `/lifting-facial/` — página comercial para quem já considera lifting facial.
4. `/conteudos/consulta-cirurgia-plastica/` — conteúdo de apoio para a dúvida “como funciona a consulta?”.
5. `/conteudos/quanto-custa-cirurgia-plastica-facial-sao-paulo/` — conteúdo de apoio para a objeção de preço.
6. Cabeçalho, rodapé, botões e mensagens de WhatsApp dessas páginas.

Fora do escopo desta primeira etapa:

- Reescrever todas as páginas de mama, corpo ou outros procedimentos.
- Trocar domínios ou criar redirecionamentos.
- Apagar URLs existentes.
- Mudar faixas de preço cirúrgico.
- Alterar depoimentos, fotos de resultados ou informações médicas sem nova validação.

## 3. Papel definitivo de cada página

| Página | Intenção da paciente | Trabalho da página | Próximo passo |
|---|---|---|---|
| Inicial | Conhecer a médica ou explorar áreas | Confiança e direcionamento | Escolher face, mamas ou corpo; ou consultar horários |
| Avaliação facial | Tem uma queixa, mas não sabe a técnica | Explicar a avaliação e reduzir insegurança | Ver horários da consulta |
| Lifting facial | Já pesquisa lifting | Confirmar indicação, limites, recuperação e confiança | Ver horários para avaliação de lifting |
| Como funciona a consulta | Quer entender o encontro antes de marcar | Remover a objeção sobre a consulta | Ver horários da consulta |
| Guia de custos | Está comparando preço | Explicar faixa de referência versus orçamento final | Ver horários da avaliação |

As páginas “Como funciona a consulta” e “Guia de custos” continuam indexadas e acessíveis, mas deixam de competir com os botões principais das páginas comerciais.

## 4. Regras globais de texto e navegação

### 4.1 Cabeçalho

Usar apenas:

- `Procedimentos`
- `Dra. Amanda`
- `Consulta`
- botão `Ver horários`

No mobile, manter os mesmos três links e um único botão destacado. “Resultados”, “Segurança” e “Clínica” continuam como seções das páginas, mas não precisam ocupar opções no menu principal.

### 4.2 Botões

Texto principal padronizado:

> Ver horários da consulta

Na página de lifting:

> Ver horários para avaliação de lifting

Botão fixo do mobile:

> Ver horários

Evitar alternar entre “Agendar”, “Falar com a equipe”, “Conversar”, “Ver disponibilidade” e “Consultar horários” na mesma página. O clique abre o WhatsApp; não deve sugerir que o agendamento já foi concluído.

### 4.3 Mensagens de WhatsApp

Página inicial:

> Olá, conheci o site da Dra. Amanda e gostaria de consultar os horários da consulta.\n\nReferência: Site principal

Avaliação facial:

> Olá, gostaria de consultar os horários para uma avaliação facial com a Dra. Amanda.\n\nReferência: Avaliação facial

Lifting facial:

> Olá, estou pesquisando lifting facial e gostaria de consultar os horários para uma avaliação com a Dra. Amanda.\n\nReferência: Lifting facial

Como funciona a consulta:

> Olá, li como funciona a consulta com a Dra. Amanda e gostaria de consultar os horários disponíveis.\n\nReferência: Como funciona a consulta

Guia de custos:

> Olá, li o conteúdo sobre custos de cirurgia facial e gostaria de ver horários para uma avaliação com a Dra. Amanda.\n\nReferência: custos de cirurgia facial

A frase `li o conteúdo sobre custos de cirurgia facial` deve ser preservada, pois o atendimento usa essa referência para não enviar o mesmo guia novamente.

### 4.4 Informações práticas padronizadas

Sempre que a consulta for apresentada em detalhe, usar:

> Consulta presencial particular: R$ 500. Pagamento por Pix, débito ou parcelamento. A clínica emite nota fiscal. Eventual reembolso depende do contrato e da análise da operadora.

Não prometer benefício tributário, aprovação de reembolso ou orçamento cirúrgico no mesmo dia.

### 4.5 Ordem das informações

Em páginas comerciais:

1. Queixa ou intenção da paciente.
2. Resposta curta.
3. Prova e confiança.
4. Como funciona a decisão.
5. Informações práticas da consulta.
6. CTA.
7. Informações profundas, FAQs e conteúdos relacionados.

Os conteúdos relacionados nunca devem aparecer antes de a paciente encontrar pelo menos um CTA completo.

## 5. Página inicial

### 5.1 O que muda

- Reduzir os seis caminhos faciais para três áreas principais: face, mamas e corpo.
- Manter um bloco separado para quem não sabe qual procedimento procura.
- Combinar “abordagem” e “segurança” em uma seção mais curta.
- Combinar “Clínica LIV” e “Consulta” em um único bloco prático.
- Reduzir o FAQ de nove para cinco perguntas.
- Manter resultados, credenciais e avaliações públicas, sem repetir as mesmas promessas em várias seções.
- Meta de texto: aproximadamente 1.100 a 1.300 palavras, sem contar rodapé e textos legais.

### 5.2 Metadados

Título:

> Cirurgiã Plástica em São Paulo | Dra. Amanda Schroeder

Descrição:

> Cirurgia plástica facial, de mamas e contorno corporal com a Dra. Amanda Schroeder, CRM-SP 191605 e RQE 110472. Consulta particular em Pinheiros.

### 5.3 Texto final planejado

#### Hero

Selo:

> Cirurgia plástica em Pinheiros

H1:

> Cirurgia plástica para quem quer mudar sem deixar de se reconhecer.

Texto:

> A Dra. Amanda Schroeder avalia face, mamas e corpo com atenção à sua anatomia, à sua rotina e ao que você deseja preservar. A indicação pode ser cirúrgica, não cirúrgica ou simplesmente não fazer nada naquele momento.

Linha de confiança:

> Cirurgiã plástica · CRM-SP 191605 · RQE 110472 · Clínica LIV Faria Lima

Botão:

> Ver horários da consulta

Link secundário:

> Conhecer os procedimentos

#### Escolha por área

H2:

> O que você gostaria de avaliar?

Texto:

> Você pode começar pela região que incomoda. Não é necessário saber o nome da cirurgia antes da consulta.

Card 1:

> **Face e pescoço**  
> Flacidez, pálpebras, contorno do rosto, papada, orelhas e tratamentos não cirúrgicos.  
> Entender a avaliação facial

Card 2:

> **Mamas**  
> Volume, queda, assimetrias, desconforto e mudanças depois da gestação ou perda de peso.  
> Ver cirurgias de mama

Card 3:

> **Corpo**  
> Gordura localizada, excesso de pele, abdômen e alterações depois do emagrecimento.  
> Ver contorno corporal

Faixa para indecisas:

> **Ainda não sabe por onde começar?**  
> Conte o que você percebe. A consulta serve justamente para entender a causa da queixa antes de escolher uma técnica.  
> Ver horários da consulta

#### Resultados

H2:

> Resultados reais, sempre com contexto.

Texto:

> As fotos ajudam a entender possibilidades, cicatrizes e limites. Cada resultado depende da anatomia, da indicação, da técnica e da recuperação de cada paciente.

Manter as fotos autorizadas e as legendas factuais atuais. Exibir no máximo quatro casos na página inicial e manter apenas um aviso legal depois do conjunto.

#### Dra. Amanda

H2:

> Uma indicação bem feita começa por escutar.

Texto 1:

> Dra. Amanda Schroeder é médica formada pela UNICAMP, com formação em Cirurgia Geral e Cirurgia Plástica, CRM-SP 191605 e RQE 110472, além de pós-graduação em Cosmiatria e Procedimentos pelo Einstein.

Texto 2:

> Na consulta, ela procura entender o que mudou, o que incomoda e o que a paciente deseja preservar. A recomendação pode ser uma cirurgia, um tratamento não cirúrgico, uma abordagem em etapas ou nenhuma intervenção naquele momento.

Manter o vídeo de trajetória e o conteúdo sobre acolhimento, mas dentro de um acordeão ou bloco secundário, sem interromper o caminho até a consulta.

#### Indicação e segurança

H2:

> Antes de pensar na cirurgia, é preciso entender se ela faz sentido.

Card 1:

> **Indicação**  
> A técnica vem depois da conversa e do exame. O objetivo é tratar a causa da queixa, não encaixar a paciente em um procedimento.

Card 2:

> **Segurança**  
> Histórico de saúde, exames, anestesia, hospital e tempo cirúrgico são organizados conforme o procedimento e cada paciente.

Card 3:

> **Acompanhamento**  
> Preparo, retornos, cicatrizes, atividades e dúvidas da recuperação fazem parte do plano.

#### Avaliações públicas

H2:

> O que pacientes contam sobre a experiência.

Texto:

> Os relatos destacam principalmente a clareza das explicações, a indicação cuidadosa e o acompanhamento.

Manter três depoimentos públicos já utilizados, com nome e origem, sem reescrever falas.

#### Consulta e Clínica LIV

H2:

> Como funciona a consulta.

Texto:

> A consulta acontece na Clínica LIV Faria Lima, em Pinheiros. A Dra. Amanda ouve a sua queixa, examina as estruturas envolvidas e explica possibilidades, limites, cicatrizes, recuperação e próximos passos. Você não precisa chegar sabendo qual procedimento deseja.

Fatos:

- `Valor: R$ 500`
- `Pagamento: Pix, débito ou parcelamento`
- `Local: R. Pais Leme, 215 · Pinheiros`
- `Nota fiscal emitida`
- `Teleconsulta inicial em casos selecionados`

Observação:

> Eventual reembolso depende do contrato e da análise da operadora.

Botão:

> Ver horários da consulta

#### FAQ

Pergunta:

> Preciso saber qual cirurgia quero?

Resposta:

> Não. A consulta pode começar pelo que você percebe ou pelo que incomoda. O exame ajuda a entender quais estruturas participam da queixa e quais possibilidades fazem sentido.

Pergunta:

> O que está incluído na consulta?

Resposta:

> Conversa sobre a queixa e o histórico de saúde, exame da região, fotografias quando necessárias, discussão de alternativas, cicatrizes, recuperação e próximos passos. Quando existe indicação cirúrgica, a equipe organiza o orçamento individual.

Pergunta:

> Quanto custa e como posso pagar?

Resposta:

> A consulta presencial particular custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. A clínica emite nota fiscal.

Pergunta:

> A consulta é presencial?

Resposta:

> A avaliação presencial é a mais completa para exame e planejamento. Uma teleconsulta inicial pode ser considerada em casos selecionados, especialmente para pacientes de outras cidades.

Pergunta:

> Onde as cirurgias são realizadas?

Resposta:

> O hospital é escolhido conforme o procedimento, as condições clínicas e as necessidades de cada caso. A estrutura definitiva é explicada depois da avaliação.

#### CTA final

H2:

> Quer entender qual caminho faz sentido para você?

Texto:

> A equipe informa os horários, o endereço e como se preparar para a primeira consulta.

Botão:

> Ver horários da consulta

## 6. Avaliação facial

### 6.1 O que muda

- A página passa a ser o destino principal de quem ainda não sabe a técnica.
- O vídeo específico de lifting deixa de aparecer imediatamente depois do hero. Ele vai para o bloco de conteúdos relacionados no final ou é substituído futuramente por um vídeo geral sobre avaliação facial.
- Os seis cards de procedimentos deixam de competir no meio da página. Usar três caminhos amplos: cirurgia, tratamento não cirúrgico e acompanhamento.
- Remover a seção longa sobre equipe, anestesia e hospitais; resumir isso em uma frase na área da consulta. O aprofundamento fica no guia de custos e nas páginas de procedimento.
- Mover todos os conteúdos selecionados para depois do primeiro bloco completo de conversão.
- Meta de texto: aproximadamente 900 a 1.100 palavras.

### 6.2 Metadados

Título:

> Avaliação Facial em São Paulo | Dra. Amanda Schroeder

Descrição:

> Avaliação facial com a Dra. Amanda Schroeder em Pinheiros para entender flacidez, olhar, contorno, pescoço e alternativas cirúrgicas ou não cirúrgicas.

### 6.3 Texto final planejado

#### Hero

Selo:

> Avaliação facial em Pinheiros

H1:

> Você não precisa saber qual procedimento quer antes de marcar a consulta.

Texto:

> A conversa começa pelo que mudou ou incomoda. Depois do exame, a Dra. Amanda explica quais estruturas participam da queixa e se o melhor caminho pode ser cirurgia, tratamento não cirúrgico, cuidado em etapas ou acompanhamento.

Linha prática:

> Consulta particular: R$ 500 · Pix, débito ou parcelamento · Nota fiscal emitida

Botão:

> Ver horários da consulta

#### Para quem faz sentido

H2:

> A queixa pode estar clara mesmo quando o caminho ainda não está.

Card 1:

> **Percebi uma mudança no rosto.**  
> Olhar cansado, perda do contorno, flacidez, papada, assimetria ou outra mudança podem ser o ponto de partida.

Card 2:

> **Estou comparando opções.**  
> A avaliação ajuda a diferenciar o que uma cirurgia pode tratar, o que pode responder a abordagens menores e o que não precisa ser tratado agora.

Card 3:

> **Quero uma segunda opinião.**  
> É possível revisar uma indicação recebida, entender limites e organizar dúvidas antes de decidir.

#### Como funciona

H2:

> O que acontece na avaliação facial.

Passo 1:

> **Você conta o que percebe.**  
> A conversa inclui quando a mudança começou, o que incomoda, sua rotina e o que você deseja preservar.

Passo 2:

> **A Dra. Amanda examina a face como um conjunto.**  
> Pele, volumes, movimento, sustentação, pálpebras, mandíbula e pescoço são avaliados conforme a queixa.

Passo 3:

> **As possibilidades são comparadas.**  
> Benefícios esperados, limites, cicatrizes, recuperação e alternativas são explicados de forma direta.

Passo 4:

> **Você recebe os próximos passos.**  
> Se houver indicação, a equipe organiza o plano e o orçamento. A decisão não precisa ser tomada na consulta.

#### Possíveis conclusões

H2:

> Uma mesma queixa pode levar a caminhos diferentes.

Card 1:

> **Cirurgia**  
> Pode fazer sentido quando a causa principal depende de reposicionamento, retirada de pele ou correção estrutural.

Card 2:

> **Tratamento não cirúrgico ou em etapas**  
> Pode ser mais adequado para movimento, volume, qualidade da pele ou alterações menores.

Card 3:

> **Acompanhamento**  
> Não intervir também pode ser a melhor orientação quando o possível benefício não compensa o tratamento e seus riscos.

Link discreto, depois dos cards:

> Já sabe qual procedimento procura? Ver procedimentos faciais.

#### Quem conduz

H2:

> Formação cirúrgica para indicar — e também para reconhecer limites.

Texto:

> Dra. Amanda Schroeder é médica formada pela UNICAMP, com formação em Cirurgia Geral e Cirurgia Plástica, CRM-SP 191605 e RQE 110472, além de pós-graduação em Cosmiatria e Procedimentos pelo Einstein. A avaliação integra queixa, anatomia, segurança e preservação das características individuais antes de definir qualquer plano.

Manter três avaliações públicas atuais, sem alterar as falas.

#### Informações práticas

H2:

> O que está incluído na consulta.

Itens:

- Conversa sobre a queixa, prioridades e histórico de saúde.
- Exame das estruturas envolvidas.
- Fotografias médicas quando necessárias ao planejamento.
- Explicação das possibilidades, limites e alternativas.
- Discussão de cicatrizes e recuperação quando houver possibilidade cirúrgica.
- Organização dos próximos passos e do orçamento individual, se houver indicação.

Card:

> **Consulta presencial particular**  
> R$ 500  
> Pix, débito ou parcelamento  
> Clínica LIV Faria Lima · Pinheiros  
> Nota fiscal emitida

Observação:

> Eventual reembolso depende do contrato e da análise da operadora. Uma teleconsulta inicial pode ser considerada em casos selecionados, mas não substitui o exame necessário ao plano definitivo.

Botão:

> Ver horários da consulta

#### FAQ

Manter apenas cinco perguntas:

1. `Preciso saber qual procedimento quero?` — Não. A avaliação começa pela mudança percebida e organiza as possibilidades depois do exame.
2. `Posso levar fotos ou referências?` — Sim. Elas ajudam a explicar preferências e receios, mas não definem a técnica nem permitem reproduzir o resultado de outra pessoa.
3. `A avaliação pode concluir que não preciso de procedimento?` — Sim. Cirurgia, tratamento não cirúrgico, cuidado em etapas, acompanhamento ou nenhuma intervenção podem ser conclusões adequadas.
4. `O que devo levar?` — Informações de saúde, medicamentos, suplementos, cirurgias anteriores, exames disponíveis e as dúvidas que deseja esclarecer.
5. `Quando recebo o orçamento cirúrgico?` — Quando existe indicação, a equipe prepara o orçamento de acordo com o plano definido depois da avaliação e do exame.

#### CTA principal

H2:

> Uma consulta para entender o que realmente faz sentido para o seu rosto.

Texto:

> A equipe informa os horários disponíveis e orienta como funciona o primeiro atendimento na Clínica LIV Faria Lima.

Botão:

> Ver horários da consulta

#### Conteúdos relacionados, somente depois do CTA

Exibir três links discretos:

- `Já considera lifting? Entenda quando ele pode fazer sentido.`
- `Como funciona uma consulta de cirurgia plástica.`
- `O que comparar no custo de uma cirurgia facial.`

## 7. Lifting facial

### 7.1 O que muda

- Preservar esta página como destino de alta intenção; não fundir com avaliação facial.
- Reduzir repetições sobre naturalidade, identidade, indicação e conjunto face/pescoço.
- Mostrar resultados antes das explicações mais técnicas.
- Combinar “critério médico”, “consulta” e parte de “segurança” em uma sequência mais direta.
- Mover “Conteúdos selecionados” para depois do CTA principal.
- Manter os sete FAQs médicos atuais, pois respondem objeções específicas, mas evitar repetir as mesmas respostas no corpo.
- Manter os prazos atuais de recuperação como referências gerais e o aviso de variação individual.
- Meta de texto: aproximadamente 1.400 a 1.650 palavras.

### 7.2 Metadados

Título:

> Lifting Facial em São Paulo | Dra. Amanda Schroeder

Descrição:

> Entenda indicação, naturalidade, cicatrizes e recuperação do lifting facial com a Dra. Amanda Schroeder. Consulta particular em Pinheiros, São Paulo.

### 7.3 Texto final planejado

#### Hero

Selo:

> Lifting facial em São Paulo

H1:

> Lifting facial para melhorar a flacidez e o contorno sem apagar sua expressão.

Texto:

> Quando as bochechas descem e a mandíbula perde definição, o lifting pode reposicionar tecidos da face e, quando necessário, do pescoço. A extensão da cirurgia depende da anatomia, da queixa e do que é possível alcançar com segurança.

Linha prática:

> Consulta particular: R$ 500 · Pix, débito ou parcelamento · Clínica LIV Faria Lima, em Pinheiros

Botão:

> Ver horários para avaliação de lifting

#### Resposta curta

H2:

> O lifting trata sustentação. Ele não resolve sozinho todos os sinais do envelhecimento.

Itens:

- `Sustentação:` pode reposicionar tecidos que desceram e melhorar o contorno das bochechas e da mandíbula.
- `Pescoço:` pode entrar no mesmo plano quando a perda de contorno envolve também a região cervical.
- `Volume:` pode exigir uma estratégia própria quando o rosto apresenta perda ou redistribuição de gordura.
- `Pele:` manchas, textura e rugas finas podem precisar de tratamentos complementares ou de outra abordagem.

#### Quando pode fazer sentido

H2:

> O lifting faz sentido para o que me incomoda?

Coluna 1:

> **Pode fazer sentido quando:**  
> Há queda das bochechas, perda da linha da mandíbula, flacidez do terço inferior ou participação do pescoço, e a paciente aceita uma recuperação cirúrgica.

Coluna 2:

> **Outro caminho pode ser melhor quando:**  
> A principal queixa é textura, manchas, rugas finas, movimento muscular, uma perda de volume isolada ou uma alteração ainda discreta.

Fechamento:

> A consulta parte da hipótese de lifting, mas confirma a técnica somente depois do exame.

#### Resultados

H2:

> Resultados visíveis, com preservação das características individuais.

Texto:

> Observe o conjunto: bochechas, mandíbula, pescoço e continuidade dos traços. Fotografias ajudam a compreender possibilidades, mas não definem indicação nem garantem resultado semelhante.

Manter as imagens e legendas autorizadas atuais. Remover o segundo aviso repetido e deixar um único texto legal depois da galeria.

#### Planos possíveis

H2:

> O nome “lifting facial” pode representar planos diferentes.

Card 1:

> **Face**  
> Pode ser suficiente quando a alteração principal está nas bochechas e no terço inferior.

Card 2:

> **Face e pescoço**  
> Pode ser indicado quando a perda da mandíbula e a flacidez cervical fazem parte da mesma queixa.

Card 3:

> **Volume associado**  
> A lipoenxertia pode ser considerada quando reposicionar os tecidos não responde sozinho ao aspecto murcho.

Card 4:

> **Cuidados complementares**  
> Pele, manchas, textura e rugas finas podem precisar de tratamentos próprios antes ou depois da cirurgia.

#### Cicatrizes e recuperação

H2:

> Cicatrizes e recuperação: o que precisa entrar no planejamento.

Texto:

> As cicatrizes costumam acompanhar a linha do cabelo e os contornos naturais da orelha, podendo seguir para a região posterior. Alguns planos também utilizam uma pequena incisão sob o queixo. A posição exata depende da cirurgia indicada.

Manter a linha do tempo atual:

- Primeira semana.
- 10 a 14 dias.
- 3 a 4 semanas.
- Meses seguintes.

Manter os textos clínicos atuais da linha do tempo e o aviso:

> Planeje com margem: viagens, festas e compromissos importantes não devem depender do prazo mínimo.

#### Segurança

H2:

> Como a segurança é organizada.

Card 1:

> **Avaliação e preparo**  
> Histórico de saúde, medicamentos, tabagismo, exames e fatores de risco são analisados antes da cirurgia.

Card 2:

> **Hospital e anestesia**  
> A estrutura e a estratégia anestésica são escolhidas conforme o plano e as condições clínicas.

Card 3:

> **Equipe e acompanhamento**  
> Equipe cirúrgica, retornos, orientações e canal para dúvidas fazem parte da jornada.

Manter a galeria de bastidores como conteúdo expansível. A lista nominal de hospitais pode permanecer dentro do acordeão de segurança, sem destaque promocional no caminho principal.

#### Consulta

H2:

> O lifting pesquisado entra na conversa. A indicação é confirmada depois do exame.

Texto:

> Na consulta, a Dra. Amanda avalia face em repouso e movimento, pele, volumes, sustentação, pálpebras, mandíbula e pescoço. Depois, explica alternativas, cicatrizes, riscos, recuperação e próximos passos.

Fatos:

- `Consulta presencial: R$ 500`
- `Pix, débito ou parcelamento`
- `Nota fiscal emitida`
- `Clínica LIV Faria Lima · Pinheiros`

Botão:

> Ver horários para avaliação de lifting

#### Confiança

H2:

> Clareza na indicação e acompanhamento próximo.

Manter os três depoimentos públicos atuais literalmente, com identificação e link para a origem.

#### FAQ

Manter as sete perguntas e respostas clínicas atuais:

1. Vou ficar com o rosto artificial?
2. Existe uma idade certa?
3. Preciso tratar o pescoço junto?
4. Onde ficam as cicatrizes?
5. Qual anestesia é utilizada?
6. Quando volto ao trabalho e à vida social?
7. Quais riscos precisam ser discutidos?

Não repetir essas respostas em novas seções.

#### CTA principal

H2:

> Se você já considera o lifting, o próximo passo é confirmar se ele corresponde à sua anatomia e aos seus objetivos.

Texto:

> A equipe informa os horários da consulta e orienta como funciona a avaliação na Clínica LIV Faria Lima.

Botão:

> Ver horários para avaliação de lifting

#### Conteúdos relacionados, depois do CTA

Exibir no máximo três:

- Recuperação do lifting facial.
- Lifting facial ou procedimentos injetáveis.
- Como a gordura pode restaurar volumes.

O guia de custos não precisa ser promovido nesta página. Ele entra quando preço se torna a dúvida principal.

## 8. Conteúdo “Como funciona a consulta”

### 8.1 O que muda

- Continuar indexado, mas deixar de ser uma etapa obrigatória entre a página comercial e o WhatsApp.
- Assumir claramente o papel de responder a uma única dúvida.
- Mostrar o valor e as formas de pagamento no primeiro bloco.
- Remover navegação lateral para outros conteúdos antes do CTA.
- Meta de texto: 550 a 750 palavras.

### 8.2 Metadados

Título:

> Como funciona a consulta de cirurgia plástica | Dra. Amanda

Descrição:

> Veja o que acontece na consulta com a Dra. Amanda, o que está incluído, valor, formas de pagamento, avaliação, orçamento e próximos passos.

### 8.3 Texto final planejado

#### Hero

Selo:

> Consulta de cirurgia plástica em Pinheiros

H1:

> Como funciona a consulta com a Dra. Amanda.

Texto:

> Você não precisa chegar sabendo qual cirurgia quer. A consulta começa pela sua queixa, passa pelo exame e termina com uma explicação clara sobre possibilidades, limites e próximos passos.

Linha prática:

> Consulta presencial: R$ 500 · Pix, débito ou parcelamento · Nota fiscal emitida

Botão:

> Ver horários da consulta

#### Antes, durante e depois

H2:

> O que acontece, na prática.

Passo 1:

> **Antes da consulta**  
> Reúna informações de saúde, medicamentos, cirurgias anteriores, exames que já tiver e as dúvidas que deseja esclarecer.

Passo 2:

> **Durante a consulta**  
> A Dra. Amanda ouve a queixa, examina a região, registra fotografias quando necessário e compara possibilidades, limites, cicatrizes e recuperação.

Passo 3:

> **Depois da avaliação**  
> Se houver indicação, a equipe organiza os próximos passos e o orçamento individual. Você não precisa decidir no mesmo momento.

#### O que está incluído

H2:

> O que você leva da consulta.

Itens:

- Compreensão das estruturas relacionadas à queixa.
- Comparação entre cirurgia, alternativas não cirúrgicas e acompanhamento.
- Explicação de benefícios possíveis e limites.
- Orientação sobre cicatrizes, riscos e recuperação quando aplicável.
- Plano e orçamento individual quando houver indicação.

#### Informações práticas

H2:

> Valor, pagamento e local.

Texto:

> A consulta presencial particular custa R$ 500 e pode ser paga por Pix, débito ou parcelamento. A clínica emite nota fiscal. Eventual reembolso depende do contrato e da análise da operadora.

Texto:

> O atendimento acontece na Clínica LIV Faria Lima, R. Pais Leme, 215, em Pinheiros. Uma teleconsulta inicial pode ser considerada em casos selecionados, mas o exame presencial continua necessário para o plano definitivo quando indicado.

#### FAQ

Manter cinco perguntas:

1. Preciso saber qual cirurgia quero?
2. Preciso levar exames?
3. Posso começar por teleconsulta?
4. Recebo o orçamento no mesmo dia?
5. Preciso decidir imediatamente?

Usar as respostas atuais, acrescentando à quarta:

> Quando existe indicação, a equipe organiza o orçamento de acordo com o plano individual. O prazo é informado durante o atendimento; não é prometida entrega no mesmo dia.

#### CTA final

H2:

> Quer consultar os próximos horários?

Texto:

> A equipe informa a disponibilidade e orienta como se preparar para o primeiro atendimento.

Botão:

> Ver horários da consulta

## 9. Guia de custos de cirurgia facial

### 9.1 O que muda

- Continuar indexado e utilizável pelo atendimento depois da faixa de preço.
- Corrigir a divergência entre o site e o novo fluxo de WhatsApp: uma faixa de referência pode ser informada quando houver dado aprovado, mas o orçamento final depende da consulta.
- Explicar uma única vez a diferença entre faixa, orçamento e custo total.
- Reduzir repetições do valor de R$ 500.
- Unir as duas seções finais de CTA em apenas uma.
- Manter o checklist, mas torná-lo mais curto e escaneável no mobile.
- Meta de texto: 950 a 1.150 palavras.

### 9.2 Metadados

Manter o título atual:

> Quanto custa uma cirurgia plástica facial em São Paulo? | Dra. Amanda

Descrição:

> Entenda o que compõe o preço de uma cirurgia facial: equipe, anestesia, hospital, materiais, acompanhamento, consulta e orçamento individual.

### 9.3 Texto final planejado

#### Hero

H1:

> Quanto custa uma cirurgia plástica facial em São Paulo?

Texto:

> Os valores variam porque nem todos os planos incluem a mesma cirurgia, anestesia, hospital, materiais e acompanhamento. Uma faixa de referência ajuda a começar a conversa; o orçamento final só pode ser definido depois da avaliação e do exame.

Linha prática:

> Consulta presencial: R$ 500 · Pix, débito ou parcelamento · Nota fiscal emitida

Botão:

> Ver horários da consulta

#### Resposta curta

H2:

> Não existe um preço único para “cirurgia facial”.

Texto:

> Blefaroplastia, lifting facial, lifting cervical, lipo de papada, otoplastia e lip lifting tratam estruturas diferentes. Mesmo duas pessoas interessadas no mesmo procedimento podem precisar de técnicas, tempo cirúrgico e estrutura distintos.

Texto:

> Quando existe uma faixa de referência aprovada para o procedimento, a equipe pode informá-la pelo WhatsApp. Ela serve para orientar a decisão inicial, mas não substitui o orçamento individual.

#### O que entra no orçamento

H2:

> Antes de comparar preços, confirme o que está incluído.

Card 1:

> **Equipe cirúrgica**  
> Honorários da cirurgiã, auxiliares e demais profissionais necessários ao procedimento.

Card 2:

> **Anestesia**  
> Avaliação, honorários do anestesiologista e recursos necessários à estratégia anestésica.

Card 3:

> **Hospital**  
> Centro cirúrgico, equipamentos, medicações e período de permanência previsto.

Card 4:

> **Materiais e preparo**  
> Materiais próprios da técnica, curativos, exames e avaliações pré-operatórias.

Card 5:

> **Acompanhamento**  
> Retornos, orientações da recuperação e avaliação das cicatrizes.

#### Faixa, orçamento e custo total

H2:

> Faixa de referência e custo total não são a mesma coisa.

Item 1:

> **Faixa de referência**  
> Ajuda a saber se o investimento inicial está dentro do que a paciente considera possível.

Item 2:

> **Orçamento individual**  
> É preparado depois que a técnica, as regiões tratadas e a estrutura necessária foram definidas.

Item 3:

> **Custo total da jornada**  
> Pode envolver exames, remédios, curativos, ajuda em casa, deslocamentos e organização do período de recuperação.

Fechamento:

> Bom custo-benefício não é simplesmente o menor número. É receber uma indicação adequada, entender o que está incluído e ter estrutura e acompanhamento compatíveis com o caso.

#### Quando um plano menor pode ser melhor

H2:

> Nem toda queixa precisa de uma cirurgia maior.

Texto:

> Uma pessoa que chega pensando em lifting pode descobrir que a principal alteração está nas pálpebras, na pele ou no volume. Em outros casos, procedimentos não cirúrgicos não corrigem uma flacidez estrutural e insistir neles pode aumentar gastos sem tratar a causa.

Lista:

- Um procedimento menor pode ser suficiente quando a queixa está concentrada em uma região.
- Um tratamento não cirúrgico pode ser mais adequado para movimento, pele ou perdas de volume selecionadas.
- O tratamento pode ser dividido em etapas quando nem tudo precisa ser feito ao mesmo tempo.
- Não operar pode ser a melhor orientação quando o possível benefício não compensa o procedimento e seus riscos.

#### Consulta

H2:

> Por que o orçamento depende da avaliação.

Texto:

> Fotos e mensagens ajudam a explicar a queixa, mas não mostram tudo. Pele, gordura, músculos, pálpebras, pescoço, cirurgias anteriores, medicamentos e condições de saúde podem mudar o planejamento.

Texto:

> A consulta presencial com a Dra. Amanda custa R$ 500 e inclui conversa sobre a queixa e o histórico, exame, fotografias quando necessárias, comparação de possibilidades, explicação sobre cicatrizes e recuperação e organização dos próximos passos. O pagamento pode ser feito por Pix, débito ou parcelamento.

Texto sobre nota fiscal:

> A clínica emite nota fiscal. Ela pode ser apresentada à operadora quando o contrato prevê reembolso, mas a análise e o valor aprovado dependem do plano.

#### Checklist

H2:

> Antes de decidir, procure responder a estas perguntas.

1. Qual procedimento e quais regiões estão incluídos?
2. Equipe, anestesia, hospital e materiais aparecem separadamente?
3. Quais exames e despesas de recuperação ficam fora do orçamento?
4. Quantos retornos estão previstos e como funciona o contato com a equipe?
5. Qual é a política de pagamento, cancelamento e eventual mudança do plano?

#### FAQ

Pergunta:

> Dá para saber o valor da cirurgia pelo WhatsApp?

Resposta nova e obrigatória:

> Em alguns procedimentos, a equipe pode informar uma faixa de referência aprovada. O orçamento final só é preparado depois da consulta, do exame e da definição do plano individual.

Manter também:

- Quanto custa a consulta e como posso pagar?
- Uma cirurgia facial menor sempre custa menos?
- A consulta ou a cirurgia têm reembolso pelo convênio?

#### Aviso editorial

H2:

> Um guia ajuda. A consulta define.

Texto:

> Esta página é educativa. Ela explica como os valores são formados, mas não representa orçamento, indicação médica ou promessa de resultado. O valor da consulta e as formas de pagamento devem ter a data de atualização revisada sempre que houver mudança.

#### CTA final

H2:

> Quer entender qual avaliação faz sentido para o seu caso?

Texto:

> A equipe informa os horários disponíveis. O orçamento da cirurgia é organizado depois da consulta e da definição do plano individual.

Botão:

> Ver horários da consulta

Conteúdos relacionados ficam depois deste bloco e limitados a dois:

- Como funciona a consulta.
- Lifting facial ou procedimentos injetáveis.

## 10. Página de conteúdos

Não é necessária uma reescrita completa nesta etapa. Fazer somente estes ajustes:

- Manter a página fora do menu principal; usar o rodapé e links contextuais.
- Trocar “Leituras prioritárias” por `Dúvidas que ajudam a tomar uma decisão`.
- Não destacar o guia de custos como primeira opção para todo visitante. Ele permanece dentro de “Face e pescoço” e pode ser acessado por busca ou pelo atendimento.
- Manter a avaliação facial como saída para quem não sabe qual técnica procura.
- Padronizar o CTA dos artigos para `Ver horários da consulta`.

## 11. Mudanças de layout que acompanham o texto

- Um CTA principal visível no primeiro campo de tela do mobile.
- Uma única cor de botão principal em todas as cinco páginas.
- Cards no mobile em lista vertical; não exigir carrossel para entender as opções principais.
- Conteúdo técnico extenso dentro de acordeões depois das informações essenciais.
- No máximo três escolhas simultâneas em blocos de decisão. A faixa “Ainda não sabe?” pode aparecer como quarta opção separada.
- Links educativos visualmente secundários e posicionados depois do CTA de conversão.
- Manter contraste alto, especialmente nos cards escuros da avaliação facial e do guia de custos.
- O botão fixo do WhatsApp não pode esconder valor, endereço, texto de FAQ ou o último item de uma lista.

## 12. SEO e segurança técnica

- Não alterar slugs, canonicals ou sitemap, exceto a data de modificação das páginas efetivamente revisadas.
- Não criar redirecionamentos nesta etapa.
- Manter todas as cinco páginas com `index,follow`.
- Atualizar `title`, `description`, Open Graph, Twitter e dados estruturados para refletir o novo texto.
- Manter um único H1 por página.
- Atualizar FAQs estruturadas para corresponder exatamente às perguntas que continuarem visíveis.
- Preservar CRM-SP 191605, RQE 110472, endereço, telefone e fontes institucionais.
- Não inventar certificações, resultados, número de cirurgias ou taxas de satisfação.
- Não afirmar que uma faixa de referência é orçamento final.
- Não prometer reembolso, dedução fiscal, resultado ou prazo de recuperação individual.

## 13. Rastreamento e avaliação de conversão

O site já registra o evento GA4 `whatsapp_click` com `page_path`, `cta_location` e `cta_text`. Preservar esses atributos em todos os botões.

Padronizar `cta_location` como:

- `header`
- `hero`
- `consultation`
- `final`
- `sticky`

Comparar 28 dias antes e 28 dias depois, separando por página de entrada:

1. Sessões que geram `whatsapp_click`.
2. Cliques no WhatsApp que se tornam conversas identificadas.
3. Conversas que se tornam agendamento.
4. Agendamentos que comparecem à consulta.

O principal indicador do site é `agendamentos originados por página de entrada`, não apenas visualizações ou tempo de permanência.

## 14. Ordem de implementação

1. Criar componentes visuais globais de cabeçalho, CTA, fatos da consulta e rodapé.
2. Reescrever e ajustar a página inicial.
3. Reescrever a avaliação facial.
4. Reorganizar a página de lifting facial.
5. Enxugar o conteúdo sobre a consulta.
6. Alinhar o guia de custos ao fluxo de faixa de referência do WhatsApp.
7. Fazer os pequenos ajustes na página de conteúdos.
8. Atualizar metadados, schemas e datas.
9. Validar links, mensagens de WhatsApp e eventos GA4.
10. Fazer QA visual em 360, 390, 412, 768, 1024 e 1440 px.
11. Publicar e verificar as cinco URLs no ambiente público.

## 15. Critérios de aceite

- Cada página tem uma intenção e um CTA principal inequívocos.
- A página inicial oferece somente face, mamas, corpo e a alternativa “não sei”.
- A avaliação facial não começa com um vídeo específico de lifting.
- A página de lifting continua completa para busca, mas não repete a mesma explicação em seções diferentes.
- Conteúdos educativos não interrompem o caminho até o primeiro CTA completo.
- Valor da consulta, Pix, débito, parcelamento e nota fiscal aparecem de forma consistente.
- O guia informa corretamente que uma faixa pode ser fornecida pelo WhatsApp quando aprovada, mas que o orçamento final depende de avaliação.
- A mensagem do WhatsApp do guia preserva a referência usada para evitar reenvio.
- Nenhuma URL existente é removida ou redirecionada.
- Todos os links e testes automatizados passam.
- Não há regressão visual ou de contraste no mobile.

## 16. Modelo recomendado para executar

Usar **Sol Alto** para a implementação completa. A tarefa envolve julgamento de texto, edição coordenada de várias páginas, SEO, dados estruturados, comportamento mobile, rastreamento e validação visual. Terra Alto é adequado para uma alteração isolada, mas Sol Alto é a escolha mais segura para executar todo este plano em uma única rodada.
