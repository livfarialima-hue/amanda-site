# Autonomia contextual da Bruna

Estado: testada localmente; publicação pendente de autenticação Google/Netlify. Autorização: “Faça essas alterações então e publique.” Baseline do checkout: `8a6bcc6b9105aba10810775b680a3950c2ed3443`; produção pública observada: `590121d96c02bbfbb5bb01c53b30ab83a6a658b8`, Netlify `6acbd59e31a918000966a0af`. Apps Script v161 consta no registro local; esta tarefa ainda não pôde confirmar a versão autenticada.

## Comportamento implementado

- A IA pode adaptar fatos de respostas aprovadas ao contexto. Literais numéricos e links precisam coincidir com a fonte; significado e condições seguem as instruções semânticas e o gate final. Isso não equivale a uma prova automática de equivalência de toda redação, e os cenários de inferência real continuam exigidos antes da publicação.
- A busca fornece ao modelo até 40 regras vigentes, incluindo regras sem palavras em comum com a pergunta. O modelo escolhe por significado; equivalências administrativas ajudam a ordenação. Fonte, versão, validade e indicação de truncamento acompanham a resposta do serviço. Não há embeddings nem treinamento dos pesos do modelo.
- A preparação para a consulta usa o conteúdo já publicado: informações de saúde, medicamentos, cirurgias anteriores, exames existentes e dúvidas. Não solicita novos exames nem orienta suspensão de medicamentos.
- Uma pendência clínica não bloqueia uma pergunta administrativa isolada sobre endereço, nota fiscal ou atendimento particular da Amanda. O processador espera pelo menos dez minutos desde a entrada, exige confirmação semântica e relê atividade, preferência e relacionamento antes do envio. A pendência continua `waiting_human`. Pergunta clínica, composta, profissional diferente, preferência pela equipe e pausa não recebem essa autorização.
- O aprendizado corrige o envelope `answer`/`learning` incompatível. Uma inferência limitada extrai somente proposta administrativa geral de baixo risco e identifica propostas equivalentes já existentes. O Apps Script confere o Event ID original, remove da biblioteca a dependência da resposta individual, rejeita identificadores/nomes conhecidos e consolida fatos idênticos sem alterar conteúdo aprovado. A resposta original continua apenas na dúvida operacional. Propostas ficam `Revisar`, nunca aprovadas por repetição.
- O menu **Central LIV → Aprovar resposta selecionada da Bruna** mostra conteúdo, modo, risco, validade e limites para uma única revisão. Depois da confirmação, a linha é relida sob trava; mudanças concorrentes ou seleção inválida impedem a promoção. O novo snapshot conserva as regras ativas. Os dois canais de resposta registram os IDs usados somente após envio confirmado. Uma correção explícita posterior suspende a regra até revisão, sem substituir o fato geral pela resposta individual.
- Em perguntas mistas, a resposta parcial utiliza exclusivamente fatos aprovados de baixo risco citados pelo modelo e mantém o encaminhamento da dúvida restante. O alerta precisa ter recibo antes do envio. O contexto da equipe distingue informação disponível para envio de informação já entregue.
- Excesso de perguntas, links ou CTA e formato de menu podem consumir uma única revisão dentro do prazo original de inferência. Não há novo ciclo, prazo reiniciado ou autorização de envio. Promessa clínica, diagnóstico, agenda e preço sem base continuam bloqueados pelo validador canônico.

## Falhas e limites

Fonte não encontrada, contexto desatualizado, leitura indisponível, risco ou veto semântico conservam revisão humana. Sem chave/inferência válida, nenhuma proposta geral é aprovada automaticamente. A seleção de conhecimento é limitada a 40 fatos; bibliotecas maiores indicam truncamento, e a ordenação pode exigir expansão futura. A consolidação consulta até 20 propostas gerais; fatos diferentes ou identificadores desconhecidos não se fundem. Ganho de autonomia e qualidade em conversas reais ainda não foi medido.

Nenhum schema de planilha, trigger, cadência, valor de consulta, faixa cirúrgica, modelo ou credencial de produção foi alterado. Nenhuma mensagem real, replay, promoção de conhecimento ou migração foi executada durante o desenvolvimento.

