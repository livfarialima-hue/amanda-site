# Histórico do pacote Bruna

## 2026-08-18.3

- A IA passou a ser a primeira instância de interpretação de toda mensagem textual elegível; padrões de pontuação, palavras-chave, códigos e templates ficaram restritos a pistas e guardrails.
- Perguntas coloquiais sem interrogação, como `Aí fazem cervicoplastia`, deixam de ser silenciadas por uma decisão mecânica e seguem para compreensão contextual.
- Respostas determinísticas de agenda, preço e fatos institucionais só substituem o texto gerado quando a IA confirma semanticamente o código, o procedimento, o profissional e que a prévia cobre todos os pedidos seguros do turno.
- Ambiguidade linguística segura passa a receber uma única pergunta curta e específica de esclarecimento, com contrato de uma pergunta, nenhum link e nenhum CTA; urgência, risco clínico, cuidado ativo, opt-out, duplicidade e tomada humana continuam fail-closed.
- O mesmo princípio foi aplicado à retomada após atendimento humano. Uma autorização genérica da IA não atravessa o bloqueio final: somente reabertura, esclarecimento, coordenação ou cópia institucional explicitamente confirmados permitem resposta.
- `CONTEXT-CLARIFY-01` identifica ambiguidade de linguagem ou referência conversacional; `UNKNOWN-CLARIFY-01` fica reservado à pergunta já compreendida cuja resposta aprovada depende de uma informação simples adicional.
- Estado desta versão: código e documentação locais validados com **814/814 testes**; publicação, verificação em produção e projeção no Drive aguardam o fechamento do release autorizado.

## 2026-08-18.2

- Criado contrato único por turno com estado, responsável, intenções pendentes, motivo de silêncio e limites de perguntas, links, CTA e confirmação de agenda.
- Removidas perguntas, menus e convites obrigatórios das respostas de preço, consulta, canal oficial e handoffs; respostas passaram a encerrar depois de resolver o pedido quando não há próximo passo útil.
- Mensagens genéricas de espera foram eliminadas do envio ao paciente e das sugestões internas; contexto insuficiente agora gera silêncio e aviso `SEM SUGESTÃO PRONTA` à equipe.
- Adicionado validador semântico final para bloquear diagnóstico remoto, promessa, valor ou condição não aprovada, confirmação de agenda não verificada, abatimento da consulta, alegação tributária ou de reembolso, menu, excesso de links/perguntas e CTA fora do estágio.
- Pausas, recusas por orçamento, respostas à equipe humana e sinais de que a paciente retornará transferem a iniciativa sem nova mensagem ou retomada automática.
- A janela de consolidação passou a três segundos para respostas determinísticas e cinco para IA, limitada entre dois e oito segundos, mantendo cancelamento por mensagem mais nova ou intervenção humana.
- Criado conjunto versionado de cenários sintéticos a partir de padrões desidentificados da pasta restrita de conversas do Drive; respostas reais continuam sendo evidência crítica, nunca padrão a copiar.
- Mantido `gpt-5.6-terra` com raciocínio `medium`; comparação de modelo e ampliação das etapas tardias da jornada ficaram fora desta versão.

## 2026-08-18.1

- Criada a contenção específica entre 00:00 e 05:59: uma única confirmação curta por episódio e retomada contextual às 8h.
- Pedido para continuar amanhã passou a ser sinal de pausa mesmo quando termina com uma pergunta de confirmação, como `melhor né?`.
- Bloqueados durante a madrugada preços, faixas, links, CTAs, respostas longas, novas qualificações e confirmações de agenda; possível urgência mantém a rota imediata de segurança.
- O e-mail interno da madrugada passou a trazer contexto, estado do aviso já enviado e uma sugestão pronta para a manhã; removido o placeholder genérico usado como falsa sugestão humana.

## 2026-08-17.1

- Tornado explícito que a Bruna se apresenta somente como concierge, com bloqueio fail-closed para qualquer resposta que a rotule como automação, bot, robô, IA, assistente ou secretária virtual.
- Incorporado o ARC adaptativo: contexto, estágio, barreira e segurança prevalecem sobre roteiros e origem do anúncio.
- Acolhimento de fotos passou a reconhecer a vulnerabilidade, apontar boas opções sem promessa e explicar o limite da avaliação à distância antes do handoff humano.
- Endereço padronizado com conjunto, CEP e link aprovado do Google Maps.
- Parcelamento antecipado e desconto à vista passaram a ser fatos institucionais; quantidade de parcelas, percentual e demais condições continuam humanas.
- Mantidas as faixas aprovadas somente após insistência explícita em lifting/minilifting, com ressalvas, guia e bloqueio de repetição.
- Consolidado o uso contextual do site e o aprendizado supervisionado, sem promoção automática de respostas humanas.

## 2026-08-11.1

- Consolidada a identidade da Bruna e a estratégia de conversão ética para consulta.
- Separadas oportunidades da Dra. Amanda e do Dr. Daniel dentro da única planilha `LEADS`.
- Bloqueada a inclusão de Henrique, Marina e outros profissionais nas abas de leads.
- Exigida confirmação humana para toda escolha final de horário.
- Tornado o envio de resposta idempotente e fechado em caso de falha de armazenamento em produção.
- Limitado o aprendizado automático a regras de baixo risco, aprovadas e promovidas em snapshot.
- Versionados prompt, esquema de dados, política e snapshot de conhecimento para rollback.
