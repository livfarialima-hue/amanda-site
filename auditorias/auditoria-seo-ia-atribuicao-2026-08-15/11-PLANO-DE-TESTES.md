# Plano de testes de atribuição e integração

Data de elaboração: 15/08/2026
Fuso de referência: America/Sao_Paulo
Estado: plano somente leitura; nenhum lead, mensagem, conversão ou evento foi criado em produção.

## Regra de execução

Os testes devem usar um ambiente isolado ou números e oportunidades sintéticos claramente marcados. Só podem chegar à produção depois de autorização específica, com captura do estado anterior, expurgo seguro dos dados sintéticos e confirmação de que não há envio de informação clínica ou identificador pessoal a terceiros. “Preparado”, “enviado”, “aceito”, “atribuído” e “deduplicado” são estados distintos.

O identificador de correlação do teste deve ser opaco. Não usar telefone, fragmento de telefone, e-mail, nome, `wamid` reversível nem conteúdo da mensagem no ID. Quando um teste exigir um click ID real, ele deve ser mantido apenas nos campos destinados a esse identificador, nunca reutilizado como transaction ID.

## Critério global de aceite

Um cenário passa somente se a mesma evidência reconciliável mostrar, quando aplicável:

- origem inicial;
- origem da conversa atual;
- caminho de conversão;
- campanha, conjunto/grupo, anúncio e criativo quando fornecidos;
- landing page e página do CTA;
- primeiro e último toque em campos separados;
- código e click ID preservados sem exposição indevida;
- registro coerente em LEADS e CRM;
- confiança e motivo de fallback explícitos;
- uma única oportunidade e um único efeito para um webhook duplicado.

## Matriz dos 25 cenários

