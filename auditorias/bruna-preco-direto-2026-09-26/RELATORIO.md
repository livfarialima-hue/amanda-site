# Bruna — preço direto e continuidade cuidadosa — 26/09/2026

Estado: 1.737 testes integrais e 18 regressões específicas aprovados; publicação explicitamente autorizada por Daniel: “Entao ajuste e publique tudp”. Sem envio real de teste.

## Problema e decisão

Os exemplos da tarefa mostram a dúvida de valor sendo adiada, mensagens sem apresentação, retorno genérico mesmo com procedimento informado e pouca continuidade. São exemplos para desenhar regressões, não uma auditoria de todas as conversas nem prova de autoria de cada mensagem. Nove de quinze cenários sintéticos falharam antes da correção; o conjunto foi ampliado para dezoito verificações da nova política.

A resposta privada informa a faixa operacional já aprovada no primeiro pedido explícito de valor, preserva o procedimento conhecido, apresenta a Bruna uma vez e mantém as ressalvas no mesmo envio. Não exige segunda autorização nem artigo. Pagamento apenas quando solicitado; artigo somente quando pedido. Aceite de oferta antiga continua reconhecido. Uma faixa já enviada segue para revisão humana, sem repetição automática.

Consulta: R$ 500, explicação breve da avaliação se ainda não compartilhada, formas de pagamento aprovadas e um convite opcional. Depois da faixa cirúrgica, pode oferecer explicar a avaliação; se já explicada, verificar opções de horário. Convite anterior, adiamento ou recusa impedem insistência. Nenhuma reserva ou confirmação é criada.

Somente faixas já aprovadas: minilifting R$ 18–25 mil; lifting facial R$ 26–42 mil; cervicoplastia R$ 18–26 mil; otoplastia R$ 8–14 mil. O orçamento individual permanece após avaliação e planejamento e pode ficar fora da faixa. Nenhuma inferência clínica ou garantia. A aprovação operacional não é um parecer normativo sobre publicidade médica.

Redução de orelha recebe pergunta específica sobre tamanho versus afastamento; redução explícita de tamanho não herda a referência geral e exige conferência humana. Outras cirurgias, variantes sem referência, valores extras, mistura de procedimentos e repetição permanecem bloqueados. Interesse genérico, prefill, recusa e pergunta apenas sobre condições de pagamento não liberam números.

## Implementação e consumidores

A política pura em surgical-price-policy.mjs decide a autorização por procedimento, intenção, variante e histórico. Planejamento, contexto recuperado da relação com o paciente e retomada usam a mesma decisão. Os textos determinísticos e as orientações conversacionais foram alinhados, inclusive um apêndice que ainda exigia primeiro turno sem números. O gate final verifica autorização, procedimento, montantes e ressalvas. A retomada rejeita códigos de preço antigos ou atuais com contexto incompatível. O envelope semântico preserva o limite de links e o convite já autorizado, sem criar agenda.

Proprietários, consumidores, 29 comandos exigidos e os arquivos exatos estão em ops/CHANGE-CANDIDATE.json e ops/IMPACT-REGISTRY.json. Estratégia atualizada no Norte; manual e Plano continuam como projeções dos mesmos arquivos no Drive. Registros datados anteriores estão identificados como históricos.

## Validação

Dezoito regressões específicas aprovadas; fluxo completo do webhook simulado verifica um único envio com faixa cervical ou facial correta. Testes de retomada preservam janela humana, contexto relido, bloqueio por procedimento conflitante e ausência de duplicidade. Toda integração externa é simulada, sem paciente, contato, fila ou compromisso artificial.

A suíte integral passou em 1.737/1.737 testes. Os 28 comandos obrigatórios de validação passaram; ops:check mantém SYNC_PENDING corretamente até publicar e reconciliar as projeções. Resultados em PUBLICACAO.json. O build local gerou 193 arquivos, 54 URLs no sitemap e nenhum arquivo de auditoria no artefato; verificação técnica sem erros. A diferença entre arquivos do build e contagem do painel deve ser informada conforme observada, não presumida.

## Publicação, limite e acompanhamento

Baseline local 1ee5976726ddea8ce34749abb46e01f0ef38a270; produção anterior dd2dcfe63efc0dec4a982133b1e28459aeb3a421 / Netlify 6ab7a3b5dda1f60008f631fe. Apps Script v161 preservado conforme recibo anterior. Transporte, timeouts, recuperação, campanhas, cadência e dados não fazem parte da mudança.

Publicado em 26/09/2026 às 08:52:34 BRT: commit fe879a6093d97a405320665fde667fb254dde4aa, Netlify 6ab7b1e5c8225e00080535dd. Domínio e URL imutável HTTP 200 em active, assinatura protegida, requisições sem assinatura HTTP 401. Treze funções, cinco programações preservadas e zero novo arquivo estático enviado. Pré-voo em PREFLIGHT.json; versão, verificações e igualdade das projeções são registrados em PUBLICACAO.json. Nenhuma mensagem antiga será reprocessada. Aumento de conversão não foi medido e publicação técnica não comprova entrega de uma nova conversa natural.

Daniel/equipe: observar primeiras conversas elegíveis, revisar em 48 horas e sete dias; medir dúvidas de preço respondidas, intervenções humanas, continuidade, qualificação, consultas confirmadas e realizadas. Conter diante de faixa indevida, indicação individual, duplicidade, repetição ou pressão. Rollback: restaurar Netlify 6ab7a3b5dda1f60008f631fe e commit dd2dcfe63efc0dec4a982133b1e28459aeb3a421, preservando Apps Script v161, histórico, filas e pausas, sem replay. A revisão humana está registrada no Plano e não cria uma automação.
