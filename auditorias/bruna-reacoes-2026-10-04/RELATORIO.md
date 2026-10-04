# Reação confundida com material — 04/10/2026

Estado: em implementação local.

A leitura restrita da LEADS confirmou reação tipada após encerramento humano e um recibo tardio de material vinculado à mesma reação. A entrada não excluía reações; a fila aceitava o evento não textual; o recibo tratava qualquer não texto como material.

Correção: proprietário puro para tipo de evento, descarte antes de efeitos na entrada, proteção no planejador e na fila, conclusão silenciosa de jobs legados sem trocar posse humana e recibo restrito a tipos reais de mídia. Perguntas e anexos reais mantêm os fluxos existentes. Evidências sintéticas, publicação e projeções ainda pendentes. Nenhum dado identificável, mensagem real, replay ou alteração manual de paciente neste pacote.

## Validação local

1.900 testes integrais, 16 novos casos e 48 comandos do contrato aprovados; arquitetura, build de 193 arquivos/54 URLs, verificação técnica e diff aprovados. Dez falhas sintéticas reproduziam o baseline; as duas negativas de assinatura e urgência já passavam. Cobertura inclui webhook assinado, reentrega, remoção de reação, fila existente, posse humana, corrida com intervenção, anexo real, tipo desconhecido e texto com sintoma urgente. Jobs antigos encerram sem envio ou alerta e sem liberar o atendimento humano; falha de conclusão não declara limpeza bem-sucedida.

As projeções existentes no Drive coincidem com o baseline por leitura integral e SHA-256. Não houve mudança comercial, clínica, Apps Script ou teste real com paciente. Repositório e produção permanecem em SYNC_PENDING até recibos externos completos.
