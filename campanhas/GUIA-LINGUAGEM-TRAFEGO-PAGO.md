# Linguagem de busca e tráfego pago

> **Governança:** o norte estratégico canônico está em `campanhas/NORTE-ESTRATEGICO-GOOGLE-ADS.md`. Este arquivo é um guia técnico de linguagem e atribuição. Em caso de divergência estratégica, o norte canônico prevalece.

Este guia organiza as expressões populares incorporadas ao site. Elas servem para melhorar correspondência entre busca, anúncio e página, mas não devem ser tratadas como diagnóstico nem usadas de modo a constranger a paciente.

## Regra de uso por canal

### Google Pesquisa

- Usar os termos populares em grupos temáticos pequenos, com correspondência de frase ou exata no início.
- Manter o título do anúncio clínico e sóbrio: problema percebido + avaliação + localização.
- Levar cada grupo à página específica que repete naturalmente aquela linguagem.
- Separar intenção informativa de intenção de consulta; não misturar lifting, procedimentos minimamente invasivos e preço no mesmo grupo.
- Para buscas como `lifting facial preço`, `valor do lifting` e `quanto custa lifting facial`, usar `https://draamandaschroeder.com.br/conteudos/quanto-custa-lifting-facial-sao-paulo/`. A promessa do anúncio é explicar componentes, fatores de variação e orçamento individual, não publicar faixa cirúrgica. Para indicação, técnica, resultados e recuperação, preservar `https://draamandaschroeder.com.br/lifting-facial/` como destino principal.
- Manter separados `AG_LIFTING_FACIAL` e `AG_LIFTING_FACIAL_PRECO`. No grupo geral, usar negativas **exatas** de roteamento para as cinco formas canônicas de preço: `[lifting facial preço]`, `[mini lifting facial preço]`, `[preço mini lifting facial]`, `[quanto custa lifting facial]` e `[valor lifting facial]`. As duas primeiras já estão aplicadas; as três restantes dependem de autorização específica. Nunca negativar `preço`, `valor`, `custo`, `quanto custa` ou `valor médio` em nível de campanha, conta ou lista compartilhada enquanto o grupo de preço estiver ativo.
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

### Piloto Meta de lifting cervical — proposto em 16/08/2026

- Código reservado da campanha: `M26C01W`; caminho pretendido: WhatsApp direto.
- Código inicial reservado do criativo: `C07H01`. A mensagem de abertura deve terminar com `Ref. M26C01W-C07H01` e a prévia precisa provar que a referência chega intacta.
- Estrutura: uma campanha, um conjunto e um anúncio no início; São Paulo +20 km, todos os gêneros e limite rígido 40–65+.
- Destino: WhatsApp direto. Não redirecionar o piloto ao site enquanto `M26F02S` não tiver prova ponta a ponta.
- Orçamento base: R$ 20/dia durante 15 dias completos, sem alteração simultânea de público, posicionamento, destino ou criativo.
- Enquadramento: explicar que contorno cervical pode envolver pele, gordura, platisma e continuidade com a face; a avaliação define se o caminho é lifting cervical, lipo de papada, associação ou outra conduta. Não afirmar que a pessoa tem “pescoço de peru”, não prometer resultado e não usar vergonha.
- Antes de publicar, adicionar `M26C01W` ao agregado e à rotina Meta; depois de criar o anúncio, mapear o Meta Ad ID ao código exato no webhook. Se a plataforma exigir Conta do WhatsApp Business ou não aceitar `age_min=40`, interromper o lançamento em vez de contornar o gate.
- Checkpoints: três, sete e quinze dias completos, com decisão por contato válido, qualificado e consulta. CTR, CPC e conversa são sinais diagnósticos.

### Campanha Meta de otoplastia

- Campanha infantil com destino direto ao WhatsApp: usar a referência `M26O01W` na mensagem inicial.
- Quando o site for usado como destino ou material de apoio, enviar para `https://draamandaschroeder.com.br/otoplastia-infantil/?origem=M26O01W&utm_source=instagram&utm_medium=paid_social&utm_campaign=M26O01W&utm_content=DbHKuWfGP_N`.
- A página infantil preserva `OT02` como referência-base. Com os parâmetros acima, o WhatsApp recebe `M26O01W-DbHKuWfGP_N-OT02`, permitindo distinguir campanha, criativo e jornada sem incluir dado clínico ou pessoal.
- A página geral `/otoplastia/` funciona como roteador e oferece dois caminhos explícitos: criança ou adolescente; adulto.
- A página infantil mostra somente casos identificados como infantis e oferece um acesso discreto à jornada adulta para não perder procura de adultos atraída pelo tema.
- A página adulta preserva `OT01` como referência-base, utiliza mensagem própria no WhatsApp e mostra somente o caso identificado como adulto.
- Não reutilizar o reel infantil como anúncio adulto. Um eventual teste adulto deve ter criativo e código próprios, sugerido como `M26O02W`.

