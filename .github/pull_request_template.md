## Mudança

- [ ] Esta conversa usa uma branch e uma worktree exclusivas.
- [ ] A branch nasceu da versão canônica atual após `git fetch origin`.
- [ ] O módulo protegido foi declarado e `npm run parallel:check -- --module <id>` passou antes da primeira edição.
- [ ] A branch foi enviada cedo ao `origin` para ficar visível nos outros PCs.

## Comportamento e arquitetura

- [ ] O proprietário da decisão foi identificado em `ops/BRUNA-MODULE-MAP.json`.
- [ ] Esta mudança preserva o comportamento atual, ou a alteração funcional está descrita e autorizada separadamente.
- [ ] Nenhuma política pura ganhou acesso a rede, ambiente, planilha, fila ou envio.
- [ ] Arquivos grandes não cresceram; uma responsabilidade foi extraída quando necessário.
- [ ] Não houve edição direta da branch canônica nem `force-push`.

## Evidência

- [ ] `ops/CHANGE-CANDIDATE.json` contém baseline completo, escopo exato e rollback.
- [ ] Testes focados do módulo passaram.
- [ ] `npm run change:check` passou.
- [ ] `npm run bruna:guard` passou.
- [ ] `npm run architecture:check` passou.
- [ ] `npm test` passou.
- [ ] Build e validação aplicáveis passaram.
- [ ] O diff inteiro foi revisado e não contém dados pessoais ou segredos.

## Publicação

- [ ] Este pull request não é autorização para publicar, ativar flags, executar migrações ou enviar mensagens.
- [ ] Qualquer escrita externa terá autorização explícita para o commit exato e recibos próprios.
