# Falha de entrada e recuperação da Bruna — 14/09/2026

A mensagem chegou à LEADS. A primeira resposta encontrou timeouts na integração com a planilha; a recuperação posterior encontrou timeout no modelo. Um defeito na versão instalada de Netlify Blobs tornava incondicionais as gravações JSON usadas para reservar e reagendar o trabalho. Assim, a repetição do evento podia zerar tentativas, adiar a fila e apagar a reserva do trabalhador. O job ainda registrava “rescheduled” mesmo quando a função de gravação retornava superseded.

A planilha registra resposta com origem equipe_humana às 12h27 BRT. O registro durável foi concluído com human_takeover às 12h29min57s. O caso não será reenviado. A correlação do log anonimizado usa horário e atributos operacionais; a consulta do registro persistido usou a chave exata do evento. Identificadores, telefone e transcrição ficam fora deste relatório.

## Correção e prova

- Netlify Blobs fixado em 10.7.12, primeira correção compatível na mesma linha. Lockfile preserva dependências não necessárias ao patch.
- O job confere o resultado do reagendamento, tanto após falha de processamento quanto após falha de alerta. Erro, reserva perdida e operação ignorada aparecem como tais.
- Testes com o SDK real e transporte HTTP sintético verificam If-None-Match, If-Match, disputa por uma versão, repetição do evento durante uma reserva, reentrada da recuperação, timeout, reagendamento, reserva antiga e conclusão por atendimento humano.
- Os três testes do transporte falharam na versão 10.7.10 e passaram com 10.7.12. Os testes anteriores simulavam a própria API de armazenamento e não exercitavam os headers do SDK.
- 1.535/1.535 testes integrais; 41/41 focados; 158/158 dos consumidores; arquitetura e contrato aprovados; build com 193 arquivos e 54 rotas. Netlify contabiliza 192 arquivos estáticos; o build local também conta seu arquivo de controle.

O [patch oficial Netlify 731](https://github.com/netlify/primitives/pull/731) e o [changelog](https://github.com/netlify/primitives/blob/main/packages/blobs/CHANGELOG.md) sustentam a causa técnica, reproduzida também localmente. A [API oficial](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) define as condições de escrita. Há uma questão upstream separada sobre falhas HTTP não 412; não foi observada neste incidente e não é tratada como causa comprovada.

## Escopo e segurança

Os 13 módulos que importam Blobs estão no contrato de impacto; a suíte integral cobre também os endpoints, gates de saída, atribuição, lembretes e atendimento humano. Não há mudança em preços, identidade, consentimento, classificador, campanha, Calendar ou Apps Script v153. O manifesto continua apontando a produção anterior até existir recibo da nova publicação.

Será publicado primeiro com efeito automático desligado, verificado no domínio e URL imutável, e só então ativado com o mesmo SHA. O probe de armazenamento usa exclusivamente uma chave técnica aleatória fora do prefixo pending e apaga essa mesma chave após a leitura; nenhum webhook real é reproduzido.

Rollback: restaurar Netlify 6aa7e218d56b0f48420dcd98, código bef9c1e1e4ef49e6bd604688adddebc1be69eb02, preservando dados e mensagens. Se for necessário voltar à biblioteca defeituosa, manter a automação contida. Monitoramento: primeiro ciclo natural, 48 horas e 7 dias, com foco em jobs presos, timeouts, exclusividade, duplicidade e takeover. Qualquer duplicidade ou violação de atendimento humano exige contenção.

Estado: testado localmente, aguardando recibo de publicação. A correção restaura a recuperação; não elimina a possibilidade de indisponibilidade dos serviços externos. O atendimento já ocorrido neste caso não prova uma resposta automática da nova versão.

## Segunda causa encontrada no primeiro ciclo

O SDK corrigido foi publicado e ativado às 12h52 BRT. O probe técnico confirmou as condições no armazenamento real. A conferência da fila às 12h55 mostrou três jobs reservados que continuaram processing depois do ciclo; os relatórios anteriores registram repetidamente Duration: 30000 ms. A [documentação oficial de Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/) confirma o teto de 30 segundos e recomenda background para trabalho longo. O novo endpoint segue o padrão de background já usado pelo classificador, com execução de até 15 minutos, conforme a [documentação de Background Functions](https://docs.netlify.com/build/functions/background-functions/).

O agendamento agora apenas despacha com segredo e timeout de 5 segundos. O background revalida modo ativo e segredo antes de tocar a fila. O batch reserva um trabalho por vez, inicia novos trabalhos somente nos primeiros dez minutos e usa reserva de 16 minutos para impedir sobreposição enquanto a invocação anterior ainda pode estar viva. Uma resposta 202 confirma aceitação do despacho, não processamento nem mensagem enviada.

Mensagens com 24 horas ou mais, horário ausente/futuro ou mais de três tentativas seguem para revisão humana sem replay. A idade usa a mensagem original, evitando que createdAt reiniciado no SDK antigo pareça uma entrada nova. Nessas situações o alerta traz SEM SUGESTÃO PRONTA. Conclusão e reagendamento só são relatados como sucesso após confirmação da escrita. Nenhuma pendência antiga foi apagada ou reexecutada manualmente.

Uma regressão adicional falhou no scheduler antigo. Os testes cobrem handoff, autenticação, off/shadow, erro de despacho, espera pelo trabalho, execução simulada de 70 segundos, orçamento do batch, lease maior que a vida do background e veto de replay antigo/excessivo. O pacote final adiciona uma função (13 no total) e preserva as cinco programações. Rollback preferido agora: commit fd8b7a78c245fff3a1180e636db1d730bd6fa132 / Netlify 6aa8180f6bc83b386142c5fc, com SDK corrigido, sem alterar dados.
