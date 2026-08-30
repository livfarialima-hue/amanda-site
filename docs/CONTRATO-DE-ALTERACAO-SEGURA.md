# Contrato de alteração segura

**Status:** fonte canônica do processo de mudança técnica

**Objetivo:** reduzir regressões e efeitos inesperados em site, bot, WhatsApp, Apps Script, LEADS, CRM, agenda e mídia, impedindo que um teste isolado seja tratado como prova suficiente de prontidão.

## 1. Regra principal

Uma mudança só pode avançar quando o comportamento alterado, todos os seus consumidores e o estado vivo relevante foram identificados. Passar no teste do arquivo proprietário não prova que o e-mail, a Central, o endpoint, a planilha ou a plataforma externa continuem coerentes.

Para cada decisão operacional deve existir:

1. um proprietário explícito;
2. uma lista de consumidores;
3. invariantes que não podem mudar;
4. teste do proprietário;
5. teste cruzado dos consumidores;
6. preflight vivo somente leitura;
7. rollback e monitoramento.

O registro desses contratos fica em `ops/IMPACT-REGISTRY.json`. O candidato atual fica em `ops/CHANGE-CANDIDATE.json`; ele é um recibo de escopo, não uma segunda fonte de regra de negócio.

## 2. Limite de mudança

- Preferir uma decisão comportamental por pacote.
- Não misturar correção de paciente, refatoração ampla, texto, tracking e campanha no mesmo release.
- Alteração que alcance mais de um sistema deve declarar todos eles; ausência de um consumidor bloqueia o candidato.
- Extração ou reorganização não pode ser misturada com mudança funcional sensível, salvo quando indispensável e provada separadamente.
- Dado vivo divergente não é corrigido por suposição: primeiro registrar a divergência, depois decidir a migração.

## 3. Sequência obrigatória

### Fase A — baseline e escopo

1. Trabalhar em worktree isolado a partir da produção observada.
2. Registrar o SHA completo em `baseCommit`.
3. Consultar sistemas vivos somente em leitura e anotar limitações.
4. Preencher `CHANGE-CANDIDATE.json` antes de tratar o trabalho como candidato.
5. Declarar arquivos, contratos, consumidores, invariantes, risco e sistemas externos.

### Fase B — desenho de falha

Antes de implementar, responder:

- qual é o efeito máximo de uma entrada incorreta;
- em que ponto a rotina deve falhar fechada;
- como impedir duplicidade;
- como distinguir `preparado`, `tentado`, `enviado`, `aceito` e `confirmado`;
- como reler o estado depois de timeout ou resposta ambígua;
- como retornar ao baseline.

Dados ausentes que afetam identidade, consentimento, destinatário, agenda, valor, procedimento ou origem bloqueiam o efeito automático e viram revisão humana. Não se inventa fallback apenas para manter a automação funcionando. Quando o efeito depende de um compromisso, a data digitada na planilha não substitui a releitura do registro operacional vivo: o vínculo, o objeto e o horário precisam coincidir antes da primeira escrita do efeito.

### Fase C — validação em camadas

Executar, nesta ordem:

1. teste focado do proprietário;
2. regressão do consumidor direto;
3. teste cruzado do contrato ponta a ponta;
4. `npm.cmd run change:check`;
5. `npm.cmd run architecture:check`;
6. `npm.cmd test`;
7. build/check do artefato aplicável;
8. `git diff --check` e revisão integral do diff.

`change:check` bloqueia arquivo não declarado, contrato ausente, consumidor sem cobertura, teste obrigatório não registrado e divergência entre planejadores conhecidos. A suíte integral executa uma regressão contra o candidato ativo; por isso, esquecer de atualizar o escopo também faz os testes falharem.

### Fase D — commit e autorização

1. Mudar o estado do candidato para `tested_local` somente depois de todos os gates locais passarem.
2. Commitar exatamente o escopo validado.
3. Não alterar produção para “terminar o teste”.
4. Obter autorização explícita para o commit candidato.
5. Executar o preflight vivo somente leitura e guardar horário e referência da evidência.
6. Executar `npm.cmd run release:preflight -- --approved-commit <SHA> --approved-at <ISO> --approved-by <pessoa> --approval-reference <referência> --live-preflight-at <ISO> --live-preflight-reference <referência>` em worktree limpo.

O preflight recebe a autorização no momento da execução e exige que ela aponte para o `HEAD` exato. A autorização não é escrita depois dentro do commit candidato, porque isso criaria um novo commit diferente daquele que foi aprovado. O preflight bloqueia autorização ausente, preflight vivo sem recibo, worktree sujo ou escopo diferente do candidato.

### Fase E — publicação coordenada

1. Validar IDs e destinos canônicos imediatamente antes da primeira escrita.
2. Publicar primeiro mecanismos default-off quando houver efeito para paciente ou dados.
3. Relêr o arquivo/versão/deploy publicado e comparar com o commit.
4. Ativar somente depois da equivalência e das sondas não destrutivas.
5. Manter local = commit aprovado = produção.

Publicar código, habilitar uma flag, executar migração e disparar uma rotina são autorizações diferentes quando produzem efeitos distintos.

### Fase F — pós-voo e monitoramento

1. Executar smoke tests sem criar mensagem, paciente, conversão ou compromisso artificial.
2. Comparar contagens e estados antes/depois.
3. Monitorar primeiro ciclo, 48 horas e a janela definida no candidato.
4. Reverter quando qualquer guardrail do recibo for atingido.
5. Atualizar plano executivo e documentação canônica.

## 4. Classes de risco

| Risco | Exemplos | Exigência mínima |
|---|---|---|
| baixo | documentação ou estilo sem efeito operacional | escopo exato, diff e teste aplicável |
| médio | site, tracking sem efeito clínico, relatório somente leitura | teste focado, consumidor, suíte e verificação pública |
| alto | mensagem, agenda, planilha, CRM, atribuição, migração | falha fechada, teste cruzado, preflight vivo, autorização e monitoramento |
| crítico | identidade, consentimento, dados pessoais, duplicidade, conversão financeira | pacote isolado, default-off, rollback ensaiado e revisão independente |

Na dúvida, usar a classe mais alta até existir evidência que permita reduzi-la.

## 5. Mudanças de emergência

Hotfix não elimina os gates. Ele reduz o escopo:

1. conter ou desligar o efeito;
2. preservar evidência;
3. corrigir uma causa por vez;
4. executar regressão do incidente e consumidores;
5. publicar com autorização;
6. realizar uma revisão posterior do processo.

Se não houver tempo para provar segurança, a ação correta é desativar ou encaminhar para humano, não publicar uma correção especulativa.

## 6. Critério de conclusão

Não declarar “resolvido” enquanto faltar qualquer um destes estados:

- escopo exato;
- contrato e consumidores cobertos;
- testes focados, cruzados e integrais;
- commit candidato;
- autorização específica;
- preflight vivo;
- publicação do commit aprovado;
- verificação de equivalência;
- monitoramento e rollback registrados.

Quando uma etapa não puder ser executada, o estado correto é `pendente` ou `bloqueado`, nunca “pronto”.
