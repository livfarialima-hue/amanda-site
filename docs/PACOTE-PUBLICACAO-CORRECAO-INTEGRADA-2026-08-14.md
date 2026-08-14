# Pacote de publicação da correção integrada — 14 de agosto de 2026

**Situação:** Apps Script publicado na versão 76; demais componentes e migrações ainda não publicados

Este manifesto separa o que está no repositório do que ainda depende de autorização e validação ao vivo.

## Commits que compõem o pacote

| Commit | Conteúdo |
|---|---|
| `f0ef62a` | gates estratégicos e contrato da correção |
| `60d9cc6` | identidade por oportunidade, fase canônica e consulta |
| `a8021e4` | reparos reversíveis, funil canônico, Google e atribuição Meta Site |
| `ec30d47` | bot fail-closed, eventos operacionais, SLA, filas, marcos e saúde sintética |
| `f5ffe76` | correções técnicas do site sem alteração de lifting facial |
| `0cba7a7` | executor agregado das simulações somente leitura |
| `6b9e676` | nove executores de diagnóstico para evitar o limite de tempo |
| `fe7cd27` | auditoria indexada, rápida e sem reparo implícito de cabeçalhos em `apply: false` |

O commit que contém este manifesto apenas fecha documentação e QA; ele também deve fazer parte do mesmo pacote aprovado.

## Componentes publicáveis

### Apps Script

**Publicado:** versão 76 em 14/08/2026; endpoint validado com HTTP 200 e `ok: true`. As simulações foram concluídas sem `apply: true`.

- identidade e fase canônicas;
- deduplicação arquivável/restaurável;
- reconciliações históricas e fonte `_FUNIL_CANONICO`;
- ledger/importação do Google Ads;
- persistência completa de `M26F02S`;
- eventos operacionais e auditoria de SLA;
- reaper e fila de exceções;
- marcos comerciais tipados;
- teste sintético sem dados de paciente.

### Netlify

- webhook que só responde automaticamente após rota única confirmada;
- remoção do fallback legado que autorizava resposta sem confirmação da planilha;
- registro dos eventos de resposta e handoff;
- execução diária do teste sintético de integração.

### Site estático

- dimensões explícitas de imagens;
- poster de vídeo nas páginas de otoplastia;
- diretiva explícita de GPTBot;
- teste de regressão técnica.

`/lifting-facial/` está excluída do lote e deve permanecer byte a byte sem alteração atribuível a este pacote.

### Planilha e Calendar — migração separada e ainda não autorizada

As funções estão prontas, mas não foram executadas com `apply: true`. A publicação do código não autoriza deduplicação, backfill, fórmulas, criação/remoção de eventos ou alteração de painéis. A execução segue o runbook e exige autorização específica.

### Plataformas de mídia — verificação separada

Não há neste pacote mudança de orçamento, palavra-chave, negativa, lance, público, criativo ou campanha. Google Ads requer verificação de aceite das conversões; Meta Site requer prova de rastreabilidade antes de qualquer teste de verba.

## QA concluído

- `npm.cmd test`: **506/506 aprovados** no estado final documentado.
- `git diff --check`: aprovado.
- `git diff --name-only -- lifting-facial`: vazio.
- fluxos ambíguos ou sem rota: silenciosos para o paciente e encaminhados à revisão;
- eventos novos de auditoria: sem texto de conversa, nome, telefone ou dado clínico;
- teste sintético: sem payload de paciente ou WhatsApp.

## Ordem de publicação quando autorizada

1. registrar versões e backups — **concluído**;
2. publicar Apps Script — **concluído na versão 76**;
3. executar e revisar todas as simulações — **concluído; lote integral reprovado antes de escrita**;
4. executar somente as migrações expressamente autorizadas;
5. reconciliar fórmulas célula a célula;
6. publicar Netlify e validar rotas/handoffs;
7. publicar o lote técnico do site e comprovar lifting intacto;
8. verificar Google Ads, Meta, Calendar, bot e painéis pelos gates do runbook.

## Limite da próxima autorização

A autorização deve declarar uma destas opções ou um subconjunto explícito: publicar Apps Script; executar migração de dados; alterar fórmulas; publicar Netlify; publicar site; importar conversões no Google; iniciar teste pago de Meta Site. Sem essa declaração, a ação permanece local.
