/**
 * EL FONDO — agua en el azul de la marca.
 *
 * El azul liso dejaba a las gotas flotando sobre nada. Este fondo es el agua
 * sobre la que están, vista desde arriba: la red de luz que se forma en el
 * fondo de una piscina (cáusticas), con zonas más hondas entre los hilos.
 *
 * CÓMO SE CALCULA. No es una textura ni un ruido con forma de agua: es la
 * óptica de verdad, simplificada. La superficie es una suma de ondas. La luz
 * que la atraviesa se desvía según la pendiente de esas ondas, y donde los
 * rayos vecinos se juntan aparece un hilo brillante; donde se separan, una
 * zona oscura. Cuánto se juntan lo da el determinante del jacobiano del
 * desvío, que con ondas senoidales tiene fórmula exacta. Por eso los hilos
 * salen nítidos a cualquier resolución y no hace falta ninguna extensión.
 *
 * LO QUE NO PUEDE HACER: bajar el contraste del texto. El contraste se gana
 * hacia abajo: las zonas tranquilas son el azul de la marca, las hondas van
 * hacia un azul más profundo, y los hilos de luz tienen un tope
 * (`CLARO` = 0.30, 0.31, 1.0) con el que el texto hueso queda en 4.7:1 aun
 * con `INTENSIDAD` a 1, por encima del 4.5:1 que pide WCAG AA. Si se toca
 * `CLARO`, hay que recalcularlo.
 *
 * COSTE: se dibuja a la mitad de la resolución y a 30 fotogramas por segundo;
 * son seis senos por píxel. Se desplaza con el scroll, más despacio que la
 * página, y el agua se agita un poco más mientras se hace scroll. Con la
 * pestaña en segundo plano no dibuja.
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

// Azul de la marca, un azul más hondo y el tope de luz de los hilos.
const vec3 AZUL = vec3(0.255, 0.255, 0.976);
const vec3 HONDO = vec3(0.175, 0.175, 0.84);
const vec3 CLARO = vec3(0.30, 0.31, 1.0);
// Cuánto se nota el agua sobre el azul liso: 0 = nada, 1 = todo. A 1 se
// pidió bajarla a la mitad por demasiado visible; casi a 0 era aburrida.
const float INTENSIDAD = 0.5;

// Segunda derivada de la superficie: lo que aporta una onda a la curvatura.
// \`fuerza\` ya incluye amplitud, número de onda y cuánto desvía la luz.
void onda(vec2 p, vec2 dir, float k, float fase, float fuerza, inout vec3 h) {
  float s = sin(k * dot(dir, p) + fase) * fuerza;
  h.x -= s * dir.x * dir.x;
  h.y -= s * dir.y * dir.y;
  h.z -= s * dir.x * dir.y;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uTamano;
  // Misma escala en los dos ejes, medida en altos de pantalla.
  vec2 p = vec2(uv.x * uTamano.x / uTamano.y, uv.y);
  // El fondo sube más despacio que la página: queda detrás.
  p.y -= uScroll;

  float t = uTiempo;
  // Una ondulación lenta y ancha deforma el dominio: sin ella, la suma de
  // ondas se repetiría como un papel pintado.
  p += 0.045 * vec2(sin(p.y * 2.3 + t * 0.21), cos(p.x * 1.9 - t * 0.17));

  // Curvatura de la superficie (xx, yy, xy): seis ondas en direcciones y
  // tamaños que no encajan entre sí.
  vec3 h = vec3(0.0);
  onda(p, vec2(0.966, 0.259), 17.0, t * 0.61, 0.56, h);
  onda(p, vec2(-0.342, 0.940), 23.0, -t * 0.47 + 1.3, 0.52, h);
  onda(p, vec2(0.574, -0.819), 29.0, t * 0.74 + 4.1, 0.46, h);
  onda(p, vec2(-0.866, -0.5), 37.0, -t * 0.55 + 2.2, 0.4, h);
  onda(p, vec2(0.139, 0.990), 46.0, t * 0.83 + 0.7, 0.32, h);
  onda(p, vec2(0.788, 0.616), 11.0, -t * 0.33 + 5.0, 0.5, h);

  // Cuánto se concentra la luz: inverso del área que ocupan los rayos tras
  // desviarse. Cerca de cero el área se pliega y ahí está el hilo.
  float area = abs((1.0 + h.x) * (1.0 + h.y) - h.z * h.z);
  float luz = 1.0 / (area + 0.13);

  // Zonas hondas donde la luz se dispersa, azul de marca donde llega normal.
  vec3 color = mix(HONDO, AZUL, smoothstep(0.3, 1.15, luz));
  // Hilos de luz, con tope.
  color = mix(color, CLARO, smoothstep(1.5, 4.5, luz));
  // Un poco más de fondo hacia abajo a la derecha: la luz viene de arriba a
  // la izquierda, como en las gotas (en gl_FragCoord, y crece hacia arriba).
  color = mix(color, HONDO, smoothstep(0.35, 1.5, distance(uv, vec2(0.0, 1.0))) * 0.22);

  gl_FragColor = vec4(mix(AZUL, min(color, CLARO), INTENSIDAD), 1.0);
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
    // La mitad de la resolución, con tope: los hilos son finos y a un tercio
    // se emborronan. El navegador lo estira al tamaño de la ventana.
    const ancho = Math.min(960, Math.max(240, Math.round(window.innerWidth / 2)));
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
  /** Reloj del agua: avanza solo, y algo más deprisa mientras se hace scroll. */
  let agua = 0;
  let scrollPrevio = window.scrollY;
  let agitacion = 0;

  function bucle(ms: number) {
    cuadro = 0;
    if (!vivo) return;
    // 30 por segundo: se salta un fotograma de cada dos en pantallas de 60 Hz.
    if (ms - ultimo >= 30) {
      const dt = Math.min(0.1, ultimo ? (ms - ultimo) / 1000 : 0.033);
      ultimo = ms;
      // El scroll agita el agua; al parar, se calma sola.
      const y = window.scrollY;
      const velocidad = Math.min(1, Math.abs(y - scrollPrevio) / dt / 2200);
      scrollPrevio = y;
      agitacion += (velocidad - agitacion) * Math.min(1, dt * 4);
      agua += dt * (0.55 + agitacion * 1.6);

      gl!.uniform1f(uTiempo, agua);
      gl!.uniform1f(uScroll, (y / Math.max(1, window.innerHeight)) * 0.32);
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
