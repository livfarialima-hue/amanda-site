# Teleconsulta da Dra. Amanda — 14/10/2026

Status: SYNC_PENDING.

Daniel confirmou em 14/10/2026: a Dra. Amanda oferece teleconsulta por R$ 500, inclusive para pacientes no exterior. A modalidade pode ser informada diretamente; o preço é respondido quando solicitado. Isso não confirma horário, indicação cirúrgica individual, orçamento por foto, forma de pagamento remoto ou atendimento de outro profissional.

A alteração remove duas proibições antigas do prompt e a pendência automática do bundle. Não cria memória paralela nem promove seeds da KnowledgeBase. O valor presencial existente permanece válido.

A revisão identificou e cobriu a confusão com Daniel em perguntas combinadas, a prévia presencial após contexto remoto e a referência cirúrgica antiga em “Quanto custa?”. Sugestões de madrugada/retomada usam o mesmo proprietário de fatos.

Preflight somente leitura: 556 oportunidades únicas; 12 eventos Ads prontos coincidem com 12 transações exportadas. Aceite do Ads não verificado. Divergência de responsável na projeção LEADS observada no pacote anterior permanece pendente de diagnóstico separado. Nenhuma escrita de paciente ou rotina operacional.

Testes locais aprovados: 2.165 integrais, 54 complementares, contrato, arquitetura, sintaxe e reversão de todo o pacote. Build/check com 193 arquivos e 54 URLs sem erro. As duas revisões independentes foram encerradas sem bloqueios. Foram corrigidos encaminhamento incidental, troca explícita de profissional, negação/ambiguidade de modalidade e validação do sentido positivo do fato aprovado. Publicação exige 19 cenários reais de IA, três áudios sintéticos e dois casos de histórico completo. Reversão por novo commit equivalente ao funcional bbf297da98946badd4460989064e4f2636f1211c, Netlify 6acf71e94079694bfc8221a4, Apps Script v164 preservado; sem replay.

Primeira tentativa bloqueada em 14:04 UTC: timeout real de 20s no primeiro cenário. O diagnóstico adicional de 20,007s não aprovou o gate. Foi encontrada no apêndice de conversão uma instrução antiga que ainda exigia confirmar modalidade remota e outro comando genérico de pagamento. Ambos foram substituídos pelos fatos por profissional/modalidade. A orientação inicial sobre avaliação remota não garante fechamento de orçamento online. Modelo, prazo e critérios de aceitação foram preservados; nova validação é obrigatória.

A regra que mandava revisar qualquer conversa com faixa anterior foi restringida a novo pedido de repetir/negociar a mesma faixa. Perguntas novas usam o assunto atual. A revisão da clareza considerou a [documentação oficial de prompts](https://developers.openai.com/api/docs/guides/prompt-engineering) e [latência](https://developers.openai.com/api/docs/guides/latency-optimization); nenhum ganho de tempo foi inferido da redução textual. O prompt amplo permanece objeto de avaliação separada, preservando histórico e regras essenciais.

Segunda tentativa bloqueada em 14:11 UTC: a IA respondeu em 10,767s, mas encaminhou para agenda e não respondeu à pergunta informativa sobre teleconsulta. A causa identificada foi a prioridade incondicional e repetida de agenda no prompt. As repetições foram substituídas por uma regra: responder primeiro a dúvida atual coberta por fontes quando o contrato permitir, preservar a intenção de agendar e consultar a agenda real para horários. Pedido puro de agenda foi acrescentado ao gate real, agora com 19 cenários. Produção permaneceu no baseline.
