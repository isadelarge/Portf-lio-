/* Fundo animado da intro.

   Traduzido do componente ShaderBackground de @designeryue no 21st.dev
   ("Mesh drift", gerado pelo Shader Builder). O shader e o setup de WebGL
   sao copia fiel do original; o que mudou foi so o involucro: saiu o
   useRef/useEffect do React e entrou uma funcao que recebe o canvas.

   A receita traz cursorEnabled: false, entao todo o rastreamento de
   ponteiro do original foi removido e o uniform de cursor vai zerado.

   Com prefers-reduced-motion o shader desenha um quadro so e para. */

(function () {
  'use strict';

  /* Cada instancia deixa aqui a funcao que pede um quadro. O painel do menu
     fica escondido quase o tempo todo, e o canvas dele para de desenhar
     enquanto isso; quando o painel abre, nao ha scroll nem resize para
     religar o loop, entao quem abre chama window.acordarShaders(). */
  var acordadores = [];

  var VERT = 'attribute vec2 a_position;\n' +
    'void main() {\n' +
    '  gl_Position = vec4(a_position, 0.0, 1.0);\n' +
    '}';

  var FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
// Seven packed vectors + eight colour vectors = 15 fragment uniform vectors,
// one below WebGL1's guaranteed minimum. Macros preserve the public u_* API.
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
// Keep hash inputs inside mediump's guaranteed ±2^14 range.
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Even, un-structured white noise for film grain (Dave Hoskins hash12). The
// multiply hash above is fine for value noise but shows a faint axis-aligned
// mesh at integer fragment coords, which reads as a net over flat areas.
float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(15731.743, 7892.321) * n);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

// --- OKLab colour mixing (perceptual), gated by u_oklab -----------------------
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  // max() guards the sRGB branch: out-of-gamut OKLab interpolations can send a
  // channel negative, and pow(negative, …) is NaN which mix()/step() would
  // then propagate. The linear branch clips such channels to 0 downstream.
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

// Mix through the recipe colours; x is clamped to 0..1. WebGL1 forbids
// dynamic uniform indexing in fragment shaders, hence the constant loop.
vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  vec3 acc = u_colors[0] * 0.15;
  float total = 0.15;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= u_colorCount) break;
    float fi = float(i);
    vec2 c = vec2(
      sin(t * (0.21 + fi * 0.071) + fi * 2.4 + u_seed),
      cos(t * (0.17 + fi * 0.093) + fi * 1.7)) * (0.45 + u_intensity * 0.35);
    float w = exp(-dot(p - c, p - c) * 6.0);
    acc += u_colors[i] * w;
    total += w;
  }
  return acc / total;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);
  float cursorMask = 0.0;

  // Cursor modes 1–3 are local distortions. Push shifts the same screen-space
  // coordinates before field transforms, so Zoom/Rotate don't change its feel.
  if (u_cursorPresence > 0.001) {
    // u_mouse is normalized to -1..1 in canvas space. Convert it to the same
    // aspect-corrected screen space as p so effects stay under the cursor.
    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)
      / min(u_resolution.x, u_resolution.y);
    vec2 cursorDelta = p - cursor;
    if (u_cursorEffect < 0.5) {
      p += cursor * u_cursorPresence * u_cursorStrength * 0.55;
    } else {
      float cursorDistance = length(cursorDelta);
      vec2 cursorDirection = cursorDelta / max(cursorDistance, 0.0001);
      cursorMask = u_cursorPresence
        * (1.0 - smoothstep(0.0, u_cursorRadius, cursorDistance));
      if (u_cursorEffect < 1.5) {
        p -= cursorDirection * cursorMask * u_cursorStrength * 0.24;
      } else if (u_cursorEffect < 2.5) {
        float cursorAngle = cursorMask * u_cursorStrength * 2.2;
        float cc = cos(cursorAngle), cs = sin(cursorAngle);
        p = cursor + mat2(cc, -cs, cs, cc) * cursorDelta;
      } else if (u_cursorEffect < 3.5) {
        float ripple = sin(
          cursorDistance / max(u_cursorRadius, 0.001) * 18.0 - u_time * 5.0);
        p -= cursorDirection * ripple * cursorMask * u_cursorStrength * 0.07;
      }
    }
  }

  // Keep presets that read uv (rather than p) in the same warped space.
  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  // Field transform: rotate, pan, pointer push, slow drift.
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  // Organic domain warp.
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  // Shade, with an optional soft 5-tap blur.
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  // Post: contrast, saturation, hue, brightness, vignette, grain.
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_cursorPresence > 0.001 && u_cursorEffect > 3.5)
    col += (vec3(0.18) + col * 0.12) * cursorMask * u_cursorStrength;
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  /* Receita, igual a do componente original. */
  var UNIFORMS = {
    colors: [
      [0, 0.07058823529411765, 0.09803921568627451],
      [0, 0.37254901960784315, 0.45098039215686275],
      [0.5803921568627451, 0.8235294117647058, 0.7411764705882353],
      [0.9137254901960784, 0.8470588235294118, 0.6509803921568628],
      [0.9137254901960784, 0.8470588235294118, 0.6509803921568628],
      [0.9137254901960784, 0.8470588235294118, 0.6509803921568628],
      [0.9137254901960784, 0.8470588235294118, 0.6509803921568628],
      [0.9137254901960784, 0.8470588235294118, 0.6509803921568628]
    ],
    colorCount: 4,
    scale: 2.000,
    intensity: 0.540,
    paramA: 0.470,
    warp: 0.042,
    detail: 1.536,
    contrast: 1.158,
    brightness: 0.000,
    saturation: 1.000,
    hue: 0.0000,
    vignette: 0.210,
    blur: 0.0020,
    grain: 0.101,
    seed: 4012.0,
    rotate: 5.6549,
    offsetX: 0.110,
    offsetY: -0.190,
    drift: 0.116,
    cursorEffect: 2.0,
    cursorStrength: 0.650,
    cursorRadius: 0.460,
    oklab: 0.0,
    timeScale: -0.727
  };

  function iniciar(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false });
    if (!gl) return false;

    function compilar(tipo, fonte) {
      var s = gl.createShader(tipo);
      gl.shaderSource(s, fonte);
      gl.compileShader(s);
      return s;
    }

    var program = gl.createProgram();
    var vs = compilar(gl.VERTEX_SHADER, VERT);
    var fs = compilar(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    // O original nao confere isto. Sem a conferencia, uma falha de compilacao
    // deixa um canvas vazio por cima do fundo e a intro fica preta sem motivo
    // aparente. Aqui a falha devolve false e o CSS assume.
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS) ||
        !gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return false;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uni = {
      colors: gl.getUniformLocation(program, 'u_colors'),
      scene: gl.getUniformLocation(program, 'u_scene'),
      shape: gl.getUniformLocation(program, 'u_shape'),
      surface: gl.getUniformLocation(program, 'u_surface'),
      finish: gl.getUniformLocation(program, 'u_finish'),
      transform: gl.getUniformLocation(program, 'u_transform'),
      space: gl.getUniformLocation(program, 'u_space'),
      cursor: gl.getUniformLocation(program, 'u_cursor')
    };

    var planas = [];
    for (var i = 0; i < UNIFORMS.colors.length; i++) {
      planas.push(UNIFORMS.colors[i][0], UNIFORMS.colors[i][1], UNIFORMS.colors[i][2]);
    }
    gl.uniform3fv(uni.colors, new Float32Array(planas));
    gl.uniform4f(uni.shape, UNIFORMS.scale, UNIFORMS.intensity, UNIFORMS.paramA, UNIFORMS.warp);
    gl.uniform4f(uni.surface, UNIFORMS.detail, UNIFORMS.contrast, UNIFORMS.brightness, UNIFORMS.saturation);
    gl.uniform4f(uni.finish, UNIFORMS.hue, UNIFORMS.vignette, UNIFORMS.blur, UNIFORMS.grain);
    gl.uniform4f(uni.transform, UNIFORMS.seed, UNIFORMS.rotate, UNIFORMS.drift, UNIFORMS.oklab);
    gl.uniform4f(uni.space, UNIFORMS.offsetX, UNIFORMS.offsetY, 0, 0);
    // cursorEnabled e false na receita, entao a presenca vai sempre zerada
    gl.uniform4f(uni.cursor, 0, UNIFORMS.cursorEffect, UNIFORMS.cursorStrength, UNIFORMS.cursorRadius);

    var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var medida = null;   /* ultima caixa medida, compartilhada com o recorte */
    var inicio = performance.now();
    var raf = 0;
    var visivel = document.visibilityState === 'visible';
    var naTela = true;

    function dimensionar() {
      var caixa = canvas.getBoundingClientRect();
      medida = caixa;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var bruW = Math.max(1, Math.round(caixa.width * dpr));
      var bruH = Math.max(1, Math.round(caixa.height * dpr));
      var escala = Math.min(1, Math.sqrt(2000000 / Math.max(1, bruW * bruH)));
      var w = Math.max(1, Math.round(bruW * escala));
      var h = Math.max(1, Math.round(bruH * escala));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    /* Recorte opcional. O canvas da navbar tem 100svh de altura para o campo
       sair na mesma escala da intro, mas quem o mostra e uma faixa de ~67px,
       e ele nunca sai da tela. Sem isto o fragment shader rodaria nos 100svh
       inteiros a cada quadro pelo resto da pagina, e ele e caro: fbm de cinco
       oitavas mais o blur de cinco amostras.

       O scissor resolve sem tocar na imagem: gl_FragCoord continua em coordenada
       de canvas cheio, entao o campo e o mesmo, e so os fragmentos da faixa
       visivel sao sombreados. A janela e o elemento pai, e a conta refaz a cada
       quadro porque a faixa viaja durante a intro. */
    var recorta = canvas.hasAttribute('data-shader-recorte');
    var presoAntes = false;

    function recortar(caixa) {
      var janela = canvas.parentElement.getBoundingClientRect();
      var desloca = janela.top - caixa.top;

      /* Enquanto a faixa viaja, o recorte nao pode sair do layout. A barra
         desce e o canvas sobe, os dois por animacao de scroll, que roda no
         compositor: o quadro apresentado ja esta num scroll mais novo do que
         o que a main thread acabou de medir, e a distancia entre os dois anda
         ao dobro da velocidade do scroll. Numa janela de 67px isso jogava a
         faixa toda para fora do scissor, e ela aparecia chapada de preto, o
         --dark do .navbar__fundo, com o texto no meio.

         Nessa faixa de scroll, que e so a intro, desenha o canvas inteiro:
         nao ha fileira sem sombrear se todas foram sombreadas. Depois que a
         barra prende no topo ela nao se move mais, o layout volta a ser
         verdade e o recorte vale pelo resto da pagina, que e onde ele paga. */
      /* Precisa de dois quadros parados para valer, e nao de um. No quadro em
         que a barra acabou de prender, a main thread ja le desloca 0 mas o
         compositor pode apresentar a faixa alguns px abaixo, e o recorte da
         posicao presa deixaria uma nesga sem sombrear. */
      var preso = desloca <= 0.5;
      if (!preso || !presoAntes) {
        presoAntes = preso;
        gl.disable(gl.SCISSOR_TEST);
        return;
      }

      // de px de CSS para px de canvas: a razao ja embute o dpr e o teto de area
      var k = caixa.height ? canvas.height / caixa.height : 1;
      // gl_FragCoord conta de baixo para cima, e a janela vem medida de cima
      var topo = canvas.height - desloca * k;
      /* Arredonda para fora, um px de cada lado. A borda da janela cai em meio
         px sempre que a barra para numa fracao, e arredondar para dentro deixa
         uma fileira sem sombrear: um fio escuro no pe da faixa. Desenhar um px
         a mais nao custa nada, porque o CSS ja recorta o que passa. */
      var base = Math.floor(topo - janela.height * k) - 1;
      var altura = Math.max(1, Math.ceil(topo) + 1 - base);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, base, canvas.width, altura);
    }

    /* O IntersectionObserver nao enxerga visibility: hidden, entao sem isto o
       canvas do painel do menu desenharia os 100svh dele a cada quadro com o
       painel fechado. O sinal e o aria-hidden do painel, e nao o visibility
       computado: aria-hidden muda na mesma hora em que o painel abre ou
       fecha, enquanto visibility so vira no fim de uma transicao, que nem
       chega a rodar quando a aba esta em segundo plano. */
    var alvoPausa = canvas.getAttribute('data-shader-pausa');
    var painelPausa = alvoPausa ? document.querySelector(alvoPausa) : null;

    function escondido() {
      return painelPausa !== null &&
        painelPausa.getAttribute('aria-hidden') === 'true';
    }

    function pedirQuadro() {
      if (visivel && naTela && raf === 0) raf = requestAnimationFrame(desenhar);
    }

    acordadores.push(pedirQuadro);

    function desenhar(agora) {
      raf = 0;
      if (!visivel || !naTela || escondido()) return;
      dimensionar();
      if (recorta) recortar(medida);
      gl.uniform4f(uni.scene, canvas.width, canvas.height,
        ((agora - inicio) / 1000) * UNIFORMS.timeScale, UNIFORMS.colorCount);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Sem movimento reduzido o quadro se repete; com ele, desenha uma vez
      if (!reduzido) pedirQuadro();
    }

    var ro = new ResizeObserver(function () { dimensionar(); pedirQuadro(); });
    ro.observe(canvas);

    var io = new IntersectionObserver(function (entradas) {
      naTela = entradas[0] ? entradas[0].isIntersecting : true;
      if (naTela) pedirQuadro();
      else if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(canvas);

    document.addEventListener('visibilitychange', function () {
      visivel = document.visibilityState === 'visible';
      if (visivel) pedirQuadro();
      else if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
    });

    window.addEventListener('resize', function () { dimensionar(); pedirQuadro(); });

    dimensionar();
    pedirQuadro();
    return true;
  }

  /* Cada canvas marcado com data-shader ganha o seu proprio contexto de
     WebGL, rodando a mesma receita e a mesma semente, entao os tres desenham
     o mesmo quadro: a intro, a faixa da navbar e o rodape. A intro e o rodape
     pausam sozinhos quando saem da tela, pelo IntersectionObserver la de cima.
     A faixa da navbar nunca sai, e por isso ela pede o recorte. */
  var adiados = [];

  document.querySelectorAll('canvas[data-shader]').forEach(function (canvas) {
    /* Os gradientes dos paineis nascem so quando o painel abre pela primeira
       vez. Cada um custa um contexto de WebGL e um buffer do tamanho da
       viewport, e no telefone isso era 2,4 Mpx de GPU reservados em toda
       visita para uma gaveta que a maioria das pessoas nunca abre. Depois de
       aberto ele segue vivo: quem abriu uma vez costuma abrir de novo. */
    if (canvas.hasAttribute('data-shader-pausa')) {
      adiados.push(canvas);
      return;
    }
    // sem WebGL o canvas some e fica a cor solida do CSS
    if (!iniciar(canvas)) canvas.remove();
  });

  window.acordarShaders = function () {
    /* So o painel que esta abrindo agora: acordar os dois criaria o contexto
       do outro a toa, que e justamente o que este adiamento evita. */
    adiados = adiados.filter(function (canvas) {
      var painel = document.querySelector(canvas.getAttribute('data-shader-pausa'));
      if (painel && painel.getAttribute('aria-hidden') === 'true') return true;
      if (!iniciar(canvas)) canvas.remove();
      return false;
    });

    acordadores.forEach(function (pedir) { pedir(); });
  };
})();