## Validação

Os testes usam dados sintéticos e interceptam rede e transporte. Cobrem redação e literais, recuperação sem sobreposição lexical, validade/status, consolidação, isolamento de casos individuais, identidade da dúvida, promoção sem escrita parcial, ajuda administrativa com pendência clínica, mensagem humana/paciente concorrente, opt-out, espera mínima, resposta parcial e revisão de estilo. Passaram 1.984 testes na suíte integral e 44 testes adicionais exigidos pelos contratos (2.028 distintos), incluindo os seis testes do gate de modelo. O último ajuste também verifica que uma correção suspende conhecimento usado numa resposta parcial mesmo com outra dúvida ainda pendente. Execução com `TZ=America/Sao_Paulo`.

O preflight hospedado foi ampliado de nove para doze cenários sintéticos, incluindo busca semântica, endereço durante cuidado humano e preparação para consulta. Seu teste local valida o próprio gate com respostas simuladas; as doze chamadas à API real ainda precisam ocorrer no build de produção autorizado. `pendingRelease.liveModelCheckRequired=true` mantém essa exigência. Não confundir testes simulados com qualidade de inferência já verificada em produção.

Gates locais: `change:check` (28 arquivos exatos), `architecture:check`, `git diff --check`, `site:build` e `site:check` aprovados. O artefato contém 193 arquivos e 54 URLs, sem auditorias ou arquivos operacionais. `ops:check` retorna `SYNC_PENDING`, como esperado para uma candidata ainda não publicada: faltam recibos externos e a projeção do manual no Drive; o trabalho está em branch isolada. Os testes adicionais correspondem aos arquivos requeridos que não são coletados por `scripts/run-tests.mjs`; os demais contratos foram exercitados pela suíte integral, sem contagem duplicada.

## Publicação e verificação

1. Reabrir o candidato e reler Git remoto, Netlify autenticado, Apps Script, schema LEADS e IDs canônicos. O health público confirma atividade/configuração, não sincronização de dados ou acesso de escrita.
2. Validar os três IDs com `npm run apps-script:verify-target`; verificar equivalência dos arquivos vivos com o baseline. Não sobrescrever trabalho paralelo.
3. Após gates locais e commit exato, executar `release:preflight` com o recibo da autorização desta conversa e o preflight vivo autenticado.
4. Publicar `KnowledgeBase.gs` e `CentralAtendimento.gs` no projeto/deployment canônicos, preservando os demais arquivos e sem executar rotinas operacionais. Registrar versão e releitura dos arquivos. Sem migração de cabeçalhos.
5. Publicar o mesmo commit Netlify pela integração existente. O build deve aprovar os doze cenários reais antes de disponibilizar a versão.
6. Verificar commit/deploy, health 200, rejeição sem assinatura, funções e agendamentos; nenhuma conversa de teste real. Atualizar target/manual/manifesto/candidato com recibos exatos e substituir as projeções existentes no Drive.

Requisitos de autenticação foram salvos nos campos seguros do ambiente: `NETLIFY_AUTH_TOKEN` para a API Netlify e `GOOGLE_OAUTH_ACCESS_TOKEN` para Apps Script, Sheets e Drive. O token Google precisa pertencer à conta autorizada e ter escopos adequados para projeto, deployment e projeções; dados secretos não devem entrar no chat, arquivos ou commits. O GitHub já está autenticado.

## Monitoramento e rollback

Daniel/equipe: primeiras conversas naturais, 48 horas e sete dias a partir da publicação efetiva. Medir resolução sem intervenção, perguntas realmente respondidas, revisões evitáveis, repetição, propostas/aprovações/correções e interferência humana. Contagens precisam vir dos registros operacionais; não se afirma melhora antes de observar.

Conter a mudança diante de informação inventada, identificação pessoal em conhecimento geral, urgência perdida, sobreposição humana, duplicidade ou piora persistente de latência. Rollback: Netlify `6acbd59e31a918000966a0af` e Apps Script v161 no mesmo deployment, preservando dados, filas, pausas, recibos e conhecimento legitimamente aprovado; sem replay. A publicação completa e a sincronização do Drive continuam pendentes até os recibos autenticados existirem.
