# delarge

Portfólio de Isabela Alves, web designer independente.

Site estático, sem build e sem dependências: HTML, CSS e JavaScript escritos à mão.

## Estrutura

```
index.html          página principal, em português
projetos.html       índice de todos os projetos
en/                 as mesmas duas páginas em inglês, GERADAS
css/style.css       folha única
js/main.js          navbar, painéis, revelação no scroll, leitura por letra
js/shader-fundo.js  gradiente animado em WebGL
js/indice.js        prévia de capa no hover do índice
js/idioma.js        grava a escolha de idioma num cookie
tools/en.json       a tradução, chave por chave
tools/gerar-en.js   monta /en a partir do português
assets/             imagens, SVGs e ícones
```

## Os dois idiomas

O português é a fonte. Os arquivos em `en/` são **gerados** e nunca editados à
mão: o que for escrito lá some na próxima geração.

Para mudar um texto em português, edite o `index.html` como sempre. Para mudar a
tradução dele, edite `tools/en.json`. Depois:

```bash
node tools/gerar-en.js
```

O casamento entre os dois lados vive em atributos do próprio HTML:
`data-i18n` troca o texto de dentro do elemento, `data-i18n-html` troca o
conteúdo com as tags, e `data-i18n-attr` troca atributos como `alt` e
`aria-label`. Se uma chave faltar no `en.json`, o gerador para e diz qual.

Quem chega na raiz é mandado para `/en/` quando o idioma preferido do navegador
não é português. A regra está no `vercel.json`, roda antes da página existir e
não custa invocação nenhuma. Ela não dispara quando não há cabeçalho
`Accept-Language`, que é o caso do Googlebot: assim a home em português continua
sendo a que o Google indexa. O seletor no rodapé grava um cookie, e o cookie
desliga a escolha automática, porque escolha explícita ganha de palpite.

## Rodar localmente

Qualquer servidor estático serve. Sem servidor, o WebGL e os módulos falham por
causa da origem `file://`.

```bash
npx http-server . -p 4323 -c-1
```

## Cache

O `vercel.json` trata dois casos diferentes.

`css/` e `js/` vao com `no-cache`. Sao nomes fixos com conteudo que muda: o
`main.js` de hoje mora no mesmo endereco do de ontem. Com um `max-age` o
navegador nem pergunta ao servidor, e uma correcao demora ate esse prazo para
chegar em quem ja visitou o site. Com `no-cache` ele sempre pergunta, e o
ETag responde 304 sem corpo quando nada mudou, entao o custo e um pedido
minusculo por arquivo.

`assets/` vai com uma hora. As imagens sao trocadas mantendo o nome, e o
proprio `index.html` diz isso no comentario do retrato. Com cache longo, quem
ja visitou ficaria com a foto velha por tempo demais.

## Notas

O gradiente da intro, da faixa da navbar, do painel lateral e do rodapé é o mesmo
shader, em contextos WebGL separados. Cada canvas tem a medida da viewport e é
recortado pelo elemento que o mostra: o shader normaliza o campo por
`min(largura, altura)`, então um canvas menor mostraria o mesmo campo em outra
escala e leria como um gradiente diferente.

Os canvases dos painéis param de desenhar enquanto o painel está fechado, pelo
`data-shader-pausa`, e voltam por `window.acordarShaders()` quando ele abre.

As imagens em `assets/img/` têm os originais ao lado dos `.webp` servidos. Só os
`.webp` são referenciados pelo site.
