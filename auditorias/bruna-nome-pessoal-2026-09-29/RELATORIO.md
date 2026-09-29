# Nome pessoal nas respostas da Bruna — 29/09/2026

Estado: publicado e verificado; manual e Plano no Drive relidos byte a byte nos mesmos IDs.

Commit funcional d700926465386ea34842a459b5c690544485d069; deploy 6abc3954a368c700089a974e; verificado em 2026-09-29T22:21:05.241Z. Sem mensagem real de teste ou observação de nova conversa natural.

Validação: 1.870 testes integrais, oito regressões novas (oito falhas reproduzidas no baseline), 47 comandos obrigatórios, arquitetura e build/check de 193 arquivos e 54 URLs sem erros.

A Bruna usa saudação neutra quando o perfil contém descrição comercial, profissão, marca ou outro nome não pessoal reconhecido. Imóveis, corretagem e demais descrições comerciais não viram vocativo nem fornecem primeiro nome por recorte. Nome explicitamente informado pela pessoa continua prioritário. Responder à dúvida antes de qualquer coleta; perguntar como prefere ser chamada apenas na abertura sem nome confiável, quando não houver outra pergunta ou histórico. Em continuidade, seguir sem nome. Sem alteração de cadastro clínico, destinatário, preço, agenda, cadência ou prioridade humana.

## Causa e correção

O filtro comercial existente aceitava descrições do setor imobiliário. A saudação de coordenação após atendimento humano ainda extraía o primeiro token sem consultar esse filtro. O ajuste mantém um proprietário comum e amplia somente descrições inequívocas, sem dicionário obrigatório de nomes de pessoas. O perfil inteiro é rejeitado quando comercial; não se tenta recuperar um primeiro nome de marca.

## Evidência e limites

Baseline local 5d04f535701a01acd1683611c59f97c276946587, funcional em produção 678538d7fe51f2cc59f1698335c77cf8566c7bae / Netlify 6abb7fa0f3fe0b00082c987f, conferidos ao vivo. A imagem do usuário evidencia o vocativo; oito regressões sintéticas reproduzem o erro. Casos incluem acento composto/decomposto, caixa, emojis, atividade profissional, nome pessoal acentuado e autodeclaração. Nenhuma PII ou mensagem real foi persistida neste pacote. Perfis arbitrários ainda exigem julgamento conservador; não se promete classificar qualquer marca.

## Falha, invariantes e validação

A entrada incorreta pode causar tratamento inadequado; a decisão segura é omitir o nome. Ausência de nome não impede resposta. Não se modifica destinatário, identidade clínica, consentimento, procedimento, valor, agenda, fila, transporte, prazo, takeover, opt-out ou recibo. Nenhum reenvio, reset ou alteração de dados. Testar proprietário, compositores, entrada da IA, retomada e suíte integral; usar somente efeitos simulados.

## Publicação e rollback

Recibos em PREFLIGHT.json e PUBLICACAO.json. Reverter apenas o pacote para deploy 6abb7fa0f3fe0b00082c987f, mantendo Apps Script v161 e filas. Observar próximos contatos naturais; Daniel/equipe revisa em 01/10/2026 se há vocativo comercial ou nome pessoal indevidamente omitido. Nenhuma nova automação de monitoramento.
