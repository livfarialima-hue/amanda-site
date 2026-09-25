# Bruna — contexto indisponível, 25/09/2026

Candidato testado localmente, ainda não publicado. Daniel solicitou: “Ajuste e publique corrigindo esse mal comportamento”. A autorização cobre esta correção e sua publicação após validação.

## Evidência e causa

Leitura autenticada na YCloud e cruzamento com o LEADS canônico em 25/09/2026: a mensagem inicial exibida no aplicativo chegou à integração como `unsupported`, erro `131060` (mensagem indisponível), sem texto nem referral. O registro durável conservou a entrada sem texto. A continuação “E o preço” recebeu uma suposição indevida de “cirurgia facial”. Os retries do primeiro evento ainda mostravam timeout. Nenhum nome, telefone, identificador de paciente, payload bruto ou URL temporária foi incorporado a este registro.

O controlador não tem como recuperar a frase ou a referência que a Meta não entregou. A correção trata essa ausência de modo transparente e elimina a presunção facial; não afirma corrigir o erro upstream 131060.

## Alteração

- O adaptador durável e a memória preservam um marcador específico para texto vazio/unsupported. Mídias mantêm sua representação própria; o marcador não conta como pergunta substantiva em uma sequência de mensagens.
- Se o pedido de preço não tem procedimento, a resposta é neutra. Havendo uma mensagem indisponível ainda sem resposta, explica: “Sua mensagem anterior não apareceu completa por aqui. Pode reenviar só o nome do procedimento?”.
- Histórico com procedimento explícito segue os contratos existentes. Lifting cervical não vira lifting facial nem recebe preço no primeiro pedido.
- Entradas vazias/unsupported passam pela mesma fila durável existente quando a flag de background está ativa. O worker confirma o registro com o orçamento já aprovado e continua respeitando takeover, evento mais recente e envio único.

Preços, regras clínicas, campanhas, referências, templates, Apps Script v160 e flags preservados. Sem replay, mensagem real de teste, edição de dados de pacientes ou novas programações.

## Validação

Os novos testes reproduziram falhas no código anterior. Depois da correção: **1.669/1.669 testes integrais**, **99/99 testes focados** e todos os grupos obrigatórios de consumidores aprovados. Contrato de alteração, arquitetura, diff, build e verificação técnica do site aprovados. Os testes cruzados passam pelo controlador real com rede simulada: mensagem indisponível seguida de preço, procedimento cervical disponível no histórico, takeover humano e worker de unsupported com confirmação lenta do LEADS. Não houve envio externo nos testes.

Preflight vivo: Netlify publicou o baseline funcional `64a289a0bb2ffc4c1fea57b160f2bb1be353a25a`, deploy `6ab5c206aaaf04e7e71dd958`; saúde active/durable_background_intake e assinatura ativa. Origin permanece em `91504821af4251d2e5e9c06b1b082eafa98c0044`. A projeção existente do Plano no Drive corresponde ao baseline local, SHA-256 `cfac02ae3c0b6e46dd2c88ac6328c505c85f7eceb383bd80bf0cb0d03ec5b402`.

## Publicação e acompanhamento

O recibo `PUBLICACAO.json` deve registrar commit funcional, deploy, sondas e atualização da mesma projeção do Plano. Até lá, estado local testado e `SYNC_PENDING`. Confirmar primeiras conversas elegíveis e revisar em 48 horas após publicação com Daniel/equipe LIV. Não confundir publicação e testes simulados com resposta entregue a uma paciente.

Rollback: restaurar Netlify `6ab5c206aaaf04e7e71dd958` / commit `64a289a0bb2ffc4c1fea57b160f2bb1be353a25a`, mantendo fila, histórico e pausas. Reverter se surgir procedimento/preço inventado, duplicidade, quebra de takeover ou regressão da fila. A pendência anterior da validação “Falha — revisar” e a falha do alerta interno WhatsApp permanecem fora deste pacote.