### Contrato técnico de atribuição Google Ads

- Manter a marcação automática do Google Ads ativada.
- Preservar o sufixo completo que já está configurado nas seis campanhas: `utm_source=google&utm_medium=cpc&utm_campaign={_camp}&utm_id={campaignid}&utm_adgroup={_ag}&utm_content={creative}&utm_term={keyword}&matchtype={matchtype}&device={device}&network={network}&loc_physical_ms={loc_physical_ms}`.
- O site reconhece o valor resolvido de `utm_campaign={_camp}` como referência não identificadora e o inclui na mensagem do WhatsApp, mesmo sem cookies. Todos os CTAs do site recebem também um código estável da página (`SITE-...` quando não há campanha), para diferenciar contato pelo site de WhatsApp direto. Quando disponíveis, GCLID, GBRAID e WBRAID também são preservados na sessão de origem e transportados ao WhatsApp para permitir a reconciliação por click ID; isso não ativa tags de medição nem altera o estado de consentimento.
- As seis campanhas usam, desde 15/08/2026, estes códigos estáveis no parâmetro personalizado `{_camp}`:
  - `S_BR_SP_BLEFAROPLASTIA` → `G26BLEF`
  - `S_BR_SP_CIRURGIA_FACIAL` → `G26FACE`
  - `S_BR_SP_LIFTING_CERVICAL` → `G26CERV`
  - `S_BR_SP_LIFTING_FACIAL` → `G26LIFT`
  - `S_BR_SP_MARCA` → `G26MARCA`
  - `S_BR_SP_OTOPLASTIA` → `G26OTO`
- Os nove grupos ativos usam estes códigos estáveis em `{_ag}`; todos foram conferidos em 15/08/2026 e as quatro lacunas foram corrigidas no mesmo dia:
  - `AG_BLEFAROPLASTIA` → `ag_blefaroplastia`
  - `AG_CIRURGIA_FACIAL` → `ag_cirurgia_facial`
  - `AG_CERVICOPLASTIA` → `ag_lifting_cervical`
  - `AG_LIPO_PAPADA` → `ag_lipo_papada`
  - `AG_LIFTING_FACIAL` → `ag_lifting_facial`
  - `AG_LIFTING_FACIAL_PRECO` → `ag_lifting_facial_preco`
  - `AG_MARCA` → `ag_marca`
  - `Adulto` em `S_BR_SP_OTOPLASTIA` → `ag_otoplastia_adulto`
  - `AG_OTOPLASTIA_INFANTIL` → `ag_otoplastia_infantil`
- Os aliases históricos continuam legíveis para preservar o passado, mas não devem ser usados em novas configurações.
- O catálogo e as regras de resolução ficam em `campanhas/REGISTRO-CODIGOS-ATRIBUICAO.md`. Em especial, `M26O01W` isolado não prova o caminho porque foi documentado tanto para WhatsApp direto quanto para passagem pelo site; sem landing/CTA verificável, o caminho é `N/D` e não recebe backfill como direto.
- Se o clique contiver `GCLID`, `GBRAID` ou `WBRAID`, mas a campanha ainda não tiver o parâmetro `origem`, o site acrescenta a referência genérica `G26ADS` à mensagem do WhatsApp.
- Sem consentimento, GA4, Google Ads e Meta continuam bloqueados. A preservação operacional da referência e de um click ID já presente na URL ocorre sem criar cookie de publicidade e sem marcar consentimento como concedido; nenhum nome, telefone, e-mail ou conteúdo clínico deve ser transportado como parâmetro de mídia.
- Após consentimento explícito, as tags de medição também podem registrar os eventos permitidos. O click ID permanece no bloco técnico `ID Ads` da mensagem em ambos os estados para permitir preencher a conversão qualificada na planilha.
- Uma referência `G26...` permite classificar a origem como Google Ads, mas somente `GCLID`, `GBRAID` ou `WBRAID` permite importar a conversão pelo identificador de clique.

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
