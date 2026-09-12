/* delarge — memoria da escolha de idioma

   As duas versoes do site sao arquivos de verdade: a raiz em portugues e /en
   em ingles. Quem troca de idioma esta seguindo um link comum, entao nao ha
   nada para traduzir em tempo de execucao. Este arquivo faz uma coisa so.

   Quem chega na raiz e mandado para /en quando o navegador nao pede portugues.
   Essa regra vive no vercel.json, roda antes da pagina existir e nao custa
   nada. Mas ela precisa de um jeito de sair do caminho: se a pessoa clicou em
   "português" de dentro do /en, ou em "english" estando na raiz, foi uma
   escolha explicita, e escolha explicita ganha de palpite automatico.

   O cookie e esse recado. O vercel.json so redireciona quando ele nao existe,
   e passa a respeitar o valor dele depois disso. Um ano de validade porque a
   escolha de idioma de uma pessoa nao muda de semana em semana. */

(function () {
  'use strict';

  var UM_ANO = 60 * 60 * 24 * 365;

  document.querySelectorAll('[data-idioma]').forEach(function (link) {
    link.addEventListener('click', function () {
      /* Sincrono de proposito: grava antes de a navegacao comecar, senao o
         destino carrega antes do cookie existir e o redirecionamento da raiz
         devolveria a pessoa para o idioma que ela acabou de recusar. */
      document.cookie = 'idioma=' + link.getAttribute('data-idioma')
        + '; path=/; max-age=' + UM_ANO
        + '; samesite=lax'
        + (location.protocol === 'https:' ? '; secure' : '');
    });
  });
})();
