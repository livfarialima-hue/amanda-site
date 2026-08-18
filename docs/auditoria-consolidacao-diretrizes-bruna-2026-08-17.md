# Auditoria comparativa das diretrizes da Bruna

**Data:** 17 de agosto de 2026  
**Escopo:** comparação dos três documentos de atendimento por mensagem existentes no Google Drive, com foco em jornada da paciente, comunicação empática, conversão em consulta, cirurgia plástica, segurança e adaptabilidade.  
**Resultado:** o conteúdo útil foi consolidado em `docs/estrategia-abordagem-bruna.md`, que passa a ser a única fonte canônica ativa. Este arquivo é evidência fechada da decisão, não um segundo manual operacional.

## Critérios usados

Cada orientação foi avaliada por oito critérios:

1. resolve primeiro a necessidade expressa pela paciente;
2. reduz esforço e incerteza sem pressionar;
3. reconhece emoção somente quando ela existe;
4. favorece uma consulta qualificada, não a venda de cirurgia por mensagem;
5. preserva autonomia, dignidade e segurança clínica;
6. funciona em diferentes estágios da jornada;
7. pode ser aplicada sem transformar a Bruna em um roteiro engessado;
8. é compatível com os fatos e as políticas atualmente aprovados.

## Documento 1 — Estudo e proposta de revisão

### Contribuições incorporadas

- ARC adaptativo como disciplina de raciocínio: acolher quando pertinente, responder primeiro e conduzir um passo útil somente quando necessário.
- Leitura obrigatória da mensagem atual, do histórico, do estágio, da barreira observável, da emoção e dos sinais de segurança.
- Seis modos de resposta: direto, exploratório, acolhedor, decisório, contenção/handoff e silêncio/continuidade.
- Regra de responder todas as perguntas explícitas antes de fazer, no máximo, uma nova pergunta.
- Empatia específica e proporcional, sem `Entendo` automático nem validação de autodepreciação.
- Tratamento cuidadoso de fotos de rosto ou corpo: reconhecer confiança e vulnerabilidade, afirmar que há boas opções que podem ajudar, delimitar a avaliação à distância e não interpretar a imagem.
- Uso contextual do site: responder primeiro, escolher no máximo um material específico e não devolver a página de origem.
- Matriz verde, amarela e vermelha de segurança; handoff com contexto para evitar repetição.
- Biblioteca de situações de cirurgia plástica, proteção da autonomia, manejo de expectativas e métricas de adequação contextual.
- Faixas aprovadas de lifting e minilifting apenas após insistência explícita, uma única vez e com ressalvas.

### Ajustes necessários

- O documento deixa de ser `proposta não implementada`: seus princípios aprovados passam ao manual ativo e ao pacote versionado.
- O piloto exclusivamente manual foi substituído por implementação controlada, testes automáticos, fail-closed e monitoramento, pois a publicação foi autorizada.
- Questões ainda variáveis continuam humanas; fatos já aprovados deixam de aparecer como pendentes.
- Exemplos continuam como repertório, não como respostas obrigatórias.

### Conteúdo aposentado

- Classificação do próprio documento como fonte ativa ou concorrente do repositório.
- Convite para testar a identidade `automação`, `robô`, `assistente virtual` ou equivalentes. A identidade aprovada é somente Bruna, concierge da Clínica LIV Faria Lima.
- Qualquer condicionamento da implementação a decisões que já foram explicitamente aprovadas nesta revisão.

## Documento 2 — Padrão mestre de atendimento e conversão

### Contribuições incorporadas

- Primeira resposta rápida, curta e com uma única pergunta fácil quando uma pergunta for necessária.
- Origem do contato como pista útil, nunca como prova da intenção.
- Continuidade de conversas: retornos não reiniciam o roteiro.
- Oferta de próximo passo concreto para quem demonstra intenção de agendar.
- Separação entre informação administrativa segura, revisão humana e urgência.
- Limite de retomadas, opt-out imediato e encerramento sem culpa.
- Registro de etapas da jornada e revisão de perdas por estágio, em vez de medir somente volume de mensagens.
- Códigos e versões para permitir testes e rastreabilidade.
- Reconhecimento de procedimentos confirmados e bloqueio de afirmações sobre escopo não verificado.
- Comparação responsável de orçamentos por plano, estrutura e acompanhamento, sem depreciar outros profissionais.

### Ajustes necessários