| # | Cenário e entrada | Resultado esperado | Estado observado na auditoria | Parâmetros preservados/perdidos hoje | LEADS e CRM esperados | Confiança / ponto provável de perda | Correção necessária antes do aceite |
|---:|---|---|---|---|---|---|---|
| 1 | Meta → WhatsApp direto, com código M26 válido e hierarquia completa | Classificar `Meta Ads — WhatsApp direto`; preservar campanha, conjunto, anúncio e criativo | O parser reconhece M26; há contatos estruturados de WhatsApp direto. A completude da hierarquia real do anúncio não foi comprovada | Código e, em alguns casos, criativo; conjunto/anúncio dependem do payload/mapeamento | Mesma origem inicial e campanha nos dois sistemas | Média; mapa de anúncios é parcial | Versão canônica dos parâmetros Meta e teste live controlado autorizado |
| 2 | Meta → site → WhatsApp na mesma página | Classificar `Meta Ads — passagem pelo site`; manter landing e CTA | Contrato local cobre M26F02S na sessão; não existe demonstração real reconciliada | Preserva `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `origem`; não preserva hierarquia completa, landing ou timestamps | LEADS e CRM iguais, com caminho `site → WhatsApp` | Baixa para produção; transporte atual depende de mensagem legível | Implementar contrato completo e executar sonda ponta a ponta |
| 3 | Meta → site → outra página → WhatsApp | Manter primeiro acesso Meta e registrar landing e página final do CTA separadamente | Mesmo `sessionStorage` tende a preservar o conjunto reduzido na mesma aba | Mesmos cinco UTMs/código; perde landing original e registra apenas código da página final na referência | First touch Meta; CTA na segunda página; caminho explícito | Média no navegador, baixa E2E | Campos próprios de landing/CTA e teste multi-rota |
| 4 | Meta → site → retorno posterior → WhatsApp | Preservar first touch dentro de TTL aprovado sem converter retorno em direto | Não comprovado; armazenamento ativo é apenas de sessão | Perde ao fechar sessão/abrir retorno; caminho anterior desaparece | First touch Meta, conversa atual direta, confiança e TTL | Alta confiança na lacuna | Token seguro persistente ou resolução server-side com TTL e política de consentimento |
| 5 | Consentimento aceito | Carregar tags autorizadas e preservar atribuição operacional mínima conforme aviso | Testes locais cobrem aceite; prova live completa é N/D | UTMs e click IDs operacionais são montados; tags são liberadas após aceite | Consentimento e fonte em campos distintos | Média | Sonda de rede e comparação documentação ↔ comportamento |
| 6 | Consentimento recusado | Não carregar tags não essenciais; preservar apenas o mínimo legítimo e declarado | Código bloqueia tags; click ID pode seguir no texto do WhatsApp | Identificadores de clique podem sair na mensagem mesmo sem cookies | Motivo e base do fallback explícitos; nenhuma falsa medição de tag | Média; risco de privacidade no transporte | Revisão de necessidade/proporcionalidade e opção de token opaco |
| 7 | Parâmetros incompletos | Não inventar dimensões; registrar Meta/Google com `detalhes incompletos` ou N/D | Há fallbacks, mas taxonomia é agregada | Campos presentes ficam; ausentes não têm motivo granular | Confiança baixa e lista de ausências | Média | Validador por campo e enum de motivo de perda |
| 8 | Código inválido | Não atribuir a campanha válida; quarentenar e registrar motivo | Parsers rejeitam alguns formatos; cobertura de aliases não é completa | Pode cair em SITE/WhatsApp/não identificada | `origem desconhecida` ou `código inválido`, sem adivinhar | Média | Registro de erro, catálogo versionado e alerta sem PII |
| 9 | Link encaminhado a outra pessoa | Não atribuir silenciosamente o receptor à jornada do remetente | Não há prova de defesa específica | UTMs/código podem viajar no link e gerar falsa atribuição | Confiança reduzida e caminho `link compartilhado` quando detectável | Baixa | Token de uso limitado, sinais de expiração e regra de confiança |
| 10 | Google Ads com GCLID | Preservar GCLID até a oportunidade e preparar um evento qualificado deduplicado | Testes locais passam; staging tem eventos `ready`; aceite externo é N/D | GCLID é preservado na sessão e na mensagem; outros ValueTrack se perdem | GCLID em campo próprio, G26 canônico, estados de upload separados | Média | Roteiro live, recibos por linha e nenhum ID pessoal no transaction ID |
| 11 | Google Ads com GBRAID | Mesmo contrato do GCLID, respeitando elegibilidade/plataforma | Parser e schema existem; sonda real N/D | GBRAID preservado; demais dimensões parciais | GBRAID em campo exclusivo; nunca preencher GCLID por inferência | Baixa-média | Teste controlado e validação de importação suportada |
| 12 | Google Ads com WBRAID | Mesmo contrato do GCLID, respeitando elegibilidade/plataforma | Parser e schema existem; sonda real N/D | WBRAID preservado; demais dimensões parciais | WBRAID em campo exclusivo | Baixa-média | Teste controlado e validação de importação suportada |
| 13 | Google orgânico | Classificar `Google orgânico`, landing/referrer e caminho | Taxonomia atual agrega em `Orgânico/Conteúdo` | Referrer e mecanismo não são materializados | Origem Google orgânico nos dois sistemas | Alta confiança na lacuna | Normalizar referrer confiável e manter confiança/fallback |
| 14 | Bing orgânico | Classificar `Bing orgânico` | Não distinguido hoje | Referrer não materializado | Origem Bing orgânico | Alta confiança na lacuna | Mesma camada de referrer do teste 13 |
| 15 | ChatGPT com referrer ou UTM explícita | Classificar ChatGPT apenas com evidência | Não há taxonomia/captura dedicada | Referrer e UTMs além do subconjunto atual podem se perder | Fonte ChatGPT, método da evidência e confiança | Alta confiança na lacuna | Lista versionada de referências/UTMs sem inferir ausência como direto |
| 16 | Copilot, Perplexity e Gemini quando identificáveis | Diferenciar cada fonte com evidência técnica ou informação explícita | Não distinguido hoje | Referrer não materializado; user-agent não é evidência de aquisição na planilha | Fonte específica ou N/D | Alta confiança na lacuna | Regras separadas e conservadoras; monitorar mudanças dos provedores |
| 17 | Acesso direto | Classificar `acesso direto` apenas após checar evidências disponíveis | SITE pode cair em `Orgânico/Conteúdo`; ausência de referrer não prova direto | Sem first touch persistente, retorno pode parecer direto | Canal direto com confiança e motivo | Alta confiança na lacuna | Last non-direct, first touch e campo de origem informada separados |
| 18 | Múltiplas campanhas antes do contato | Preservar first touch e last touch sem sobrescrever; guardar caminho | Modelo atual privilegia plataforma por ranking Google > Meta > orgânico > WhatsApp | Um canal de maior prioridade pode substituir a representação visível | Ambos os toques e regra de atribuição declarada | Alta | Schema de eventos imutáveis e projeções derivadas |
| 19 | Múltiplas abas do navegador | Compartilhar ou reconciliar estado de forma segura dentro do TTL | `sessionStorage` é por aba; comportamento não coberto | Segunda aba pode perder atribuição | Um caminho coerente, sem duplicar oportunidade | Alta | Teste BroadcastChannel/storage seguro ou resolução server-side |
| 20 | Paciente antigo retorna | Não sobrescrever origem inicial; registrar origem da nova conversa | CRM congela uma referência inicial, mas a aba visível pode receber plataforma de maior prioridade | Histórico rico de toques não existe | Oportunidade/relacionamento preservados; novo toque separado | Alta | Ledger de touchpoints e regra de oportunidade/retorno |
| 21 | Webhook duplicado | Uma única mensagem/evento lógico e uma única consequência | Há testes de idempotência locais; prova de produção por cenário é N/D | Provider ID é usado, com risco se exposto em logs/IDs externos | Mesma oportunidade; contador de duplicata auditável | Média | Teste em sandbox e correlation ID opaco nos logs |
| 22 | Usuário edita ou remove o código da mensagem | Recuperar por token/payload confiável ou cair em baixa confiança sem inventar | Transporte depende do texto e de mapeamento parcial do anúncio | Código pode desaparecer; ad ID sem mapa já foi observado | Motivo `código removido`/`mapeamento ausente` | Alta | Token opaco fora do texto visível quando a plataforma permitir, mais fallback auditável |
| 23 | Perda de armazenamento | Continuar atendimento e marcar atribuição incompleta | Fallback SITE/código de página evita falha total, mas pode classificar errado | First touch e campanha se perdem | Atendimento segue; origem fica incompleta/baixa confiança | Alta | Detecção de perda e captura server-side mínima |
| 24 | Código legado | Ler alias sem promovê-lo a código canônico; não apagar histórico | Existem LF01/BF01/LC01/LPP01/WHATSAPP e variações de caixa | Alguns aliases entram no campo de campanha, outros não têm semântica inequívoca | Código original + código canônico resolvido + versão do mapa | Alta | Registro canônico de aliases e migração sem backfill especulativo |
| 25 | URL sem parâmetros | Não classificar automaticamente como orgânico ou direto; usar referrer/informação do paciente/fallback | SITE é agregado hoje em `Orgânico/Conteúdo` | Origem real se perde | `desconhecido`, `direto` ou origem informada, com evidência | Alta | Motor de precedência explícito e cobertura de motivos |

## Sequência segura

1. Congelar baseline, schema e códigos; bloquear qualquer envio inseguro de conversões.
2. Criar testes unitários para normalização, first/last touch, TTL, múltiplas abas, links encaminhados e códigos inválidos.
3. Criar ambiente de integração com webhook e cópia sintética da planilha/CRM.
4. Executar os 25 casos sem plataformas externas.
5. Fazer revisão de privacidade dos payloads e logs.
6. Com autorização separada, executar sondas reais mínimas nas plataformas, uma rota por vez.
7. Reconciliar navegador, webhook, LEADS, CRM e recibo externo.
8. Manter Meta Site sem novo investimento até o cenário 2 ou 3 passar integralmente.

## Guardrails e rollback

- Zero PII ou informação clínica nos relatórios, logs externos e transaction IDs.
- Zero sobrescrita automática de first touch.
- Zero conversão importada sem estado rastreável.
- Zero backfill por similaridade de nome, telefone ou texto.
- Se qualquer teste gerar atribuição falsa, duplicidade ou vazamento, interromper o pacote e retornar ao commit-base; preservar somente os logs anonimizados da falha.

## Evidência já disponível

Os 570 testes locais do repositório passaram em 15/08/2026. Isso valida contratos locais existentes, mas não substitui os testes ponta a ponta acima nem comprova o comportamento das plataformas ao vivo.
