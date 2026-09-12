/* Guarda a escolha de idioma num cookie. A regra do vercel.json so manda a
   raiz para /en quando este cookie nao existe, e respeita o valor dele depois
   disso: escolha explicita ganha de palpite automatico. */

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
