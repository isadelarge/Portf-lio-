/* delarge — portfolio
   1) o hero se monta: a estrela central voa para a marca e a nav aparece
   2) revelacao suave dos blocos ao entrar na viewport            */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* Os estados escondidos do CSS pendem desta classe. Sem JS a pagina nasce
     inteira e legivel, so sem animacao. */
  root.classList.add('js');

  /* ---- 1. largura real da viewport, sem a barra de rolagem ---- */
  function setViewportWidth() {
    root.style.setProperty('--vw', root.clientWidth + 'px');
  }

  setViewportWidth();
  window.addEventListener('resize', setViewportWidth);

  /* Recarregar volta para a intro. O navegador restaura a posicao de scroll
     por padrao, e numa pagina que abre com uma intro em tela cheia isso joga
     a pessoa no meio do conteudo sem contexto. So vale quando nao ha ancora
     na URL: com #projetos na barra, o destino e a ancora. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!window.location.hash) window.scrollTo(0, 0);

  var nav = document.getElementById('nav');

  /* ---- 2. quebra o texto da navbar em letras ----
     Traduzido do Blur Reveal de @tom_ui no 21st.dev. La cada caractere e um
     motion.span com variants; aqui vira um <span> com indice, e o CSS cuida
     do resto. Os numeros sao os do componente: blur 12px, y 10px, duracao
     0.3/0.5 = 0.6s e escalonamento 0.03/1.5 = 0.02s por letra.

     O texto original fica num span so para leitor de tela, e as letras vao
     com aria-hidden, igual ao original. */
  function quebrarEmLetras(alvo) {
    var texto = alvo.textContent;
    alvo.textContent = '';

    var leitor = document.createElement('span');
    leitor.className = 'so-leitor';
    leitor.textContent = texto;
    alvo.appendChild(leitor);

    var i = 0;
    texto.split(' ').forEach(function (palavra, p, todas) {
      var caixa = document.createElement('span');
      caixa.className = 'palavra';
      caixa.setAttribute('aria-hidden', 'true');

      var letras = palavra.split('');
      if (p < todas.length - 1) letras.push(' ');

      letras.forEach(function (c) {
        var span = document.createElement('span');
        span.className = 'letra';
        span.style.setProperty('--i', i++);
        span.textContent = c;
        caixa.appendChild(span);
      });

      alvo.appendChild(caixa);
    });
  }

  if (nav) {
    nav.querySelectorAll('.mask > span').forEach(quebrarEmLetras);
  }

  /* ---- 3. altura real da navbar ----
     Os dois espacadores da intro valem cada um metade do que sobra dos
     100svh depois de descontar a navbar, entao a navbar precisa nascer
     exatamente no centro do bloco escuro. */
  function medirNav() {
    if (nav) root.style.setProperty('--nav-h', nav.offsetHeight + 'px');
  }

  medirNav();
  window.addEventListener('resize', medirNav);

  /* ---- 4. paineis laterais ----
     Sao dois, o mesmo componente com conteudo diferente: contato, que o botao
     "contato" da barra abre em qualquer largura, e navegacao, que o hamburguer
     abre so no mobile, onde os links nao cabem na barra.

     O estado visual de cada um vem do aria-hidden dele, e nao de uma classe no
     <html>: com uma classe unica os dois abririam juntos. A classe .painel-aberto
     fica no <html> so para o que e global, que e travar o scroll e apagar o
     gradiente da faixa da barra. */
  var painelContato = document.getElementById('contato-menu');
  var painelMenu = document.getElementById('menu');
  var gatilhoContato = document.getElementById('contato-toggle');
  var toggle = document.getElementById('nav-toggle');

  /* O estado e o rotulo do hamburguer saem da mesma conta, num lugar so. Os
     dois textos vem do HTML, e nao daqui, porque a versao em ingles da pagina
     e gerada trocando atributos do proprio HTML. */
  function rotularToggle() {
    if (!toggle) return;

    var menuAberto = painelMenu !== null && painelMenu.getAttribute('aria-hidden') === 'false';
    toggle.setAttribute('aria-expanded', menuAberto ? 'true' : 'false');
    toggle.setAttribute('aria-label', menuAberto
      ? (toggle.getAttribute('data-label-fechar') || 'Fechar menu')
      : (toggle.getAttribute('data-label-abrir') || 'Abrir menu'));
  }

  rotularToggle();

  function abrir(alvo, aberto) {
    if (!alvo) return;
    alvo.setAttribute('aria-hidden', aberto ? 'false' : 'true');

    var outro = alvo === painelContato ? painelMenu : painelContato;
    if (aberto && outro) outro.setAttribute('aria-hidden', 'true');

    var algumAberto = (painelContato && painelContato.getAttribute('aria-hidden') === 'false') ||
      (painelMenu && painelMenu.getAttribute('aria-hidden') === 'false');

    root.classList.toggle('painel-aberto', algumAberto);
    root.classList.toggle('menu-aberto',
      painelMenu !== null && painelMenu.getAttribute('aria-hidden') === 'false');
    root.style.overflow = algumAberto ? 'hidden' : '';

    if (gatilhoContato) {
      gatilhoContato.setAttribute('aria-expanded',
        painelContato && painelContato.getAttribute('aria-hidden') === 'false' ? 'true' : 'false');
    }
    rotularToggle();

    /* o gradiente do pe da lamina para de desenhar enquanto ela esta fechada,
       e nao ha scroll nem resize para religar o loop quando ela abre */
    if (aberto && window.acordarShaders) window.acordarShaders();
  }

  function estaAberto(alvo) {
    return alvo !== null && alvo.getAttribute('aria-hidden') === 'false';
  }

  function fecharTudo() {
    abrir(painelContato, false);
    abrir(painelMenu, false);
  }

  if (gatilhoContato) {
    gatilhoContato.addEventListener('click', function () {
      abrir(painelContato, !estaAberto(painelContato));
    });
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      abrir(painelMenu, !estaAberto(painelMenu));
    });
  }

  [painelContato, painelMenu].forEach(function (alvo) {
    if (!alvo) return;

    alvo.querySelectorAll('.painel__fechar').forEach(function (botao) {
      botao.addEventListener('click', function () {
        abrir(alvo, false);
        if (alvo === painelContato && gatilhoContato) gatilhoContato.focus();
      });
    });

    /* clicar num link ja leva embora: o painel fecha junto e nao fica aberto
       atras do cliente de e-mail, da aba nova ou da secao ancorada */
    alvo.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { abrir(alvo, false); });
    });

    /* clicar no veu, fora da lamina, fecha. No desktop o veu e a maior parte
       da tela, entao e o alvo mais provavel de quem quer sair. */
    alvo.addEventListener('click', function (evento) {
      if (evento.target === alvo) abrir(alvo, false);
    });
  });

  document.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Escape') return;
    var tinhaContato = estaAberto(painelContato);
    if (!tinhaContato && !estaAberto(painelMenu)) return;
    fecharTudo();
    if (tinhaContato && gatilhoContato) gatilhoContato.focus();
    else if (toggle) toggle.focus();
  });

  /* o hamburguer nao existe no desktop: se a tela cresce com ele aberto, o
     painel de navegacao ficaria sem botao para fechar */
  window.addEventListener('resize', function () {
    if (root.clientWidth > 860 && estaAberto(painelMenu)) abrir(painelMenu, false);
  });

  /* ---- 5. a navbar sabe quando saiu da intro ----
     No mobile e isso que troca o bloco centralizado pela barra com menu.
     O corte e o mesmo de antes: a base do bloco escuro alcancando a base
     da navbar. */
  var backdrop = document.getElementById('topo');
  var folha = document.querySelector('.page');

  /* O corte e a folha branca alcancar a base da navbar. Nao da para usar o
     bloco escuro: ele agora e fixed, entao a base dele e sempre a base da
     viewport e a conta nunca viraria. */
  function marcarIntro() {
    if (!nav || !folha) return;
    nav.classList.toggle('is-past-intro',
      folha.getBoundingClientRect().top <= nav.getBoundingClientRect().bottom);
  }

  /* O fundo da intro e fixo, entao continuaria desenhando para sempre atras
     do conteudo. Assim que a folha branca cobre a tela inteira ele sai de
     cena, e o observador do shader para o loop sozinho. */
  function esconderFundoCoberto() {
    if (!backdrop || !folha) return;
    backdrop.classList.toggle('esta-coberto',
      folha.getBoundingClientRect().top <= -1);
  }

  /* No mobile o layout da barra troca quando ela PRENDE no topo, e nao
     quando a folha branca chega. Sem isso o bloco centralizado da intro
     ficava preso la em cima, com a assinatura quebrando em duas linhas. */
  function marcarPreso() {
    if (!nav) return;
    /* No topo da pagina ela nunca esta presa, mesmo que o retangulo diga que
       sim: a barra e fixed e a viagem da intro vem de uma animacao de scroll,
       que pode nao ter sido aplicada ainda no primeiro frame. Sem esta guarda
       o mobile abria com o layout de barra e trocava para o bloco da intro. */
    nav.classList.toggle('is-pinned',
      window.scrollY > 0 && nav.getBoundingClientRect().top <= 0);
  }

  function aoRolar() {
    marcarPreso();
    marcarIntro();
    esconderFundoCoberto();
  }

  aoRolar();
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRolar);

  /* ---- 6. intro ----
     260ms : marca, estrela e assinatura sobem da mascara, perto do centro
     1750ms: a linha se abre para as pontas e os links entram escalonados */
  if (nav) {
    if (reduced) {
      nav.classList.add('is-revealed', 'is-assembled');
    } else {
      window.setTimeout(function () {
        nav.classList.add('is-revealed');
      }, 260);

      window.setTimeout(function () {
        nav.classList.add('is-assembled');
        medirNav();
        armarDescida();
      }, 1750);
    }
  }

  /* ---- 6b. a folha branca sobe sozinha quando a intro acaba ----
     A intro monta a barra e para. Dai em diante a pagina fica esperando um
     gesto que a pessoa nao sabe que precisa dar: nada se move para dizer que
     ha mais coisa abaixo. Entao ela mesma anda uma tela.

     Nao ha animacao nova aqui. Uma tela de scroll ja e a folha branca subindo
     por cima do bloco escuro, a barra prendendo no topo e o manifesto acendendo
     letra a letra, porque as tres coisas sao dirigidas pelo scroll e nao pelo
     relogio. Mover o scroll toca as tres de uma vez.

     O destino e o topo da folha, medido na hora: nos dois caminhos do CSS, com
     e sem scroll timeline, ele da exatamente uma tela.

     O disparo nao e um relogio novo. E o silencio depois da ultima transicao
     da barra, o que resolve sozinho a diferenca entre desktop, onde as letras
     de "contato" ainda estao entrando, e mobile, onde a barra e so a marca e ja
     terminou antes. Se os tempos do CSS mudarem, isto acompanha. */
  var PAUSA = 1020;      // respiro entre a barra parar e a pagina andar
  var DESCIDA = 1600;    // a viagem de uma tela, devagar o bastante para ler
  var jaDesceu = false;

  function armarDescida() {
    var relogio = null;

    /* Os dois, e nao so transitionend: a estrela da marca troca de lugar por
       @keyframes, e uma animacao nao dispara transitionend. Sem animationend
       aqui a conta terminava antes dela, e a pagina comecava a andar com a
       barra ainda se montando.

       A estrela que gira em looping nao atrapalha: animacao infinita nunca
       chega ao fim, entao nunca empurra o relogio. */
    function adiar() {
      window.clearTimeout(relogio);
      relogio = window.setTimeout(disparar, PAUSA);
    }

    function disparar() {
      nav.removeEventListener('transitionend', adiar);
      nav.removeEventListener('animationend', adiar);
      descer();
    }

    nav.addEventListener('transitionend', adiar);
    nav.addEventListener('animationend', adiar);
    adiar();
  }

  function descer() {
    var folha = document.querySelector('.page');

    if (jaDesceu || !folha) return;
    jaDesceu = true;

    /* Cada um destes quer dizer que a descida nao cabe mais: a pessoa pediu
       uma secao pela URL, ja rolou por conta propria, ou nem esta olhando a
       aba, e voltar para ela daqui a cinco minutos com a pagina andando
       sozinha seria um susto. */
    if (window.location.hash) return;
    if (window.scrollY > 4) return;
    if (document.visibilityState !== 'visible') return;

    var alvo = folha.offsetTop;
    var partida = window.scrollY;
    var distancia = alvo - partida;
    if (distancia <= 0) return;

    var raiz = document.documentElement;
    var suaveAntes = raiz.style.scrollBehavior;
    /* o scroll-behavior: smooth da folha transformaria cada quadro desta
       animacao em outra animacao, concorrendo com ela */
    raiz.style.scrollBehavior = 'auto';

    var gestos = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    var cancelado = false;
    var inicio = null;

    function soltar() {
      raiz.style.scrollBehavior = suaveAntes;
      gestos.forEach(function (g) { window.removeEventListener(g, cancelar); });
    }

    function cancelar() {
      cancelado = true;
      soltar();
    }

    gestos.forEach(function (g) {
      window.addEventListener(g, cancelar, { passive: true });
    });

    /* Aceleracao nas duas pontas, e nao a curva de saida que o site usa no
       resto. Sao dois trabalhos diferentes: uma revelacao quer chegar rapido e
       assentar, entao comeca no talo e desacelera; uma viagem de uma tela
       inteira com esse mesmo comeco da um tranco, porque a pagina salta do
       repouso para a velocidade maxima num quadro. Aqui ela sai devagar, ganha
       corpo no meio e encosta sem batida. */
    function curva(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function quadro(agora) {
      if (cancelado) return;
      if (inicio === null) inicio = agora;

      var t = Math.min(1, (agora - inicio) / DESCIDA);
      window.scrollTo(0, partida + distancia * curva(t));

      if (t < 1) window.requestAnimationFrame(quadro);
      else soltar();
    }

    window.requestAnimationFrame(quadro);
  }

  /* ---- 7. revelacao ao cruzar a margem inferior ----
     A linha de gatilho fica 100px acima da borda de baixo da viewport, que e
     onde a referencia resolve o rotulo do projeto de cinza claro para preto. */
  var MARGEM_INFERIOR = 100;

  var fade = document.querySelectorAll('.rule');
  var processo = document.querySelector('.processo');

  // cada etapa guarda a propria posicao na fila; o CSS transforma em atraso
  document.querySelectorAll('.etapa').forEach(function (etapa, n) {
    etapa.style.setProperty('--n', n);
  });
  var projects = document.querySelectorAll('.project');

  if (reduced) {
    // sem animacao os projetos precisam nascer resolvidos, senao o rotulo
    // fica cinza e a descricao invisivel para sempre
    projects.forEach(function (block) {
      block.classList.add('is-visible');
    });
    var pr = document.querySelector('.processo');
    if (pr) pr.classList.add('is-visible');
    return;
  }

  var pendentes = [];

  fade.forEach(function (block) {
    block.classList.add('reveal');
    pendentes.push(block);
  });

  projects.forEach(function (block) {
    pendentes.push(block);
  });

  /* No sobre a prosa acende letra a letra, como o manifesto. O resto da
     coluna, que sao os blocos rotulados e o botao, nao tem por que ser lido:
     entra com o fade padrao da pagina. */
  document.querySelectorAll('.sobre__bloco, .sobre__texto .cta').forEach(function (block) {
    block.classList.add('reveal');
    pendentes.push(block);
  });

  if (processo) pendentes.push(processo);

  /* Comparacao direta com a linha de gatilho, e nao IntersectionObserver.
     O observador so dispara quando o estado de intersecao muda, entao um
     salto de uma vez ate o fim da pagina (ancora, tecla End, restauracao de
     scroll do navegador) passa por cima dos blocos sem nunca acusar, e eles
     ficam invisiveis para sempre. Aqui um bloco acima da linha resolve,
     tenha ele cruzado devagar ou de um pulo so. */
  function resolver() {
    agendado = false;
    var linha = root.clientHeight - MARGEM_INFERIOR;

    pendentes = pendentes.filter(function (block) {
      if (block.getBoundingClientRect().top > linha) return true;
      block.classList.add('is-visible');
      return false;
    });

    if (pendentes.length === 0) {
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', agendar);
    }
  }

  var agendado = false;

  function agendar() {
    if (agendado) return;
    agendado = true;
    window.requestAnimationFrame(resolver);
  }

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  resolver();

  /* ---- 8. manifesto: leitura conforme o scroll ----
     Traduzido do Text Scroll Read de @youcefbnm, mas com outro mecanismo.
     O componente usa um degrade com background-clip: text, e um degrade e
     uma faixa vertical unica, entao ele varre as tres linhas ao mesmo tempo
     e o corte atravessa o bloco na diagonal. Para ler em ordem, linha por
     linha, a conta precisa ser por letra.

     O offset do original, ['start end', 'center start'], so completa quando
     o CENTRO do bloco alcanca o topo da tela, ou seja com o texto quase
     fora de vista. Encurtei o percurso: comeca igual, quando o topo do
     bloco encosta na base da tela, e termina quando a BASE dele chega a
     80% da altura da tela. Nesse ponto o texto inteiro esta visivel. */
  var leituras = [];

  /* Quebra so os nos de texto, deixando <strong> e a estrela de pe. Os
     espacos ficam como texto solto para a quebra de linha continuar natural. */
  function numerarLetras(raiz) {
    var i = 0;
    var nos = [];
    var passo = document.createTreeWalker(
      raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var no;

    while ((no = passo.nextNode())) {
      if (no.nodeType === 1) {
        if (no.classList.contains('manifesto__star')) nos.push(no);
      } else if (no.nodeValue.trim() !== '') {
        nos.push(no);
      }
    }

    nos.forEach(function (alvo) {
      if (alvo.nodeType === 1) {           // a estrela entra na fila tambem
        alvo.style.setProperty('--i', i++);
        return;
      }

      var frag = document.createDocumentFragment();
      alvo.nodeValue.split('').forEach(function (c) {
        if (/\s/.test(c)) {
          frag.appendChild(document.createTextNode(' '));
          return;
        }
        var span = document.createElement('span');
        span.className = 'letra-lida';
        span.style.setProperty('--i', i++);
        span.textContent = c;
        frag.appendChild(span);
      });
      alvo.parentNode.replaceChild(frag, alvo);
    });

    return i;
  }

  /* Cada bloco marcado com .leitura acende por conta propria: o manifesto e a
     prosa do sobre. Os tres paragrafos do sobre vivem num wrapper so, entao a
     numeracao corre continua entre eles e o texto le como uma frase unica. */
  document.querySelectorAll('.leitura').forEach(function (bloco) {
    var total = numerarLetras(bloco);
    if (total) leituras.push({ bloco: bloco, total: total });
  });

  function lerManifesto() {
    var alt = root.clientHeight;

    leituras.forEach(function (item) {
      var caixa = item.bloco.getBoundingClientRect();
      var percurso = alt * 0.2 + caixa.height;   // ate a base chegar a 80% da tela
      var p = (alt - caixa.top) / percurso;

      if (p < 0) p = 0;
      if (p > 1) p = 1;

      /* Uma unica escrita por quadro; o CSS compara --lidas com o --i de cada
         letra. O "+ 4" e a folga da rampa: sem ele --lidas termina igual ao
         total e a ultima letra para em um terco da opacidade. */
      item.bloco.style.setProperty('--lidas', (p * (item.total + 4)).toFixed(1));
    });
  }

  var lendo = false;

  function agendarLeitura() {
    if (lendo) return;
    lendo = true;
    window.requestAnimationFrame(function () {
      lendo = false;
      lerManifesto();
    });
  }

  lerManifesto();
  window.addEventListener('scroll', agendarLeitura, { passive: true });
  window.addEventListener('resize', agendarLeitura);

  /* ---- 9. distorcao das capas conforme a velocidade do scroll ----
     A capa se comporta como uma folha presa pelas pontas: a borda de tras
     fica para tras e vira um arco. Rolando para baixo curva a borda de
     baixo, rolando para cima curva a de cima. Parou, volta ao reto.

     O arco sai de border-radius com raio horizontal de 50% nos dois cantos
     da mesma borda: os dois se encontram no meio e formam uma curva unica
     de ponta a ponta, em vez de dois cantos arredondados soltos. So o raio
     vertical e animado, e ele nao mexe no layout, so no recorte. */
  var CURVA_MAX = 72;       // profundidade do arco no pico, em px
  var SENSIBILIDADE = 0.9;  // px de arco por px de scroll no quadro
  var SUAVIZA = 0.18;       // quanto do alvo e alcancado por quadro

  var capas = document.querySelectorAll('.project__media');
  if (!capas.length) return;

  var ultimoY = window.scrollY;
  var curva = 0;
  var rodando = false;

  function aplicar(valor) {
    var n = Math.abs(valor).toFixed(1) + 'px';
    var raio = valor >= 0
      ? '0 0 50% 50% / 0 0 ' + n + ' ' + n    // borda de baixo
      : '50% 50% 0 0 / ' + n + ' ' + n + ' 0 0'; // borda de cima

    capas.forEach(function (capa) {
      capa.style.borderRadius = valor === 0 ? '' : raio;
    });
  }

  function quadro() {
    var y = window.scrollY;
    var v = y - ultimoY;
    ultimoY = y;

    var alvo = v * SENSIBILIDADE;
    if (alvo > CURVA_MAX) alvo = CURVA_MAX;
    if (alvo < -CURVA_MAX) alvo = -CURVA_MAX;

    curva += (alvo - curva) * SUAVIZA;
    if (Math.abs(curva) < 0.25) curva = 0;

    aplicar(curva);

    if (curva !== 0 || v !== 0) {
      window.requestAnimationFrame(quadro);
    } else {
      rodando = false;
    }
  }

  window.addEventListener('scroll', function () {
    if (rodando) return;
    rodando = true;
    ultimoY = window.scrollY;
    window.requestAnimationFrame(quadro);
  }, { passive: true });
})();
