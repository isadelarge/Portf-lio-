# delarge

Portfólio de Isabela Alves, web designer independente.

Site estático, sem build e sem dependências: HTML, CSS e JavaScript escritos à mão.

## Estrutura

```
index.html          página principal
projetos.html       índice de todos os projetos
css/style.css       folha única
js/main.js          navbar, painéis, revelação no scroll, leitura por letra
js/shader-fundo.js  gradiente animado em WebGL
js/indice.js        prévia de capa no hover do índice
assets/             imagens, SVGs e ícones
```

## Rodar localmente

Qualquer servidor estático serve. Sem servidor, o WebGL e os módulos falham por
causa da origem `file://`.

```bash
npx http-server . -p 4323 -c-1
```

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
