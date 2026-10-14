# Confirmação de modalidade — 14/10/2026

Estado: testado localmente; publicação ainda não executada.

Autorização específica recebida em 14/10/2026 às 17:51:29, America/Sao_Paulo: manter no manifest público o identificador da projeção privada do manual e seu hash, além do recibo técnico de arquivos, testes e controles em CHANGE-CANDIDATE. A autorização resolve a pendência anterior da revisão automática; não altera permissões nem publica conteúdo restrito. Os gates vigentes foram preservados. A publicação aguarda o preflight do commit exato e os controles hospedados.

Revisão documental autorizada: o envio anterior do plano integral ao repositório público foi bloqueado pela revisão automática. O responsável autorizou a retirada das informações internas. Foram preservadas cópias integrais fechadas em área restrita, sem permissão pública; plano público sem contatos, gastos ou identificadores de campanhas, e manuais com regras gerais preservadas e cronologia operacional detalhada removida. O histórico Git anterior não foi apagado. Nenhuma nova mudança no comportamento do código.

## Escopo e evidência

A revisão autorizada encontrou confirmação administrativa com endereço presencial após contexto remoto. Reprodução sintética comprovou que o detector aceitava modalidade presencial por omissão, inclusive no comprovante estruturado que sincronizava antes de conferir o contexto.

O proprietário appointment-confirmation.mjs agora veta o padrão presencial quando existe contexto remoto não resolvido e exige confirmação remota explícita. Informação em áudio só pode acrescentar veto; não autoriza data, hora, consentimento ou reserva. O webhook relê o contexto retornado pela memória durável antes da sincronização rápida do comprovante. O texto remoto informa horário de São Paulo e necessidade de confirmar acesso pela equipe, sem inventar link, endereço ou promessa de lembrete.

## Limites independentes

Nenhuma mensagem, convite, replay, flag, preço, campanha ou migração autorizada por este pacote. Identidades ambíguas continuam humanas. Dados operacionais e conversas permanecem exclusivamente nas fontes privadas. O status de reagendamento pendente não existe no dropdown atual: não substituir por remarcada, cancelada ou falta sem evidência. Anotação administrativa usa os campos existentes de próxima ação e resumo, sem reescrever recibos.

Integrações de alerta não fazem parte desta correção. Diagnósticos operacionais específicos permanecem nas fontes restritas.

## Testes e reversão

Metadados públicos: seis referências opcionais a pastas/documentos restritos foram retiradas do manifest. A busca de consumidores confirmou ausência de uso por código ou gates. A referência de projeção do manual exigida pelo gate de reconciliação foi preservada, assim como todos os testes e controles existentes. O recibo integral anterior permanece restrito.

Quatro regressões sintéticas falharam na base antes da implementação. Teste adicional cobre o caminho rápido do webhook. Passaram 58 focados, 2.170 integrais e a união de contratos de 1.572 testes (há sobreposição, não somar). Todos em America/Sao_Paulo: sete falhas anteriores dependiam do fuso UTC do host, reproduzidas no baseline, sem alteração de expectativas. O teste antigo de encerramento foi corrigido de 16 para os 19 cenários já exigidos pelo manifest publicado. Contrato, arquitetura, diff e build de 193 arquivos/54 URLs passaram. Os gates hospedados de modelo/áudio/histórico permanecem obrigatórios. Reversão: novo commit que reverta apenas este pacote, via integração Git, preservando dados, filas, recibos e Apps Script v164.

## Monitoramento

Daniel/equipe: primeira confirmação natural e 48h após publicação. Zero confirmação com modalidade conflitante, zero reserva duplicada, zero envio a paciente nesta tarefa. Encaminhamentos adicionais por ambiguidade são esperados e não equivalem a falha do transporte.
