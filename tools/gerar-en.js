/* Gera a versao em ingles a partir da versao em portugues.
   Rodar com:  node tools/gerar-en.js

   O portugues e a fonte unica. Os arquivos em /en sao SEMPRE derivados, nunca
   editados a mao: qualquer mudanca ali some na proxima geracao. Para mudar um
   texto em portugues, edite o index.html; para mudar a traducao dele, edite
   tools/en.json; depois rode este script.

   O casamento entre os dois lados e feito pelos atributos data-i18n do HTML:

     data-i18n="chave"        troca o texto de dentro do elemento
     data-i18n-html="chave"   troca o conteudo inteiro, com as tags
     data-i18n-attr="alt:x"   troca atributos, separados por ponto e virgula

   Nenhuma dependencia: o casamento de tags e feito contando aberturas e
   fechamentos, o que basta para um HTML que a gente mesmo escreve. */

'use strict';

var fs = require('fs');
var path = require('path');

var RAIZ = path.join(__dirname, '..');
var SITE = 'https://delargedesign.com.br';
var EN = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/en.json'), 'utf8'));

var faltando = [];

function traduzir(chave) {
  if (!(chave in EN)) {
    faltando.push(chave);
    return null;
  }
  return EN[chave];
}

/* ---- 1. achar onde um elemento termina ----
   Do fim da tag de abertura, anda para a frente contando <tag e </tag ate a
   conta zerar. Resolve os casos em que o conteudo tem outro elemento do mesmo
   nome dentro, que e o caso da prosa do sobre (div com p) e do manifesto. */
function fimDoConteudo(html, tag, depoisDaAbertura) {
  var abre = new RegExp('<' + tag + '\\b', 'gi');
  var fecha = new RegExp('</' + tag + '\\s*>', 'gi');
  var nivel = 1;
  var i = depoisDaAbertura;

  while (nivel > 0) {
    abre.lastIndex = i;
    fecha.lastIndex = i;

    var a = abre.exec(html);
    var f = fecha.exec(html);

    if (!f) throw new Error('tag <' + tag + '> sem fechamento a partir de ' + i);

    if (a && a.index < f.index) {
      nivel++;
      i = a.index + a[0].length;
    } else {
      nivel--;
      i = f.index + f[0].length;
      if (nivel === 0) return f.index;
    }
  }

  return -1;
}

/* ---- 2. trocar o conteudo dos elementos marcados ---- */
function trocarConteudo(html, atributo) {
  var re = new RegExp('<([a-z0-9]+)\\b[^>]*\\b' + atributo + '="([^"]+)"[^>]*>', 'gi');
  var saida = '';
  var cursor = 0;
  var m;

  while ((m = re.exec(html))) {
    var tag = m[1];
    var chave = m[2];
    var inicio = m.index + m[0].length;
    var fim = fimDoConteudo(html, tag, inicio);
    var novo = traduzir(chave);

    saida += html.slice(cursor, inicio);
    saida += novo === null ? html.slice(inicio, fim) : novo;
    cursor = fim;
    re.lastIndex = fim;
  }

  return saida + html.slice(cursor);
}

/* ---- 3. trocar atributos ---- */
function trocarAtributos(html) {
  return html.replace(/<[a-z0-9]+\b[^>]*\bdata-i18n-attr="([^"]+)"[^>]*>/gi, function (tagInteira, receita) {
    var novaTag = tagInteira;

    receita.split(';').forEach(function (par) {
      var corte = par.indexOf(':');
      if (corte < 0) return;

      var attr = par.slice(0, corte).trim();
      var chave = par.slice(corte + 1).trim();
      var valor = traduzir(chave);
      if (valor === null) return;

      var alvo = new RegExp('\\b' + attr.replace(/[-]/g, '\\-') + '="[^"]*"');
      if (alvo.test(novaTag)) {
        novaTag = novaTag.replace(alvo, attr + '="' + valor.replace(/"/g, '&quot;') + '"');
      }
    });

    return novaTag;
  });
}

/* ---- 4. caminhos ----
   As paginas em portugues moram na raiz e usam caminhos relativos. De dentro
   de /en/ um "css/style.css" viraria "/en/css/style.css", que nao existe:
   tudo que e compartilhado passa a ser absoluto, e so os links entre paginas
   e que ganham o prefixo do idioma. */
