# Linguagem de busca e tráfego pago

Este guia organiza as expressões populares incorporadas ao site. Elas servem para melhorar correspondência entre busca, anúncio e página, mas não devem ser tratadas como diagnóstico nem usadas de modo a constranger a paciente.

## Regra de uso por canal

### Google Pesquisa

- Usar os termos populares em grupos temáticos pequenos, com correspondência de frase ou exata no início.
- Manter o título do anúncio clínico e sóbrio: problema percebido + avaliação + localização.
- Levar cada grupo à página específica que repete naturalmente aquela linguagem.
- Separar intenção informativa de intenção de consulta; não misturar lifting, procedimentos minimamente invasivos e preço no mesmo grupo.
- Evitar promessas, superlativos, urgência artificial e afirmações como “resultado garantido”.

### Meta

- Preferir educação, envelhecimento natural, processo de avaliação e preservação da identidade.
- Não abrir o anúncio com “Você tem...?” nem afirmar ou insinuar um atributo físico da pessoa que vê o anúncio.
- Não usar apelidos potencialmente constrangedores no criativo. Eles podem aparecer de forma contextual e respeitosa na página de destino.
- Evitar closes depreciativos de partes do corpo e comparações que induzam vergonha.
- Para cirurgia íntima, priorizar conteúdo orgânico e Google Pesquisa antes de testar Meta.

### Contrato técnico do primeiro teste Meta

- Campanha com destino direto ao WhatsApp: usar a referência genérica `M26F01W` na mensagem inicial.
- Campanha com destino ao site: usar `https://draamandaschroeder.com.br/avaliacao-facial/?origem=M26F02S&utm_source=meta&utm_medium=paid_social&utm_campaign=M26F02S`.
- O parâmetro `origem=M26F02S` substitui a referência interna do botão pelo código da campanha quando a pessoa abre o WhatsApp.
- Pixel oficial: `1501288525098716`. No site médico, a Meta recebe somente o evento-base permitido (`PageView`); o evento padrão `Lead` foi suprimido pela própria plataforma como evento restrito.
- Não criar evento personalizado ou renomear o clique para tentar contornar a restrição. Os cliques no WhatsApp do site continuam medidos pelo Google e pelo contador técnico local, sem envio de procedimento, texto da mensagem, telefone, nome, fotografia ou informação clínica à Meta.
- Na campanha com destino ao site (`M26F02S`), otimizar inicialmente para visualizações da página de destino, não para `Lead` do pixel.
- Na campanha direta ao WhatsApp (`M26F01W`), usar a mensuração de conversas/mensagens da própria Meta e validar qualidade pelo código de origem no atendimento.
- Remover regras de botão criadas pela ferramenta visual da Meta, pois elas podem medir somente um CTA e continuar tentando enviar eventos restritos.
- Pixel e eventos Meta só carregam após consentimento. O Google Tag Manager permanece desativado para não duplicar GA4, Google Ads ou Meta Pixel.
- O clique é um sinal técnico, não um contato qualificado. A decisão do teste continua baseada em contatos válidos, agendamentos e comparecimentos.

## Mapa de grupos e páginas

| Página | Temas de busca para testar | Enquadramento recomendado do anúncio |
|---|---|---|
| Lifting facial | bochecha de buldogue; rosto caído; face derretida; linha de marionete; bigode chinês; perda do contorno mandibular | Avaliação do envelhecimento facial, preservando expressão e identidade |
| Lifting cervical | papada com pele; pescoço de peru; bandas no pescoço; pele sobrando; linha da mandíbula apagada | Entender se a queixa envolve pele, gordura, músculo ou combinação |
| Blefaroplastia | pálpebra caída; olhar cansado; bolsas nos olhos; maquiagem carimbada; delineador borrando | Avaliação das pálpebras e do olhar com naturalidade |
| Abdominoplastia | barriga avental; barriga estufada; diástase; estômago alto; pele após gravidez; umbigo caído | Avaliação de pele, parede abdominal e contorno após gestação ou emagrecimento |
| Lipoaspiração | pochete; pneuzinho; culote; bananinha; gordura do sutiã; flancos | Gordura localizada e proporção corporal com indicação segura |
| Mama | peito caído; peito murcho; sutiã vazio; mama pesada; mamilo para baixo | Descobrir se o caso pede elevação, redução, volume ou associação |
| Mastopexia | levantar mama caída; peito murcho após amamentar; perda de colo | Reposicionamento e sustentação com ou sem prótese conforme avaliação |
| Mastopexia com prótese | mama caída e vazia; recuperar colo; levantar e preencher | Quando queda e falta de volume precisam ser discutidas juntas |
| Mamoplastia redutora | seios pesados; dor nas costas; marca do sutiã; dificuldade para treinar | Redução de peso e reorganização da mama, sem promessa de tamanho exato |
| Prótese de mama | pouco volume; sutiã vazio; falta de colo; mama pequena | Planejamento de volume proporcional ao tórax, tecidos e objetivo |
| Otoplastia | orelha de abano; vergonha de prender o cabelo; esconder orelha com boné | Avaliação da projeção das orelhas e impacto no cotidiano |
| Ninfoplastia | desconforto com legging; atrito ao pedalar; marca no biquíni; assimetria dos pequenos lábios | Consulta reservada para queixa funcional ou estética, sem padronização |

## Distinção importante na cirurgia íntima

“Capô de fusca” é usado com frequência para descrever volume do monte de Vênus. Não deve ser empregado como sinônimo automático de hipertrofia dos pequenos lábios. A página explica essa diferença para evitar promessa incompatível com a ninfoplastia.

## Estrutura inicial de teste

1. Um procedimento por campanha e uma intenção principal por grupo de anúncios.
2. Dois ou três anúncios responsivos por grupo, variando o benefício informativo, não a promessa de resultado.
3. Conversão principal: contato qualificado pelo WhatsApp; conversões secundárias: clique em telefone e início de formulário, se houver.
4. Conferir semanalmente os termos de pesquisa e adicionar negativas para cursos, emprego, SUS, grátis, caseiro e intenções incompatíveis.
5. Reavaliar mensagem e página após volume suficiente de cliques e contatos; não decidir apenas por CTR.

## Exemplos de títulos seguros

- Lifting facial em São Paulo
- Avaliação do envelhecimento facial
- Contorno facial com naturalidade
- Lifting cervical em Pinheiros
- Avaliação de pálpebras e olhar
- Cirurgia de mama: qual abordagem faz sentido?

## Exemplos a evitar

- Livre-se da bochecha de buldogue
- Seu rosto está derretendo?
- Acabe com a barriga avental
- Corpo perfeito garantido
- Resultado sem cicatriz
- A melhor cirurgiã de São Paulo
