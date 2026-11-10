/**
 * EL FONDO — agua en el azul de la marca.
 *
 * El azul liso dejaba a las gotas flotando sobre nada. Este fondo es la
 * superficie sobre la que están: zonas apenas más hondas que se desplazan muy
 * despacio y un veteado de luz finísimo, como el que deja el sol al pasar por
 * el agua. La luz viene de arriba a la izquierda, igual que en los retratos.
 *
 * LO QUE NO PUEDE HACER: bajar el contraste del texto. El azul de la marca es
 * el tono más claro de casi todo el fondo; el veteado lo aclara como mucho un
 * 3 %, con lo que el texto hueso sigue por encima de 4.5:1 en cualquier punto.
 * Si se tocan los valores del shader, hay que volver a comprobarlo.
 *
 * COSTE: se dibuja a un tercio de la resolución (es todo suave, no se nota) y
 * a 30 fotogramas por segundo. Se mueve con el scroll, más despacio que la
 * página, y deriva muy lentamente cuando nadie toca nada. Con la pestaña en
 * segundo plano no dibuja.
 *
 * Tiene su propio contexto WebGL (el segundo y último del sitio): es un
 * lienzo fijo a pantalla completa, y eso no encaja en el contexto compartido
 * de los retratos, que copia a lienzos que viajan con la página.
 *
 * Sin WebGL o con movimiento reducido no se monta y queda el azul del <body>.
 */

const VERTICES = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENTOS = /* glsl */ `
precision highp float;
uniform vec2 uTamano;
uniform float uTiempo;
uniform float uScroll;

float azar(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(azar(i), azar(i + vec2(1.0, 0.0)), f.x),
    mix(azar(i + vec2(0.0, 1.0)), azar(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float nube(vec2 p) {
  return ruido(p) * 0.6 + ruido(p * 2.03 + 7.1) * 0.28 + ruido(p * 4.1 + 3.7) * 0.12;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uTamano;
  // Misma escala en los dos ejes, medida en altos de pantalla.
  vec2 p = vec2(uv.x * uTamano.x / uTamano.y, uv.y);
  // El fondo sube más despacio que la página: queda detrás.
  p.y -= uScroll;

  float t = uTiempo;
  // Dos capas de ruido; la primera arrastra a la segunda, y eso es lo que
  // hace que parezca líquido y no una nube.
  vec2 q = p * 1.15 + vec2(t * 0.8, -t * 0.55);
  float a = nube(q);
  float b = nube(q * 2.1 + vec2(a * 1.9 - t, a * 1.3 + t * 0.6));

  vec3 azul = vec3(0.255, 0.255, 0.976);
  vec3 hondo = vec3(0.2, 0.2, 0.89);

  // Zonas más hondas, anchas y suaves.
  vec3 color = mix(azul, hondo, smoothstep(0.38, 0.78, a) * 0.62);
  // Veteado de luz: solo donde la segunda capa pasa por su valor medio.
  float veta = pow(1.0 - abs(b * 2.0 - 1.0), 6.0);
  color += vec3(0.55, 0.6, 1.0) * veta * 0.03;
  // Luz general desde arriba a la izquierda (en gl_FragCoord, y crece hacia arriba).
  color += vec3(0.022, 0.022, 0.0) * (1.0 - smoothstep(0.0, 1.25, distance(uv, vec2(0.0, 1.0))));

  gl_FragColor = vec4(color, 1.0);
}`;

type Fondo = { lienzo: HTMLCanvasElement; destruir(): void };

let fondo: Fondo | null = null;
let descartado = false;

/**
 * Monta el fondo (una sola vez) y lo deja dentro del <body> actual. Se llama
 * en cada cambio de página: Astro sustituye el <body> y el lienzo, que es el
 * mismo durante toda la visita, hay que volver a colgarlo.
 */
export function montarFondo(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    soltarFondo();
    return;
  }
  if (!fondo && !descartado) {
    fondo = crear();
    if (!fondo) descartado = true;
  }
  if (fondo && fondo.lienzo.parentElement !== document.body) {
    document.body.prepend(fondo.lienzo);
  }
}

export function soltarFondo(): void {
  fondo?.destruir();
  fondo = null;
}

function crear(): Fondo | null {
  const lienzo = document.createElement("canvas");
  lienzo.className = "fondo-agua";
  lienzo.setAttribute("aria-hidden", "true");
  const gl = lienzo.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const compilar = (tipo: number, codigo: string) => {
    const s = gl.createShader(tipo)!;
    gl.shaderSource(s, codigo);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compilar(gl.VERTEX_SHADER, VERTICES);
  const fs = compilar(gl.FRAGMENT_SHADER, FRAGMENTOS);
  if (!vs || !fs) return null;
  const programa = gl.createProgram()!;
  gl.attachShader(programa, vs);
  gl.attachShader(programa, fs);
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return null;
  gl.useProgram(programa);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTamano = gl.getUniformLocation(programa, "uTamano");
  const uTiempo = gl.getUniformLocation(programa, "uTiempo");
  const uScroll = gl.getUniformLocation(programa, "uScroll");

  function ajustar() {
    // Un tercio de la resolución, con tope: todo es suave y el navegador lo
    // estira sin que se note.
    const ancho = Math.min(640, Math.max(200, Math.round(window.innerWidth / 3)));
    const alto = Math.max(120, Math.round((ancho * window.innerHeight) / Math.max(1, window.innerWidth)));
    if (lienzo.width !== ancho || lienzo.height !== alto) {
      lienzo.width = ancho;
      lienzo.height = alto;
      gl!.viewport(0, 0, ancho, alto);
      gl!.uniform2f(uTamano, ancho, alto);
    }
  }
  ajustar();

  let vivo = true;
  let cuadro = 0;
  let ultimo = 0;
  const inicio = performance.now();

  function bucle(ms: number) {
    cuadro = 0;
    if (!vivo) return;
    // 30 por segundo: se salta un fotograma de cada dos en pantallas de 60 Hz.
    if (ms - ultimo >= 30) {
      ultimo = ms;
      gl!.uniform1f(uTiempo, ((ms - inicio) / 1000) * 0.018);
      gl!.uniform1f(uScroll, (window.scrollY / Math.max(1, window.innerHeight)) * 0.32);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    pedir();
  }

  function pedir() {
    if (vivo && !cuadro && !document.hidden) cuadro = requestAnimationFrame(bucle);
  }

  const eventos = new AbortController();
  window.addEventListener("resize", ajustar, { signal: eventos.signal });
  document.addEventListener("visibilitychange", pedir, { signal: eventos.signal });
  lienzo.addEventListener(
    "webglcontextlost",
    (evento) => {
      evento.preventDefault();
      descartado = true;
      soltarFondo();
    },
    { signal: eventos.signal },
  );
  pedir();

  return {
    lienzo,
    destruir() {
      vivo = false;
      cancelAnimationFrame(cuadro);
      eventos.abort();
      lienzo.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
