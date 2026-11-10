/**
 * EL MATERIAL DE LOS RETRATOS — vidrio líquido, en WebGL.
 *
 * Cada retrato es una gota. El blob ya era la forma de la marca; aquí gana
 * volumen. No hay barridos, cortinas ni disolvencias: todo lo que ocurre es
 * óptica, lo que haría una lente de verdad.
 *
 *   1. REFRACCIÓN. Cerca del borde la gota se curva y desvía la imagen hacia
 *      dentro, como el canto de una lupa. En el centro, la foto queda intacta.
 *   2. DISPERSIÓN. En ese mismo borde, rojo, verde y azul se desvían un poco
 *      distinto y aparece un filo de color.
 *   3. LUZ. Un brillo arriba a la izquierda, un rebote suave enfrente y una
 *      sombra interior fina: es lo que hace que se lea como volumen.
 *   4. ENFOQUE. Fuera de foco, la gota es vidrio esmerilado en la tinta azul
 *      de la escuela. Cuando recibe atención, enfoca: se aclara y toma color.
 *   5. RELEVO. Para pasar de una persona a otra, la primera se desenfoca y se
 *      acerca, y la segunda llega desde el desenfoque: un cambio de foco.
 *   6. INERCIA. Al hacer scroll, la imagen se retrasa un poco dentro de la
 *      gota, como un líquido. Responde al scroll, no al puntero.
 *
 * El recorte lo sigue haciendo el `clip-path` del SVG. El shader recibe esa
 * misma silueta como radios (lib/blob.ts) solo para saber dónde está el borde.
 *
 * RENDIMIENTO
 *
 * - UN SOLO CONTEXTO WebGL para todos los retratos. Los navegadores permiten
 *   pocos a la vez (en móvil, unos 8) y aquí hay hasta 16 blobs. Se pinta en
 *   un lienzo oculto y se copia a un <canvas> 2D por retrato. Los lienzos 2D
 *   viven dentro de la página y hacen scroll con ella: un único lienzo fijo a
 *   pantalla completa se desfasa del contenido en el scroll táctil.
 * - SOLO LO VISIBLE. Un IntersectionObserver descarta lo que está fuera.
 * - EN REPOSO, A MEDIA CADENCIA. La silueta respira despacio: basta pintar un
 *   fotograma de cada dos. Durante un enfoque o un relevo, todos.
 * - CON FRENO. Si el dispositivo no llega a tiempo, primero baja la
 *   resolución de los lienzos y después deja de pintar en reposo.
 * - El desenfoque sale de los mipmaps de la textura (una lectura), no de un
 *   núcleo de muchas muestras.
 *
 * SI ALGO FALLA (sin WebGL, contexto perdido, movimiento reducido) no se monta
 * nada y quedan las fotos normales: el sitio funciona igual sin esto.
 */

import { gsap } from "gsap";
import { AGITADOS, CONTORNOS, MUESTRAS_CONTORNO } from "./blob";

type Imagen = HTMLImageElement | HTMLCanvasElement;
type Fuente = Imagen | HTMLVideoElement;

export type OpcionesTinta = {
  /** Una imagen por persona. En los retratos sueltos, una sola. */
  fuentes: Imagen[];
  /** 0 = vidrio esmerilado en tinta, 1 = enfocado y a color. Estado inicial. */
  foco?: number;
};

export type Tinta = {
  /** Enfoca la gota (o la deja fuera de foco). `segundos` es lo que tarda. */
  enfocar(activo: boolean, segundos?: number): gsap.core.Tween;
  /** Releva a la persona en pantalla por otra, con un cambio de foco. */
  relevar(indice: number): gsap.core.Tween;
  /** Cambia de persona sin animación. */
  fijar(indice: number): void;
  /** Acercamiento de una de las fuentes (1 = sin acercar). */
  acercar(indice: number, valor: number): void;
  /** Usa un vídeo como imagen de esa persona, o vuelve a su foto con null. */
  usarVideo(indice: number, video: HTMLVideoElement | null): void;
  readonly lienzo: HTMLCanvasElement;
  destruir(): void;
};

