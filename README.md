# Celebra — painel de aniversários da Hidrogest

Aplicação estática e editável para organizar colaboradores, aniversários, fotos e textos de cards.

## Como usar

1. Abra `index.html` no navegador ou envie a pasta inteira para um repositório do GitHub e ative o GitHub Pages.
2. Crie uma chave de acesso do GitHub com permissão de **Conteúdo: leitura e escrita** apenas para o repositório `hidrogest/cards`. Cole essa chave no acesso do painel: ela passa a funcionar como a senha e permite que o site salve a base compartilhada.
3. Na aba **Colaboradores**, clique em uma pessoa para completar dados, enviar uma foto ou colar um link compartilhável do Google Drive.
4. Para importar dados do Excel, copie as colunas de nome e data e use **Importar do Excel**. O formato aceito é `nome + tab + data`.
5. Em **Textos e cards**, escolha uma pessoa e use **Baixar card PNG** para ter um card pronto para postar. A versão SVG preserva alta qualidade caso queira editar ou se uma foto externa impedir a conversão em PNG.
6. Em **Configurações**, baixe o arquivo `.ics` e importe-o no Google Agenda. Ele cria um aviso anual sete dias antes de cada aniversário.

## Fotos

- **Link do Google Drive:** cole um link compartilhável do arquivo. O painel extrai o identificador e tenta convertê-lo para visualização.
- **Upload:** envie uma imagem diretamente. No modo local, o arquivo fica salvo somente no navegador que fez o upload.

## Importante sobre login e dados

O painel usa a API do GitHub para gravar a base em `data/celebra-data.json`. A chave de acesso não entra no código nem é publicada: ela fica somente na sessão do navegador e é removida ao sair. Para poucas pessoas, a mesma chave pode ser usada como a senha do painel.

O arquivo de dados é criado automaticamente na primeira alteração salva. Se quiser uma segurança mais forte ou usuários com senhas próprias, o próximo passo é migrar para Supabase ou Firebase.

## Tipografia

O site usa **DM Serif Display** nos títulos e Geist nos textos. A DM Serif Display é gratuita, tem cobertura para português e preserva o tom editorial da referência sem falhas em acentos.
