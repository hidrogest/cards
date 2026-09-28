# Celebra — painel de aniversários da Hidrogest

Aplicação estática e editável para organizar colaboradores, aniversários, fotos e textos de cards.

## Como usar

1. Abra `index.html` no navegador ou envie a pasta inteira para um repositório do GitHub e ative o GitHub Pages.
2. Entre com a senha inicial `celebra2026` e altere-a em **Configurações**.
3. Na aba **Colaboradores**, clique em uma pessoa para completar dados, enviar uma foto ou colar um link compartilhável do Google Drive.
4. Para importar dados do Excel, copie as colunas de nome e data e use **Importar do Excel**. O formato aceito é `nome + tab + data`.
5. Em **Configurações**, baixe o arquivo `.ics` e importe-o no Google Agenda. Ele cria um aviso anual sete dias antes de cada aniversário.

## Fotos

- **Link do Google Drive:** cole um link compartilhável do arquivo. O painel extrai o identificador e tenta convertê-lo para visualização.
- **Upload:** envie uma imagem diretamente. No modo local, o arquivo fica salvo somente no navegador que fez o upload.

## Importante sobre login e dados

Este projeto não tem servidor porque foi preparado para você colocar no GitHub sem publicar agora. Por isso, a senha e os dados ficam no `localStorage` do navegador. Isso é útil para prototipar e trabalhar sozinho, mas não substitui um acesso seguro e compartilhado.

Para uso real por várias pessoas, conecte a interface a Supabase ou Firebase para autenticação, banco de dados e armazenamento. O desenho das telas e os dados já estão estruturados para essa próxima etapa.

## Tipografia

O site usa **DM Serif Display** nos títulos e Geist nos textos. A DM Serif Display é gratuita, tem cobertura para português e preserva o tom editorial da referência sem falhas em acentos.
