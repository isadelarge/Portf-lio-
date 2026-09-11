/* Pagina de projetos: a previa segue o cursor sobre a linha em hover.
   No toque nao ha hover, entao a previa fica escondida e a linha continua
   sendo so um link. */

(function () {
  'use strict';

  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = window.matchMedia('(hover: none)').matches;
  if (reduzido || fino) return;

  document.querySelectorAll('.linha').forEach(function (linha) {
    var previa = linha.querySelector('.linha__previa');
    if (!previa) return;

    linha.addEventListener('pointermove', function (evento) {
      var caixa = linha.getBoundingClientRect();
      previa.style.setProperty('--x', (evento.clientX - caixa.left) + 'px');
      previa.style.setProperty('--y', (evento.clientY - caixa.top) + 'px');
    });
  });
})();