const VERTICES = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  // Y hacia abajo, como el DOM: (0,0) es la esquina superior izquierda.
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENTOS = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uRadios;
uniform vec2 uEscalaA;
uniform vec2 uEscalaB;
uniform float uZoomA;
uniform float uZoomB;
uniform float uRelevo;
uniform float uFoco;
uniform float uInercia;
uniform float uConContorno;
uniform vec3 uSombra;
uniform vec3 uMedio;
uniform vec3 uLuz;

const float PI = 3.14159265;
const float MUESTRAS = ${MUESTRAS_CONTORNO}.0;
// Ancho de la zona curva del borde, en fracción del lado. Estrecho a
// propósito: el volumen se lee en el filo y la cara queda fuera de él.
const float CANTO = 0.115;

float leerRadio(float indice) {
  vec4 t = texture2D(uRadios, vec2((indice + 0.5) / MUESTRAS, 0.5));
  // Dos bytes por radio: uno solo daría escalones visibles en el brillo.
  return (t.r * 65280.0 + t.g * 255.0) / 65535.0 * 0.75;
}

// Radio de la silueta en una dirección, interpolado entre dos muestras.
float radioEn(float angulo) {
  float x = (angulo + PI) / (2.0 * PI) * MUESTRAS - 0.5;
  float i = floor(x);
  return mix(leerRadio(i), leerRadio(i + 1.0), x - i);
}

vec3 leer(sampler2D t, vec2 uv, vec2 escala, float zoom, float nivel) {
  return texture2D(t, (uv - 0.5) * escala / zoom + 0.5, nivel).rgb;
}

// Una lectura a través de la gota: cada canal se desvía un poco distinto.
vec3 lente(sampler2D t, vec2 uv, vec2 escala, float zoom, vec2 desvio, float dispersion, float desenfoque) {
  vec2 rojo = desvio * (1.0 - dispersion);
  vec2 azul = desvio * (1.0 + dispersion);
  if (desenfoque < 0.015) {
    return vec3(
      leer(t, uv + rojo, escala, zoom, 0.0).r,
      leer(t, uv + desvio, escala, zoom, 0.0).g,
      leer(t, uv + azul, escala, zoom, 0.0).b
    );
  }
  // Desenfoque: un nivel más pequeño de la textura y cuatro lecturas en aspa
  // para que no se vean los bloques del nivel.
  float nivel = desenfoque * 5.2;
  float r = desenfoque * 0.022;
  vec3 c = vec3(0.0);
  vec2 o = vec2(r, r * 0.4);
  c += vec3(leer(t, uv + rojo + o, escala, zoom, nivel).r, leer(t, uv + desvio + o, escala, zoom, nivel).g, leer(t, uv + azul + o, escala, zoom, nivel).b);
  o = vec2(-r * 0.4, r);
  c += vec3(leer(t, uv + rojo + o, escala, zoom, nivel).r, leer(t, uv + desvio + o, escala, zoom, nivel).g, leer(t, uv + azul + o, escala, zoom, nivel).b);
  o = vec2(-r, -r * 0.4);
  c += vec3(leer(t, uv + rojo + o, escala, zoom, nivel).r, leer(t, uv + desvio + o, escala, zoom, nivel).g, leer(t, uv + azul + o, escala, zoom, nivel).b);
  o = vec2(r * 0.4, -r);
  c += vec3(leer(t, uv + rojo + o, escala, zoom, nivel).r, leer(t, uv + desvio + o, escala, zoom, nivel).g, leer(t, uv + azul + o, escala, zoom, nivel).b);
  return c * 0.25;
}

