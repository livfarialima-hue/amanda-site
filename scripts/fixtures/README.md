# Áudio sintético de validação

`bruna-audio-address.wav` foi gerado localmente com System.Speech, voz Microsoft Maria Desktop (pt-BR), em 2026-10-13. Texto: “Qual é o endereço da Clínica LIV?” Não contém voz nem dados de pacientes.

O build de produção marcado envia apenas os áudios sintéticos desta pasta à API de transcrição e verifica o conteúdo e os critérios de qualidade do adaptador real. Os arquivos não fazem parte do site estático e não são enviados ao Drive.

`bruna-audio-context.wav` foi gerado com a mesma voz, velocidade -2, em 2026-10-13. Texto: “Olá. Quero deixar claro que não desejo agendar uma consulta agora. Estou apenas organizando as minhas dúvidas para uma conversa futura. Durante a semana, só consigo conversar depois das quinze horas, porque trabalho pela manhã. Meu nome é Elisa, e prefiro ser chamada assim. A equipe já confirmou que o documento foi enviado, então essa parte está resolvida. Ainda quero entender como funciona a avaliação presencial e o que devo levar no dia em que decidir marcar. Por enquanto, não procure horários para mim. Vou ler as informações com calma e depois entrar em contato novamente. Obrigada por guardar esse contexto e respeitar o meu tempo.”

O caso longo exige preservação da negação, do horário e do nome, com pelo menos dois segmentos válidos. `bruna-audio-silence.wav` contém três segundos de silêncio PCM mono de 16 kHz e deve ser inelegível para resposta automática. São verificações sintéticas de transcrição, não demonstração de acurácia em vozes de pacientes.
