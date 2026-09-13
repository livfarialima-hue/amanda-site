# Reconciliação de leads com conversas do WhatsApp

**Estado:** concluída e verificada na planilha canônica em 13/09/2026. A nova conversão está pronta para a conexão agendada do Google Ads; aceite pela conta ainda depende da próxima execução do conector.

## Objetivo e fontes

Revisar a classificação comercial da Dra. Amanda a partir da planilha LEADS e das exportações de conversas guardadas no Drive, promovendo somente manifestações pessoais que atendam ao contrato de `Qualificado`. Para cada promoção elegível, preparar `Lead qualificado GCLID` e marcar `Enviar ao Google Ads? = Sim` somente quando houver exatamente um identificador de clique e os demais campos obrigatórios.

Foram confrontados:

- a planilha LEADS canônica, com 284 oportunidades preenchidas;
- 377 arquivos ZIP de conversas no diretório restrito do Drive, consolidados em 289 conversas únicas pela versão mais recente;
- a coorte recente de 140 conversas únicas exportadas em 30/08 e 11/09;
- CRM, funil, eventos de fase, fila de classificação e aba `IMPORT_GOOGLE_ADS`.

Das 140 conversas recentes, 132 foram ligadas diretamente à LEADS por identidade operacional. As oito restantes foram revisadas individualmente: uma já correspondia a consulta realizada na planilha; as demais eram atendimento de outro profissional, fornecedor, contato sem conteúdo utilizável ou paciente cirúrgica já estabelecida. Nenhuma delas exigia criar ou promover um lead de aquisição da Dra. Amanda.

## Critério aplicado

`Novo` foi preservado quando havia somente mensagem estruturada de anúncio/site, pergunta isolada de preço ou localização, pesquisa genérica, mídia sem texto legível ou ausência de manifestação pessoal posterior. `Qualificado` exigiu interesse pessoal concreto em avaliação/procedimento, agenda, datas, forma de marcar ou outro avanço comercial inequívoco. Consulta e cirurgia já realizadas foram preservadas em suas fases superiores.

O envio ao Google foi limitado a oportunidades da Dra. Amanda em `Qualificado` ou fase posterior, com exatamente um entre GCLID, GBRAID e WBRAID, data/hora válida e identificador de transação idempotente. Conversa sem identificador de clique pode ser qualificada, mas não recebe `Sim` por esse motivo.

## Resultado aplicado

Uma oportunidade estava em `Novo` apesar de conter resposta pessoal posterior ao prefill e interesse concreto em avaliação. Ela foi promovida para `Qualificado` pela rotina auditada do Apps Script. A mesma execução:

- sincronizou a fase na visão principal, CRM e funil;
- registrou o evento de mudança de fase como auditoria humana de conversa;
- preencheu `Enviar ao Google Ads? = Sim`;
- definiu a ação exata `Lead qualificado GCLID`, valor `1` e moeda `BRL`;
- criou um único identificador de transação seguro;
- deixou um único evento `qualified_lead` e uma única linha pronta em `IMPORT_GOOGLE_ADS`.

As seis conversões que já estavam preparadas continuaram válidas. O total passou a sete linhas prontas, sem duplicidade de transação e sem inconsistência de elegibilidade. Quinze contatos recentes que ainda estavam em `Novo` e possuíam identificador de clique permaneceram nessa fase porque a conversa não demonstrava qualificação suficiente.

## Segurança e verificação

O projeto, deployment e planilha foram conferidos pelo comando canônico antes da escrita, com resultado `ALVO CANÔNICO CONFIRMADO`. Uma cópia integral privada da planilha foi criada no diretório restrito antes da correção. A escrita ocorreu pela função `aplicarAuditoriaClassificacaoDaAba`, que valida a fase esperada, sincroniza consumidores e remove a aba temporária ao concluir.

O pós-voo confirmou:

- fase `Qualificado` em todas as projeções da oportunidade corrigida;
- uma linha `ready` na fila de importação e uma linha correspondente no evento Google;
- sete oportunidades elegíveis, sete payloads válidos, zero problemas e zero transações duplicadas;
- fila de classificação concluída, sem erro;
- nenhuma mensagem ao paciente, consulta, cirurgia, orçamento ou configuração de campanha alterada.

Áudios, imagens e arquivos sem transcrição não foram interpretados. A auditoria não tratou silêncio, mídia ou prefill como prova de intenção. A marcação `ready` comprova preparo na fonte canônica; não comprova que o Google Ads já aceitou a conversão. Essa aceitação deve ser relida depois da próxima execução diária da conexão, prevista entre 05:00 e 06:00 no horário de São Paulo.

## Reversão e monitoramento

Se surgir evidência de classificação incorreta, a reversão deve ser pontual pela mesma rotina auditada, conferindo primeiro a fase atual. Se o Google já tiver aceitado o evento, a correção também deve gerar a retração idempotente correspondente; nunca restaurar a cópia integral sobre alterações concorrentes da planilha.

Na próxima execução do conector, conferir o recibo da linha nova, preservar as outras seis e investigar somente rejeição, duplicidade ou divergência entre LEADS, evento e importação. A decisão de mídia continua baseada em contatos válidos, qualificados e consultas, sem somar o mesmo evento em visões diferentes.