function ajustarCaminhos(html) {
  return html.replace(/\b(src|href)="([^"]+)"/g, function (inteiro, attr, valor) {
    if (/^(https?:|mailto:|tel:|data:|#|\/)/.test(valor)) return inteiro;
    if (/^(assets|css|js)\//.test(valor)) return attr + '="/' + valor + '"';
    if (valor === 'index.html') return attr + '="/en/"';
    if (/\.html$/.test(valor)) return attr + '="/en/' + valor + '"';
    return inteiro;
  }).replace(/\bhref="\/"/g, 'href="/en/"');
}

/* ---- 5. cabecalho ---- */
function ajustarCabecalho(html, urlPt, urlEn) {
  return html
    .replace(/<html lang="[^"]*">/, '<html lang="en">')
    .replace(new RegExp('<link rel="canonical" href="' + urlPt + '">'),
      '<link rel="canonical" href="' + urlEn + '">')
    .replace(new RegExp('<meta property="og:url" content="' + urlPt + '">'),
      '<meta property="og:url" content="' + urlEn + '">')
    .replace('<meta property="og:locale" content="pt_BR">',
      '<meta property="og:locale" content="en_US">');
}

/* ---- 6. o seletor do rodape ----
   Roda DEPOIS do ajuste de caminhos, e reescreve os dois enderecos por cima.
   O ajuste de caminhos manda todo href="/" para "/en/", que e o certo para a
   marca e para o "voltar", mas seria a morte deste bloco: o link do portugues
   apontaria para o ingles e nao haveria caminho de volta. Aqui os dois lados
   sao gravados explicitamente, com os enderecos que a pagina declara. */
function ajustarSeletor(html, hrefPt, hrefEn) {
  return html
    .replace(/data-idioma-atual="pt"/g, 'data-idioma-atual="en"')
    .replace(/(<a[^>]*\bdata-idioma="pt"[^>]*)\s+aria-current="true"/g, '$1')
    .replace(/(<a[^>]*\bdata-idioma="en")/g, '$1 aria-current="true"')
    .replace(/<a([^>]*\bdata-idioma="pt"[^>]*)>/g, function (tag, attrs) {
      return '<a' + attrs.replace(/\bhref="[^"]*"/, 'href="' + hrefPt + '"') + '>';
    })
    .replace(/<a([^>]*\bdata-idioma="en"[^>]*)>/g, function (tag, attrs) {
      return '<a' + attrs.replace(/\bhref="[^"]*"/, 'href="' + hrefEn + '"') + '>';
    });
}

/* ---- 7. limpeza ----
   Os data-i18n sao o mapa da traducao, nao servem para nada na pagina pronta.
   O aviso no topo existe para ninguem editar o arquivo gerado por engano. */
function limpar(html) {
  return html
    .replace(/\s+data-i18n(?:-html|-attr)?="[^"]*"/g, '')
    .replace(/^<!doctype html>/i,
      '<!doctype html>\n<!-- GERADO por tools/gerar-en.js. Nao edite a mao:\n'
      + '     mude o portugues no arquivo da raiz ou a traducao em tools/en.json\n'
      + '     e rode  node tools/gerar-en.js  de novo. -->');
}

/* ---- 8. rodar ---- */
var PAGINAS = [
  { de: 'index.html',    para: 'en/index.html',
    urlPt: SITE + '/',              urlEn: SITE + '/en/',
    hrefPt: '/',                    hrefEn: '/en/' },

  { de: 'projetos.html', para: 'en/projetos.html',
    urlPt: SITE + '/projetos.html', urlEn: SITE + '/en/projetos.html',
    hrefPt: '/projetos.html',       hrefEn: '/en/projetos.html' }
];

fs.mkdirSync(path.join(RAIZ, 'en'), { recursive: true });

PAGINAS.forEach(function (pag) {
  var html = fs.readFileSync(path.join(RAIZ, pag.de), 'utf8');

  html = trocarConteudo(html, 'data-i18n-html');
  html = trocarConteudo(html, 'data-i18n');
  html = trocarAtributos(html);
  html = ajustarCabecalho(html, pag.urlPt, pag.urlEn);
  html = ajustarCaminhos(html);
  html = ajustarSeletor(html, pag.hrefPt, pag.hrefEn);
  html = limpar(html);

  fs.writeFileSync(path.join(RAIZ, pag.para), html, 'utf8');
  console.log('  ' + pag.de + '  ->  ' + pag.para);
});

if (faltando.length) {
  var unicas = faltando.filter(function (v, i, a) { return a.indexOf(v) === i; });
  console.error('\nSEM TRADUCAO em tools/en.json: ' + unicas.join(', '));
  process.exit(1);
}

console.log('\npronto, /en gerado a partir do portugues');
