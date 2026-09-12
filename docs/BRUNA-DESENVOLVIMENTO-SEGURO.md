# Desenvolvimento seguro da Bruna

**Status:** fluxo canônico para manutenção, crescimento e trabalho paralelo

**Objetivo:** permitir que a Bruna evolua em vários PCs e conversas sem misturar trabalho, ampliar arquivos críticos silenciosamente ou perder a capacidade de retornar ao estado anterior. Este fluxo protege o desenvolvimento; ele não altera respostas, preços, agenda, filas, flags ou mensagens.

## 1. Regra simples

> Uma conversa = uma tarefa = uma branch = uma worktree.

Uma worktree é uma pasta separada ligada ao mesmo histórico Git. Cada conversa trabalha em sua própria pasta e não compartilha arquivos em edição com outra. A branch canônica `reestruturacao-site` permanece somente como base e destino de integração revisada.

Nunca comece uma tarefa nova em uma pasta que já tenha alterações. Nunca entregue a mesma worktree a duas conversas. Nunca use `force-push` numa branch compartilhada.

## 2. Mapa de responsabilidade

O arquivo `ops/BRUNA-MODULE-MAP.json` é o inventário executável dos módulos mais sensíveis. Cada arquivo fonte tem um único módulo proprietário e cada módulo declara seus testes focados.

| Módulo | Responsabilidade principal | Arquivo proprietário |
|---|---|---|
| `whatsapp-intake` | entrada e orquestração do webhook | `netlify/functions/ycloud-webhook.mjs` |
| `conversation-policy` | política e planejamento de conversa | `netlify/functions/lib/whatsapp-automation.mjs` |
| `outbound-safety` | gate final e adaptadores de saída | `netlify/functions/lib/outbound-reply-gate.mjs` |
| `followups` | retomadas humanas e automáticas | `apps-script/clinica-liv-leads/Retomadas.gs` |
| `appointments` | agenda, confirmação e lembretes | `apps-script/clinica-liv-leads/ConsultasSync.gs` |
| `commercial-state` | lead, oportunidade e projeção comercial | `apps-script/clinica-liv-leads/OpportunityStore.gs` |
| `message-observability` | ledger técnico, entrega e custos | `netlify/functions/lib/ycloud-message-observability.mjs` |

O mapa não substitui `docs/ARQUITETURA-JORNADA-PACIENTE.md`. Ele transforma parte dessa arquitetura em verificações automáticas: dono único, arquivos e testes existentes, pureza das políticas, importações corretas e tetos de tamanho.

## 3. Abrir uma tarefa protegida

Na pasta de qualquer checkout atualizado do projeto:

```powershell
git fetch origin
npm run worktree:new -- nome-curto-da-tarefa
```

O comando cria uma branch `codex/...` e uma pasta exclusiva dentro de `tmp/`, sempre a partir de `origin/reestruturacao-site`. Ele mostra a nova pasta e o comando para enviar a branch ao repositório remoto.

Entre na nova pasta e, antes de editar, declare o módulo pretendido:

```powershell
npm run parallel:check -- --module followups
```

Troque `followups` pelo identificador da tabela. O check bloqueia quando outra worktree registrada ou uma branch remota recente toca o mesmo arquivo ou o mesmo módulo. Se a tarefa ainda não souber qual módulo mudará, faça primeiro uma análise somente leitura e execute o check assim que o escopo for identificado.

Depois de criar o primeiro commit seguro, envie a branch cedo:

```powershell
git push -u origin nome-exato-da-branch
```

Isso não publica a Bruna. Apenas torna o trabalho visível para outros PCs e conversas. Alterações não commitadas ou branches não enviadas de outro PC são invisíveis; por isso, nenhuma ferramenta consegue proteger trabalho remoto que ainda não chegou ao `origin`.

## 4. Editar sem criar um novo monólito

Para cada mudança:

1. identifique a decisão e seu arquivo proprietário;
2. escreva ou ajuste primeiro o teste de contrato;
3. altere somente o proprietário e o adaptador direto necessário;
4. mantenha rede, ambiente, planilha, fila e envio fora dos módulos puros;
5. se um arquivo protegido precisar crescer, extraia uma responsabilidade coesa para um módulo menor em vez de elevar o teto;
6. preserve reexportações legadas apenas para consumidores já conhecidos; código novo importa diretamente do proprietário;
7. registre todo arquivo alterado em `ops/CHANGE-CANDIDATE.json`.

Os limites atuais de linhas congelam o maior tamanho já existente. Eles são alarmes contra crescimento acidental, não metas de tamanho e nem prova de boa arquitetura. Reduzir um arquivo deve acontecer em passos pequenos, com equivalência comportamental demonstrada.

## 5. Validar antes de integrar

Execute, no mínimo:

```powershell
npm run parallel:check
npm run change:check
npm run bruna:guard
npm run architecture:check
npm test
npm run site:build
npm run site:check
git diff --check
```

Além da suíte integral, rode os testes focados mostrados por `npm run bruna:guard`. Revise o diff completo e adicione ao commit somente os arquivos declarados. O workflow `Bruna protected change` repete os gates em pull requests e na branch canônica.

O workflow versionado não configura sozinho a proteção da branch no GitHub. Torná-lo obrigatório antes de merge exige uma configuração externa separada do repositório, com autorização específica.

## 6. Integrar trabalho paralelo

Quando duas tarefas forem independentes, cada uma continua em sua branch. Antes de integrar a segunda:

1. atualize `origin/reestruturacao-site`;
2. reexecute `npm run parallel:check`;
3. reconcilie o baseline dentro da própria branch, sem sobrescrever a outra;
4. repita todos os gates;
5. integre um commit revisado por vez.

Um conflito Git resolvido não prova equivalência funcional. Se duas branches tocaram o mesmo módulo, a integração deve ser tratada como um novo candidato e testar o comportamento combinado.

## 7. Voltar com segurança

Há três níveis separados:

- **antes de integrar:** abandone a branch/worktree; a branch canônica e a produção não mudaram;
- **depois de integrar código:** crie um commit inverso com `git revert <commit-exato>` e repita os gates; não reescreva o histórico compartilhado;
- **depois de publicar:** restaure apenas o deployment ou versão registrado no recibo daquela publicação, com nova autorização e verificação.

Nunca reverta automaticamente dados operacionais junto com o código. Filas, mensagens, conversas, oportunidades, agenda e eventos legitimamente criados depois da publicação precisam ser preservados e reconciliados conforme seus próprios contratos.

## 8. Limites desta proteção

- ela detecta worktrees registradas no computador atual e branches `origin/codex/*` recentes;
- ela não enxerga arquivos soltos, trabalho não commitado de outro PC nem branch que nunca foi enviada;
- ela reduz colisões, mas não substitui revisão humana de regra clínica, preço, agenda, consentimento ou comunicação;
- nenhuma aprovação de pull request equivale a autorização para publicar, ativar flags, executar migração ou enviar mensagens reais.
