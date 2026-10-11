# Bruna — Sol 6.1 médio e conversa contextual

Publicado em 11/10/2026, 14:36:31 BRT. Commit funcional df5af166b0c61dcc49bba1b769721a45d4f36898; Netlify 6acbc8ea817d3600075f6270. API autenticada confirmou o deploy atual; domínio e URL imutável passaram nas sondas HTTP 200 e POST sem assinatura 401. As 14 funções e os cinco agendamentos foram preservados. A reconciliação documental do Drive é registrada em PUBLICACAO.json.

## Comportamento e consumo

Sol 6.1 médio é a escolha fixa nos três adaptadores de IA, sem override de modelo pelo ambiente. A redação contextual se restringe a cinco códigos educativos/institucionais confirmados, mantendo concordância de profissional/procedimento, números, URLs e gate final. Preço cirúrgico, agenda, convênio e pendências humanas preservam cópia e autorização. Respostas incompletas falham fechadas. Corrigida a detecção acentuada de indicação individual remota, sem nova política clínica.

Daniel autorizou API paga nesta publicação. O pedido de uso do plano ChatGPT depende de habilitação oficial e integração OAuth própria: não foi implementado nem simulado como ativo. Nenhuma credencial do Codex foi transferida. [Documentação oficial de Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source), [limitações](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) e [erros](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery). Não existe alternância automática de cobrança.

## Evidência e limites

1.982 testes locais: suíte integral 1.934, cinco arquivos adicionais 43, gate de build 5; 97 arquivos obrigatórios cobertos, 18 regressões novas. Os grupos de comandos sobrepostos não foram repetidos. Change/architecture/diff e build/check de 193 arquivos e 54 URLs passaram.

Cinco cenários reais no build confirmaram Sol 6.1 médio: consulta (7,6 s), lifting (5,7 s), urgência (3,9 s), classificação (3,4 s) e recusa de mensagens (2,1 s). Consulta e lifting usaram redação contextual; urgência impediu resposta automática e opt-out cancelou retomada. Modelo, tokens, latências, textos sintéticos e resultado de cada cenário estão no recibo. O teste usa a chave injetada no runtime Netlify, sem extrair o segredo pela API de configuração. O marcador de preflight foi removido no fechamento, evitando consumo em builds posteriores sem relação com este release.

Duas tentativas de build foram bloqueadas antes de publicar por erros nas fixtures: primeiro, prévia de consulta com CTA incompatível com o contrato; depois, contrato parcial normalizado como sem permissão de resposta. O teste agora importa o proprietário real do contrato. Os critérios e gates de produção não foram reduzidos. A versão anterior permaneceu ativa até os cinco cenários passarem.

Nenhum paciente recebeu mensagem de teste. Não houve alteração em CRM, LEADS, campanhas ou Apps Script; a v161 é a do registro canônico, sem nova inspeção autenticada desse destino. A primeira conversa natural após a publicação não foi observada. Cinco amostras não demonstram a qualidade global nem a distribuição de latência; consulta chegou perto do prazo existente de 8 segundos, ponto explícito do monitoramento. Health não prova entrega.

## Reversão e monitoramento

Rollback: commit c40e0f47b08d48e86ef0e2d50b237236a3e6046b, deploy 6ac2830ee4b0b50008ce8e5a; preservar Apps Script v161, filas, pausas e recibos, sem replay. Daniel/equipe: primeiras conversas, revisão em 13/10 e 18/10/2026; conter valor indevido, assunto perdido, duplicidade, interferência humana ou degradação de timeout. Nenhum agendamento automático criado. A cópia principal deve ser atualizada somente por fast-forward limpo, preservando trabalho paralelo.