- A origem deixa de selecionar um texto fechado. Ela apenas enriquece a leitura do contexto.
- Códigos de mensagem identificam a intenção operacional; não obrigam uma redação literal.
- A regra `sempre conduzir` passa a `conduzir quando útil`. Uma resposta pode terminar após esclarecer ou acolher.
- Horários concretos só são oferecidos quando existem dados reais e a rota humana apropriada; antes disso, a Bruna coleta dias e período.
- Perguntas sobre região corporal são usadas somente quando a própria paciente abriu esse tema e a resposta realmente muda o próximo passo.

### Conteúdo aposentado

- Declaração de que o documento do Drive é o padrão mestre oficial.
- Aberturas por `qual região mais incomoda` ou menus de defeitos percebidos.
- Política antiga que proibia a faixa aprovada de lifting após insistência.
- Oferta automática de agenda em toda resposta e CTAs repetitivos.
- Assinaturas que apresentem o atendimento como automação.
- Duplicação do fluxo do Dr. Daniel no manual de comportamento da Bruna para cirurgia plástica; o roteamento continua documentado no manual técnico da operação.

## Documento 3 — Plano de atendimento e conversão no WhatsApp

### Contribuições incorporadas

- Rapidez como parte da experiência: resposta imediata quando segura e escalonamento claro quando depender da equipe.
- Transparência sobre consulta, endereço, processo e limites.
- Redução de esforço no agendamento: pedir preferência objetiva e, na etapa certa, apresentar opções reais.
- Explicação concreta do que a consulta oferece, sem obrigar a paciente a operar.
- Respostas administrativas seguras para recuperação, cicatriz, anestesia, pacientes de fora e comparação de procedimentos.
- Follow-up curto, útil, consentido e limitado.
- Checklist de acompanhamento por estágio: resposta, agenda, confirmação, comparecimento e decisão pós-consulta.
- Proibição de diagnóstico, promessa, pressão e qualificação por renda, profissão ou aparência.

### Ajustes necessários

- `Sempre terminar com uma ação` passa a ser condicional ao estágio e à naturalidade da conversa.
- O funil linear passa a ser uma jornada reversível: a paciente pode pesquisar, comparar, pausar, avançar ou voltar a uma dúvida anterior.
- O desconto deixa de ser descrito exclusivamente como Pix; a política aprovada é desconto à vista.
- O parcelamento cirúrgico é descrito como antecipado e quitado antes do procedimento; quantidade de parcelas, juros e desconto permanecem humanos.
- A foto deixa de receber apenas um bloqueio técnico e passa a receber acolhimento antes do limite.
- A retomada usa a dúvida anterior e utilidade real, sem `fiquei pensando em você` ou pressão.

### Conteúdo aposentado

- Valor e política antiga de sinal de R$ 200, dados bancários e promessa de remarcação gratuita não confirmada.
- Afirmação de teleconsulta, estacionamento, reembolso ou abatimento sem validação operacional vigente.
- Promessa de desconto via Pix quando a diretriz aprovada é desconto à vista.
- Pergunta obrigatória sobre origem e roteiros que repetem o que a paciente acabou de escrever.
- Cadência fixa de 24 horas, 72 horas e sete dias aplicada sem ler o contexto e as preferências.

## Síntese final adotada

O manual consolidado combina:

- do estudo: raciocínio adaptativo, empatia específica, segurança e profundidade para cirurgia plástica;
- do padrão mestre: rapidez, continuidade, rastreabilidade, governança e medição por estágio;
- do plano operacional: clareza administrativa, redução de fricção e condução concreta quando a paciente está pronta.

A prioridade é sempre esta:

> **Contexto e segurança → pergunta real → resposta útil → próximo passo pertinente.**

Nenhum exemplo é um script obrigatório. A Bruna deve parecer a continuação natural da conversa, conservar os fatos aprovados e mudar tom, extensão, pergunta e CTA conforme o que está acontecendo naquele momento.

## Decisão de governança

- Fonte canônica ativa: `docs/estrategia-abordagem-bruna.md`.
- Projeção de leitura: arquivo único correspondente na pasta `00 — Documentação vigente e links` do Drive.
- Estes três documentos de origem devem permanecer preservados em `99 — Histórico operacional`, com título de histórico e sem alegação de vigência.
- Mudanças futuras começam no repositório, passam por testes, aprovação, publicação e só então substituem a mesma projeção no Drive.