void main() {
  vec2 p = vUv - 0.5;
  float distancia = length(p);
  vec2 fuera = p / max(distancia, 0.0001);

  // PERFIL DE LA GOTA: plana en el centro, curva al acercarse al borde.
  float radio = uConContorno > 0.5 ? radioEn(atan(p.y, p.x)) : 0.44;
  float interior = clamp((radio - distancia) / CANTO, 0.0, 1.0);
  float curva = pow(1.0 - interior, 1.7);

  float movimiento = abs(uInercia);
  float velo = 1.0 - uFoco;

  // REFRACCIÓN: el canto desvía la imagen hacia el centro. El vidrio fuera de
  // foco es más grueso; al enfocar, se afina. La inercia del scroll la
  // desplaza entera, un poco, dentro de la gota.
  // Enfocada, el desvío es leve: el volumen lo dan sobre todo la luz y la
  // sombra, que no mueven la imagen.
  vec2 desvio = -fuera * curva * (mix(0.02, 0.055, velo) + movimiento * 0.02);
  desvio.y -= uInercia * 0.022 * (1.0 - curva);
  float dispersion = (mix(0.3, 0.36, velo) + movimiento * 0.3) * curva;

  vec3 color;
  if (uRelevo > 0.0) {
    // RELEVO: cambio de foco. La que sale se desenfoca y se acerca; la que
    // entra llega desde el desenfoque. A medio camino, las dos son luz.
    float sale = smoothstep(0.0, 0.6, uRelevo);
    float entra = 1.0 - smoothstep(0.4, 1.0, uRelevo);
    vec3 a = lente(uA, vUv, uEscalaA, uZoomA * (1.0 + sale * 0.14), desvio * (1.0 + sale * 1.6), dispersion + sale * 0.35, max(velo, sale));
    vec3 b = lente(uB, vUv, uEscalaB, uZoomB * (1.0 + entra * 0.14), desvio * (1.0 + entra * 1.6), dispersion + entra * 0.35, max(velo, entra));
    color = mix(a, b, smoothstep(0.32, 0.68, uRelevo));
  } else {
    color = lente(uA, vUv, uEscalaA, uZoomA, desvio, dispersion, velo);
  }

  // TINTA: fuera de foco, la gota toma los tres tonos de la marca.
  if (velo > 0.001) {
    float luz = dot(color, vec3(0.299, 0.587, 0.114));
    luz = smoothstep(0.02, 0.98, luz);
    vec3 tinta = mix(uSombra, uMedio, smoothstep(0.0, 0.55, luz));
    tinta = mix(tinta, uLuz, smoothstep(0.42, 1.0, luz));
    color = mix(color, tinta, smoothstep(0.0, 1.0, velo));
  }

  // LUZ: la normal se inclina hacia fuera en el canto. La luz viene de
  // arriba a la izquierda (en pantalla, -x y -y).
  vec3 normal = normalize(vec3(fuera * curva * 1.35, 0.62));
  vec3 luzDir = normalize(vec3(-0.55, -0.7, 0.55));
  float brillo = pow(max(dot(normal, luzDir), 0.0), 14.0) * smoothstep(0.0, 0.85, curva);
  float rebote = pow(max(dot(normal, normalize(vec3(0.55, 0.7, 0.5))), 0.0), 7.0) * curva;
  float sombra = curva * curva * (0.5 + 0.5 * dot(fuera, vec2(0.62, 0.78))) * 0.26;

  color *= 1.0 - sombra;
  color += vec3(1.0) * brillo * 0.5 + vec3(0.82, 0.88, 1.0) * rebote * 0.16;

  gl_FragColor = vec4(color, 1.0);
}`;

// Tres tonos de la marca: azul hondo, el azul del fondo y una lavanda clara.
// El tono medio es el del fondo de la página a propósito: fuera de foco, los
// medios tonos de la foto se funden con ella.
const TONOS = {
  sombra: [0.016, 0.016, 0.54],
  medio: [0.255, 0.255, 0.976],
  luz: [0.86, 0.88, 1.0],
};

/** Lado de las texturas de foto: potencia de dos, para poder usar mipmaps. */
const LADO_TEXTURA = 1024;
/** Cuántas texturas se conservan como mucho (cada una ocupa unos 5 MB). */
const TOPE_TEXTURAS = 10;
/** Escalones de resolución de los lienzos cuando el dispositivo va justo. */
const CALIDADES = [1, 0.75, 0.5];

type Textura = { textura: WebGLTexture; escala: [number, number]; uso: number };

type Pieza = {
  contenedor: HTMLElement;
  blob: Element | null;
  lienzo: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fotos: Imagen[];
  videos: (HTMLVideoElement | null)[];
  zooms: number[];
  a: number;
  b: number;
  relevo: number;
  foco: number;
  visible: boolean;
  sucia: boolean;
  pintada: boolean;
  tweens: Set<gsap.core.Tween>;
};

type Motor = {
  montar(contenedor: HTMLElement, opciones: OpcionesTinta): Tinta | null;
  destruir(): void;
};

let motor: Motor | null = null;
let descartado = false;

/**
 * El motor compartido, o null si este navegador o esta persona no lo admiten.
 * Es perezoso: no se crea ningún contexto hasta que alguien lo pide.
 */
export function obtenerTinta(): Motor | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  if (!motor && !descartado) {
    motor = crearMotor();
    if (!motor) descartado = true;
  }
  // `gl` en <html> es la señal para el CSS: esconde las fotos que el lienzo
  // va a sustituir, para que no se vean nítidas un instante antes del vidrio.
  // Astro reemplaza los atributos de <html> al navegar, así que se repone aquí.
  document.documentElement.classList.toggle("gl", motor !== null);
  return motor;
}

export function soltarTinta(): void {
  motor?.destruir();
  motor = null;
}

function crearMotor(): Motor | null {
  const base = document.createElement("canvas");
  base.width = base.height = 512;
  const gl = base.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "default",
  });
  if (!gl) return null;

  const compilar = (tipo: number, codigo: string) => {
    const s = gl.createShader(tipo)!;
    gl.shaderSource(s, codigo);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compilar(gl.VERTEX_SHADER, VERTICES);
  const fs = compilar(gl.FRAGMENT_SHADER, FRAGMENTOS);
  const programa = gl.createProgram()!;
  if (!vs || !fs) return null;
  gl.attachShader(programa, vs);
  gl.attachShader(programa, fs);
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return null;
  gl.useProgram(programa);

  // Un triángulo que cubre toda la pantalla: un vértice menos que un cuadrado
  // y sin la costura diagonal.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (nombre: string) => gl.getUniformLocation(programa, nombre);
  const uniformes = {
    escalaA: u("uEscalaA"),
    escalaB: u("uEscalaB"),
    zoomA: u("uZoomA"),
    zoomB: u("uZoomB"),
    relevo: u("uRelevo"),
    foco: u("uFoco"),
    inercia: u("uInercia"),
    conContorno: u("uConContorno"),
  };
  gl.uniform1i(u("uA"), 0);
  gl.uniform1i(u("uB"), 1);
  gl.uniform1i(u("uRadios"), 2);
  gl.uniform3fv(u("uSombra"), TONOS.sombra);
  gl.uniform3fv(u("uMedio"), TONOS.medio);
  gl.uniform3fv(u("uLuz"), TONOS.luz);

  // ---- Contorno: una tira de MUESTRAS x 1 con el radio en cada dirección ----
  const tiraRadios = gl.createTexture();
  const bytesRadios = new Uint8Array(MUESTRAS_CONTORNO * 4);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, tiraRadios);
  // Sin filtrar: los radios van en dos bytes y el filtro los mezclaría mal.
  // La interpolación entre vecinos la hace el shader.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, MUESTRAS_CONTORNO, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytesRadios);

  function subirContorno(radios: Float32Array) {
    for (let i = 0; i < MUESTRAS_CONTORNO; i++) {
      const valor = Math.round(Math.min(1, Math.max(0, radios[i]! / 0.75)) * 65535);
      bytesRadios[i * 4] = valor >> 8;
      bytesRadios[i * 4 + 1] = valor & 255;
    }
    gl!.activeTexture(gl!.TEXTURE2);
    gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, MUESTRAS_CONTORNO, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, bytesRadios);
  }

  // ---- Texturas ------------------------------------------------------------
  const texturas = new Map<Fuente, Textura>();
  /** Lienzo de trabajo: la foto se recorta a cuadrado y a potencia de dos. */
  const taller = document.createElement("canvas");
  taller.width = taller.height = LADO_TEXTURA;
  const tallerCtx = taller.getContext("2d");
  let reloj = 0;
  /** Subir una foto cuesta unos milisegundos: una por fotograma como mucho. */
  let cupo = 1;

  const piezas = new Set<Pieza>();

  function soltarTexturasViejas() {
    if (texturas.size <= TOPE_TEXTURAS) return;
    const enUso = new Set<Fuente>();
    for (const pieza of piezas) {
      if (!pieza.visible) continue;
      for (const f of [...pieza.fotos, ...pieza.videos]) if (f) enUso.add(f);
    }
    const candidatas = [...texturas.entries()]
      .filter(([fuente]) => !enUso.has(fuente))
      .sort((x, y) => x[1].uso - y[1].uso);
    for (const [fuente, entrada] of candidatas) {
      if (texturas.size <= TOPE_TEXTURAS) break;
      gl!.deleteTexture(entrada.textura);
      texturas.delete(fuente);
    }
  }

  function subir(fuente: Fuente): Textura | null {
    const esVideo = fuente instanceof HTMLVideoElement;
    let entrada = texturas.get(fuente);

    if (esVideo) {
      if (fuente.readyState < 2 || !fuente.videoWidth) return null;
      gl!.activeTexture(gl!.TEXTURE0);
      if (!entrada) {
        const textura = gl!.createTexture()!;
        gl!.bindTexture(gl!.TEXTURE_2D, textura);
        // El vídeo no es potencia de dos y cambia en cada fotograma: sin
        // mipmaps. Se ve nítido; durante un relevo, se funde sin desenfoque.
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
        entrada = { textura, escala: [1, 1], uso: 0 };
        texturas.set(fuente, entrada);
      }
      gl!.bindTexture(gl!.TEXTURE_2D, entrada.textura);
      try {
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, fuente);
      } catch {
        return null;
      }
      // Que el vídeo cubra el cuadrado sin deformarse.
      const { videoWidth: ancho, videoHeight: alto } = fuente;
      entrada.escala = ancho > alto ? [alto / ancho, 1] : [1, ancho / alto];
      entrada.uso = ++reloj;
      return entrada;
    }

    if (entrada) {
      entrada.uso = ++reloj;
      return entrada;
    }

    const ancho = fuente instanceof HTMLImageElement ? fuente.naturalWidth : fuente.width;
    const alto = fuente instanceof HTMLImageElement ? fuente.naturalHeight : fuente.height;
    if (!ancho || !alto || !tallerCtx) return null;
    if (fuente instanceof HTMLImageElement && !fuente.complete) return null;
    if (cupo <= 0) return null;
    cupo--;

    // Recorte a cuadrado, ya al tamaño de la textura, con el rostro en el
    // centro (`data-rostro="x,y,zoom"`, de lib/directorio.ts). Se dibuja la
    // imagen ENTERA dando solo el destino, sin rectángulo de origen: en una
    // <img> con srcset, `naturalWidth` viene corregido por densidad y no
    // coincide con los píxeles reales, así que un rectángulo de origen
    // calculado con él recorta un trozo ampliado. La proporción sí es fiable.
    const [rx = 0.5, ry = 0.5, rz = 1] = (fuente.dataset.rostro ?? "").split(",").map(Number).filter(Number.isFinite);
    const proporcion = ancho / alto;
    const dw = (proporcion >= 1 ? LADO_TEXTURA * proporcion : LADO_TEXTURA) * rz;
    const dh = (proporcion >= 1 ? LADO_TEXTURA : LADO_TEXTURA / proporcion) * rz;
    // El rostro va al centro, sin dejar que la foto descubra un borde vacío.
    const dx = Math.min(0, Math.max(LADO_TEXTURA - dw, LADO_TEXTURA / 2 - rx * dw));
    const dy = Math.min(0, Math.max(LADO_TEXTURA - dh, LADO_TEXTURA / 2 - ry * dh));
    tallerCtx.drawImage(fuente, dx, dy, dw, dh);

    const textura = gl!.createTexture()!;
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, textura);
    try {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, taller);
    } catch {
      gl!.deleteTexture(textura);
      return null;
    }
    // Los mipmaps son el desenfoque: cada nivel es la foto a la mitad.
    gl!.generateMipmap(gl!.TEXTURE_2D);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);

    entrada = { textura, escala: [1, 1], uso: ++reloj };
    texturas.set(fuente, entrada);
    soltarTexturasViejas();
    return entrada;
  }

  // ---- Piezas ---------------------------------------------------------------
  let vivo = true;
  let cuadro = 0;
  let nivelCalidad = 0;
  /** Último recurso del freno: no pintar en reposo, solo cuando algo cambia. */
  let ahorro = false;

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        for (const pieza of piezas) {
          if (pieza.contenedor !== entrada.target) continue;
          pieza.visible = entrada.isIntersecting;
          if (pieza.visible) pieza.sucia = true;
        }
      }
      pedir();
    },
    { rootMargin: "25% 0px" },
  );

  const medidor = new ResizeObserver((entradas) => {
    for (const entrada of entradas) {
      for (const pieza of piezas) {
        if (pieza.contenedor === entrada.target) ajustar(pieza);
      }
    }
    pedir();
  });

  function ajustar(pieza: Pieza) {
    const escala = Math.min(window.devicePixelRatio || 1, 2) * CALIDADES[nivelCalidad]!;
    const lado = Math.max(2, Math.round(pieza.contenedor.clientWidth * escala));
    if (pieza.lienzo.width !== lado) {
      pieza.lienzo.width = pieza.lienzo.height = lado;
      pieza.pintada = false;
    }
    // El lienzo compartido crece hasta la pieza más grande y ya no encoge:
    // cambiarle el tamaño en cada dibujo reharía sus búferes cada vez.
    if (base.width < lado) base.width = base.height = lado;
    pieza.sucia = true;
  }

  const fuenteDe = (pieza: Pieza, i: number): Fuente => pieza.videos[i] ?? pieza.fotos[i]!;

  function pintar(pieza: Pieza, inercia: number): boolean {
    const a = subir(fuenteDe(pieza, pieza.a)) ?? subir(pieza.fotos[pieza.a]!);
    if (!a) return false;
    const enRelevo = pieza.relevo > 0;
    const b = enRelevo ? (subir(fuenteDe(pieza, pieza.b)) ?? subir(pieza.fotos[pieza.b]!)) : null;
    if (enRelevo && !b) return false;

    const contorno = pieza.blob ? CONTORNOS.get(pieza.blob) : undefined;
    if (contorno) subirContorno(contorno);

    const lado = pieza.lienzo.width;
    gl!.viewport(0, 0, lado, lado);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, a.textura);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, (b ?? a).textura);

    gl!.uniform2fv(uniformes.escalaA, a.escala);
    gl!.uniform2fv(uniformes.escalaB, (b ?? a).escala);
    gl!.uniform1f(uniformes.zoomA, pieza.zooms[pieza.a] ?? 1);
    gl!.uniform1f(uniformes.zoomB, pieza.zooms[pieza.b] ?? 1);
    gl!.uniform1f(uniformes.relevo, pieza.relevo);
    gl!.uniform1f(uniformes.foco, pieza.foco);
    gl!.uniform1f(uniformes.inercia, inercia);
    gl!.uniform1f(uniformes.conContorno, contorno ? 1 : 0);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);

    // El viewport de WebGL nace abajo a la izquierda; en coordenadas de
    // lienzo eso es el final de la altura.
    pieza.ctx.drawImage(base, 0, base.height - lado, lado, lado, 0, 0, lado, lado);

    if (!pieza.pintada) {
      pieza.pintada = true;
      // Desde aquí el lienzo sustituye a la foto (tokens.css la esconde).
      pieza.contenedor.setAttribute("data-tinta-lista", "");
    }
    return true;
  }

  // ---- Bucle ---------------------------------------------------------------
  let ultimo = 0;
  let numero = 0;
  let scrollPrevio = window.scrollY;
  let inercia = 0;
  // Freno: media móvil de lo que tarda cada fotograma mientras se pinta.
  let mediaMs = 16;
  let medidos = 0;
  const sinFreno = Boolean((window as { __TINTA_SIN_FRENO?: boolean }).__TINTA_SIN_FRENO);

  function frenar(dtMs: number) {
    if (sinFreno) return;
    mediaMs = mediaMs * 0.92 + dtMs * 0.08;
    if (++medidos < 50 || mediaMs < 27) return;
    medidos = 0;
    mediaMs = 16;
    if (nivelCalidad < CALIDADES.length - 1) {
      nivelCalidad++;
      for (const pieza of piezas) ajustar(pieza);
    } else {
      ahorro = true;
    }
  }

  function bucle(ms: number) {
    cuadro = 0;
    if (!vivo) return;
    const dtMs = ultimo ? ms - ultimo : 16;
    const dt = Math.min(0.05, dtMs / 1000);
    ultimo = ms;
    numero++;
    cupo = 1;

    // INERCIA: velocidad del scroll, suavizada y acotada a -1..1.
    const y = window.scrollY;
    const objetivo = gsap.utils.clamp(-1, 1, (y - scrollPrevio) / Math.max(dt, 0.001) / 2600);
    scrollPrevio = y;
    inercia += (objetivo - inercia) * (1 - Math.pow(0.0008, dt));
    if (Math.abs(inercia) < 0.002) inercia = 0;

    let pintadas = 0;
    let pendiente = false;

    for (const pieza of piezas) {
      if (!pieza.visible) continue;

      const video = pieza.videos[pieza.a];
      const conVideo = Boolean(video && !video.paused && !video.ended);
      // Si el puntero está moviendo la silueta, el canto tiene que seguirla
      // fotograma a fotograma, también con el freno echado.
      const agitada = pieza.blob !== null && AGITADOS.has(pieza.blob);
      const enMovimiento = pieza.sucia || pieza.tweens.size > 0 || inercia !== 0 || conVideo || agitada;
      // En reposo la silueta respira despacio: un fotograma de cada dos.
      const respira = !ahorro && pieza.blob !== null && numero % 2 === 0;

      if (enMovimiento || respira) {
        // Si la imagen aún no cargó, se reintenta en el siguiente fotograma.
        pieza.sucia = !pintar(pieza, inercia);
        pintadas++;
      }
      if (enMovimiento || !ahorro) pendiente = true;
    }

    if (pintadas > 0) frenar(dtMs);
    if (pendiente) pedir();
    else ultimo = 0;
  }

  function pedir() {
    if (vivo && !cuadro) cuadro = requestAnimationFrame(bucle);
  }

  // Con el freno echado no hay bucle en reposo: lo despiertan el scroll y el
  // puntero (que puede estar moviendo la silueta de una gota).
  const alMover = () => pedir();
  window.addEventListener("scroll", alMover, { passive: true });
  window.addEventListener("pointermove", alMover, { passive: true });

  base.addEventListener("webglcontextlost", (evento) => {
    // Sin contexto no hay nada que pintar: se retira todo y vuelven las fotos.
    evento.preventDefault();
    descartado = true;
    soltarTinta();
  });

  function montar(contenedor: HTMLElement, opciones: OpcionesTinta): Tinta | null {
    const fotos = opciones.fuentes.filter(Boolean);
    if (fotos.length === 0) return null;

    const lienzo = document.createElement("canvas");
    lienzo.className = "lienzo-tinta";
    lienzo.setAttribute("aria-hidden", "true");
    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;

    // Antes del vídeo, si lo hay: el vídeo del listado se muestra por encima.
    contenedor.insertBefore(lienzo, contenedor.querySelector(":scope > video"));

    const pieza: Pieza = {
      contenedor,
      blob: contenedor.closest("[data-blob]"),
      lienzo,
      ctx,
      fotos,
      videos: fotos.map(() => null),
      zooms: fotos.map(() => 1),
      a: 0,
      b: 0,
      relevo: 0,
      foco: opciones.foco ?? 0,
      visible: false,
      sucia: true,
      pintada: false,
      tweens: new Set(),
    };
    piezas.add(pieza);
    ajustar(pieza);
    observador.observe(contenedor);
    medidor.observe(contenedor);

    const marcar = () => {
      pieza.sucia = true;
      pedir();
    };
    // La foto puede llegar después (las de abajo cargan en diferido).
    const avisos = new AbortController();
    for (const foto of fotos) {
      if (foto instanceof HTMLImageElement && !foto.complete) {
        foto.addEventListener("load", marcar, { signal: avisos.signal });
      }
    }

    const animar = (variables: gsap.TweenVars) => {
      const tween = gsap.to(pieza, {
        ...variables,
        onUpdate: marcar,
        onComplete() {
          pieza.tweens.delete(tween);
          (variables.onComplete as (() => void) | undefined)?.();
          marcar();
        },
        onInterrupt: () => pieza.tweens.delete(tween),
      });
      pieza.tweens.add(tween);
      pedir();
      return tween;
    };

    let enfoque: gsap.core.Tween | null = null;
    let relevoEnCurso: gsap.core.Tween | null = null;

    return {
      lienzo,

      enfocar(activo, segundos = 1.3) {
        enfoque?.kill();
        enfoque = animar(
          activo
            ? { foco: 1, duration: segundos * (1 - pieza.foco) + 0.15, ease: "power3.out" }
            : { foco: 0, duration: 0.8 * pieza.foco + 0.1, ease: "power2.inOut" },
        );
        return enfoque;
      },

      relevar(indice) {
        // Si había un relevo a medias, se da por terminado antes de empezar otro.
        if (relevoEnCurso) {
          relevoEnCurso.kill();
          pieza.a = pieza.b;
          pieza.relevo = 0;
        }
        pieza.b = indice;
        pieza.relevo = 0.0001;
        relevoEnCurso = animar({
          relevo: 1,
          duration: 1.5,
          ease: "power2.inOut",
          onComplete() {
            pieza.a = indice;
            pieza.relevo = 0;
            relevoEnCurso = null;
          },
        });
        return relevoEnCurso;
      },

      fijar(indice) {
        relevoEnCurso?.kill();
        relevoEnCurso = null;
        pieza.a = pieza.b = indice;
        pieza.relevo = 0;
        marcar();
      },

      acercar(indice, valor) {
        pieza.zooms[indice] = valor;
        marcar();
      },

      usarVideo(indice, video) {
        pieza.videos[indice] = video;
        // Al reanudarse tras una pausa hay que despertar el bucle de dibujo.
        video?.addEventListener("playing", marcar, { signal: avisos.signal });
        marcar();
      },

      destruir() {
        avisos.abort();
        pieza.tweens.forEach((t) => t.kill());
        pieza.tweens.clear();
        observador.unobserve(contenedor);
        medidor.unobserve(contenedor);
        piezas.delete(pieza);
        // Las texturas son de esta pieza: al irse la página, se liberan.
        for (const fuente of [...pieza.fotos, ...pieza.videos]) {
          const entrada = fuente && texturas.get(fuente);
          if (!entrada) continue;
          gl!.deleteTexture(entrada.textura);
          texturas.delete(fuente);
        }
        contenedor.removeAttribute("data-tinta-lista");
        lienzo.remove();
      },
    };
  }

  return {
    montar,
    destruir() {
      vivo = false;
      cancelAnimationFrame(cuadro);
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("pointermove", alMover);
      observador.disconnect();
      medidor.disconnect();
      for (const pieza of [...piezas]) {
        pieza.tweens.forEach((t) => t.kill());
        pieza.contenedor.removeAttribute("data-tinta-lista");
        pieza.lienzo.remove();
      }
      piezas.clear();
      for (const { textura } of texturas.values()) gl.deleteTexture(textura);
      texturas.clear();
      gl.deleteTexture(tiraRadios);
      document.documentElement.classList.remove("gl");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
