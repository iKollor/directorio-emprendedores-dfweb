/**
 * TINTA — el material de los retratos, en WebGL.
 *
 * La idea de todo el sitio: los retratos están impresos en la tinta azul de la
 * escuela y pasan a color vivo allí donde va la atención, a través de un
 * frente líquido. Ese mismo frente es el que cambia de persona en el hero. Hay
 * UN material y UN movimiento; no hay otros efectos de imagen en el sitio.
 *
 * El shader hace cuatro cosas, en una sola pasada:
 *
 *   1. TINTA: la foto en tres tonos de la marca (azul hondo, azul, lavanda),
 *      con una trama de puntos fina como la de una impresión a una tinta.
 *   2. REVELADO: un frente que crece desde un punto y deja la foto a color.
 *      El borde del frente lo deforma un ruido, así que avanza como un líquido
 *      y no como un círculo.
 *   3. RELEVO: el mismo frente, usado para pasar de una persona a otra.
 *   4. ESTELA: al mover el puntero por encima, la imagen se remueve como agua
 *      y vuelve sola a su sitio. Solo responde al movimiento: con el puntero
 *      quieto no hay nada deformado ni nada que lo siga.
 *
 * DECISIONES DE RENDIMIENTO
 *
 * - UN SOLO CONTEXTO WebGL para todos los retratos. Los navegadores permiten
 *   pocos contextos a la vez (en móvil, unos 8), y aquí hay hasta 16 blobs.
 *   Se pinta en un lienzo oculto y se copia a un <canvas> 2D por retrato.
 *   Los lienzos 2D viven dentro de la página, así que hacen scroll con ella:
 *   un único lienzo fijo a pantalla completa se desfasa del contenido en el
 *   scroll táctil, que el navegador mueve fuera del hilo principal.
 * - SOLO SE PINTA LO QUE CAMBIA. En reposo no hay bucle de dibujo: cada
 *   retrato se marca "sucio" cuando una animación o el puntero lo tocan.
 * - SOLO LO VISIBLE. Un IntersectionObserver descarta lo que está fuera.
 * - Sin profundidad, sin stencil, sin antialias, DPR limitado a 2.
 *
 * SI ALGO FALLA (sin WebGL, contexto perdido, movimiento reducido) no se monta
 * nada y quedan las fotos normales: el sitio funciona igual sin esto.
 */

import { gsap } from "gsap";

type Fuente = HTMLImageElement | HTMLVideoElement;
type Punto = [number, number];

export type OpcionesTinta = {
  /** Una imagen por persona. En los retratos sueltos, una sola. */
  fuentes: HTMLImageElement[];
  /** 0 = impreso en tinta, 1 = a color. Estado inicial. */
  color?: number;
};

export type Tinta = {
  /**
   * Pasa de tinta a color (o al revés) desde un punto, en coordenadas 0-1.
   * `segundos` es lo que tarda un revelado completo.
   */
  revelar(activo: boolean, origen?: Punto, segundos?: number): gsap.core.Tween;
  /** Releva a la persona en pantalla por otra, con el frente líquido. */
  relevar(indice: number, origen?: Punto): gsap.core.Tween;
  /** Cambia de persona sin animación. */
  fijar(indice: number): void;
  /** Acercamiento de una de las fuentes (1 = sin acercar). */
  acercar(indice: number, valor: number): void;
  /** Usa un vídeo como imagen de esa persona, o vuelve a su foto con null. */
  usarVideo(indice: number, video: HTMLVideoElement | null): void;
  /** Remueve la imagen: posición 0-1 y desplazamiento desde el último aviso. */
  remover(x: number, y: number, dx: number, dy: number): void;
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

const ESTELAS = 6;

const FRAGMENTOS = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uEscalaA;
uniform vec2 uEscalaB;
uniform float uZoomA;
uniform float uZoomB;
uniform float uRelevo;
uniform float uColor;
uniform vec2 uOrigenRelevo;
uniform vec2 uOrigenColor;
uniform float uLado;
uniform vec4 uEstela[${ESTELAS}];
uniform vec3 uSombra;
uniform vec3 uMedio;
uniform vec3 uLuz;

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

// Tres octavas: suficiente para un borde orgánico, barato en móvil.
float nube(vec2 p) {
  return ruido(p) * 0.55 + ruido(p * 2.03 + 7.1) * 0.3 + ruido(p * 4.1 + 3.7) * 0.15;
}

vec3 muestra(sampler2D t, vec2 uv, vec2 escala, float zoom) {
  return texture2D(t, (uv - 0.5) * escala / zoom + 0.5).rgb;
}

void main() {
  vec2 uv = vUv;

  // ESTELA: cada muestra reciente del puntero empuja la imagen a su alrededor.
  vec2 empuje = vec2(0.0);
  for (int i = 0; i < ${ESTELAS}; i++) {
    vec2 d = uv - uEstela[i].xy;
    empuje += uEstela[i].zw * exp(-dot(d, d) * 38.0);
  }

  // RELEVO: frente que crece desde un punto; el ruido le quita lo circular.
  float n = nube(uv * 2.3);
  float radio = uRelevo * 2.3 - 0.4;
  float distancia = distance(uv, uOrigenRelevo) + (n - 0.5) * 0.75;
  float dentro = 1.0 - smoothstep(radio - 0.08, radio, distancia);
  // Cerca del frente la imagen se estira hacia fuera, como empujada por él.
  float banda = exp(-pow((distancia - radio) * 4.5, 2.0)) * sin(3.14159 * uRelevo);
  vec2 hacia = normalize(uv - uOrigenRelevo + 0.0001);
  vec2 uvFinal = uv - empuje + hacia * banda * 0.075;

  vec3 color = muestra(uA, uvFinal, uEscalaA, uZoomA);
  if (uRelevo > 0.0) {
    color = mix(color, muestra(uB, uvFinal, uEscalaB, uZoomB), dentro);
  }

  // REVELADO: el mismo tipo de frente, de tinta a color.
  if (uColor < 1.0) {
    float radioColor = uColor * 2.3 - 0.4;
    float distanciaColor = distance(uv, uOrigenColor) + (nube(uv * 2.3 + 19.0) - 0.5) * 0.75;
    float vivo = 1.0 - smoothstep(radioColor - 0.1, radioColor, distanciaColor);

    // TINTA: luminancia a tres tonos de la marca.
    float luz = dot(color, vec3(0.299, 0.587, 0.114));
    luz = smoothstep(0.03, 0.97, luz);
    vec3 tinta = mix(uSombra, uMedio, smoothstep(0.0, 0.55, luz));
    tinta = mix(tinta, uLuz, smoothstep(0.42, 1.0, luz));

    // Trama de puntos a 45 grados, como una impresión a una tinta. El tamaño
    // va en píxeles de pantalla para que no cambie con el tamaño del retrato.
    vec2 celda = mat2(0.7071, -0.7071, 0.7071, 0.7071) * (vUv * uLado / 5.5);
    float punto = length(fract(celda) - 0.5);
    float trama = smoothstep(0.02, -0.02, punto - (1.0 - luz) * 0.52);
    tinta = mix(tinta, uSombra, trama * 0.28);

    color = mix(tinta, color, vivo);
  }

  gl_FragColor = vec4(color, 1.0);
}`;

// Tres tonos de la marca: azul hondo, el azul del fondo y una lavanda clara.
// El tono medio es el del fondo de la página a propósito: los medios tonos de
// la foto se funden con ella y el retrato parece salir del papel.
const TONOS = {
  sombra: [0.016, 0.016, 0.54],
  medio: [0.255, 0.255, 0.976],
  luz: [0.86, 0.88, 1.0],
};

type Pieza = {
  contenedor: HTMLElement;
  lienzo: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fotos: HTMLImageElement[];
  videos: (HTMLVideoElement | null)[];
  zooms: number[];
  a: number;
  b: number;
  relevo: number;
  color: number;
  origenRelevo: Punto;
  origenColor: Punto;
  /** x, y, dx, dy por cada muestra reciente del puntero. */
  estela: Float32Array;
  siguienteEstela: number;
  removida: boolean;
  visible: boolean;
  sucia: boolean;
  pintada: boolean;
  lado: number;
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
  // va a sustituir, para que no se vean a color un instante antes de la tinta.
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
    a: u("uA"),
    b: u("uB"),
    escalaA: u("uEscalaA"),
    escalaB: u("uEscalaB"),
    zoomA: u("uZoomA"),
    zoomB: u("uZoomB"),
    relevo: u("uRelevo"),
    color: u("uColor"),
    origenRelevo: u("uOrigenRelevo"),
    origenColor: u("uOrigenColor"),
    lado: u("uLado"),
    estela: u("uEstela"),
  };
  gl.uniform1i(uniformes.a, 0);
  gl.uniform1i(uniformes.b, 1);
  gl.uniform3fv(u("uSombra"), TONOS.sombra);
  gl.uniform3fv(u("uMedio"), TONOS.medio);
  gl.uniform3fv(u("uLuz"), TONOS.luz);

  // ---- Texturas ------------------------------------------------------------
  const texturas = new Map<Fuente, { textura: WebGLTexture; ancho: number; alto: number }>();

  function subir(fuente: Fuente): { textura: WebGLTexture; ancho: number; alto: number } | null {
    const esVideo = fuente instanceof HTMLVideoElement;
    const ancho = esVideo ? fuente.videoWidth : fuente.naturalWidth;
    const alto = esVideo ? fuente.videoHeight : fuente.naturalHeight;
    if (!ancho || !alto) return null;
    if (!esVideo && !fuente.complete) return null;
    if (esVideo && fuente.readyState < 2) return null;

    let entrada = texturas.get(fuente);
    const nueva = !entrada;
    if (!entrada) {
      const textura = gl!.createTexture()!;
      gl!.bindTexture(gl!.TEXTURE_2D, textura);
      // Sin mipmaps y con bordes fijos: es lo que admite WebGL 1 para
      // texturas que no son potencia de dos, como cualquier foto.
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      entrada = { textura, ancho, alto };
      texturas.set(fuente, entrada);
    }
    // Las fotos se suben una vez; el vídeo, en cada fotograma que se pinta.
    if (nueva || esVideo) {
      gl!.bindTexture(gl!.TEXTURE_2D, entrada.textura);
      try {
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, fuente);
      } catch {
        return null;
      }
      entrada.ancho = ancho;
      entrada.alto = alto;
    }
    return entrada;
  }

  /** Escala de UV para que la imagen cubra el cuadrado sin deformarse. */
  const cubrir = (ancho: number, alto: number): Punto =>
    ancho > alto ? [alto / ancho, 1] : [1, ancho / alto];

  // ---- Piezas ---------------------------------------------------------------
  const piezas = new Set<Pieza>();
  let vivo = true;
  let cuadro = 0;

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
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    const lado = Math.max(2, Math.round(pieza.contenedor.clientWidth * escala));
    if (pieza.lienzo.width !== lado) {
      pieza.lienzo.width = pieza.lienzo.height = lado;
      pieza.pintada = false;
    }
    pieza.lado = pieza.contenedor.clientWidth;
    // El lienzo compartido crece hasta la pieza más grande y ya no encoge:
    // cambiarle el tamaño en cada dibujo reharía sus búferes cada vez.
    if (base.width < lado) base.width = base.height = lado;
    pieza.sucia = true;
  }

  const fuenteDe = (pieza: Pieza, i: number): Fuente => pieza.videos[i] ?? pieza.fotos[i]!;

  function pintar(pieza: Pieza): boolean {
    const a = subir(fuenteDe(pieza, pieza.a)) ?? subir(pieza.fotos[pieza.a]!);
    if (!a) return false;
    const enRelevo = pieza.relevo > 0;
    const b = enRelevo ? (subir(fuenteDe(pieza, pieza.b)) ?? subir(pieza.fotos[pieza.b]!)) : null;
    if (enRelevo && !b) return false;

    const lado = pieza.lienzo.width;
    gl!.viewport(0, 0, lado, lado);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, a.textura);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, (b ?? a).textura);

    gl!.uniform2fv(uniformes.escalaA, cubrir(a.ancho, a.alto));
    gl!.uniform2fv(uniformes.escalaB, b ? cubrir(b.ancho, b.alto) : [1, 1]);
    gl!.uniform1f(uniformes.zoomA, pieza.zooms[pieza.a] ?? 1);
    gl!.uniform1f(uniformes.zoomB, pieza.zooms[pieza.b] ?? 1);
    gl!.uniform1f(uniformes.relevo, pieza.relevo);
    gl!.uniform1f(uniformes.color, pieza.color);
    gl!.uniform2fv(uniformes.origenRelevo, pieza.origenRelevo);
    gl!.uniform2fv(uniformes.origenColor, pieza.origenColor);
    gl!.uniform1f(uniformes.lado, pieza.lado);
    gl!.uniform4fv(uniformes.estela, pieza.estela);
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

  let ultimo = 0;
  function bucle(ms: number) {
    cuadro = 0;
    if (!vivo) return;
    const dt = Math.min(0.05, ultimo ? (ms - ultimo) / 1000 : 0.016);
    ultimo = ms;
    let pendiente = false;

    for (const pieza of piezas) {
      // La estela se apaga sola, igual de rápido a 60 que a 120 Hz.
      if (pieza.removida) {
        const freno = Math.pow(0.0025, dt);
        let fuerza = 0;
        for (let i = 0; i < ESTELAS; i++) {
          pieza.estela[i * 4 + 2]! *= freno;
          pieza.estela[i * 4 + 3]! *= freno;
          fuerza += Math.abs(pieza.estela[i * 4 + 2]!) + Math.abs(pieza.estela[i * 4 + 3]!);
        }
        pieza.removida = fuerza > 0.0004;
        if (!pieza.removida) pieza.estela.fill(0);
        pieza.sucia = true;
      }

      if (!pieza.visible) continue;
      // Un vídeo en marcha cambia en cada fotograma aunque nada más lo haga:
      // mientras corra, la pieza se pinta siempre y el bucle no se detiene.
      const video = pieza.videos[pieza.a];
      const conVideo = Boolean(video && !video.paused && !video.ended);
      if (conVideo) pieza.sucia = true;

      if (pieza.sucia) {
        // Si la imagen aún no cargó, se reintenta en el siguiente fotograma.
        pieza.sucia = !pintar(pieza);
      }
      if (pieza.sucia || pieza.removida || conVideo || pieza.tweens.size > 0) pendiente = true;
    }

    if (pendiente) pedir();
    else ultimo = 0;
  }

  function pedir() {
    if (vivo && !cuadro) cuadro = requestAnimationFrame(bucle);
  }

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
      lienzo,
      ctx,
      fotos,
      videos: fotos.map(() => null),
      zooms: fotos.map(() => 1),
      a: 0,
      b: 0,
      relevo: 0,
      color: opciones.color ?? 0,
      origenRelevo: [0.5, 0.5],
      origenColor: [0.5, 0.5],
      estela: new Float32Array(ESTELAS * 4),
      siguienteEstela: 0,
      removida: false,
      visible: false,
      sucia: true,
      pintada: false,
      lado: 0,
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
      if (!foto.complete) foto.addEventListener("load", marcar, { signal: avisos.signal });
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

    let revelado: gsap.core.Tween | null = null;
    let relevoEnCurso: gsap.core.Tween | null = null;

    return {
      lienzo,

      revelar(activo, origen, segundos = 1.5) {
        revelado?.kill();
        // El punto de partida solo se mueve cuando no se nota: con el retrato
        // entero en tinta o entero a color.
        if (origen && (pieza.color <= 0.001 || pieza.color >= 0.999)) pieza.origenColor = origen;
        revelado = animar(
          activo
            ? { color: 1, duration: segundos * (1 - pieza.color) + 0.2, ease: "power2.out" }
            : { color: 0, duration: 0.9 * pieza.color + 0.1, ease: "power2.inOut" },
        );
        return revelado;
      },

      relevar(indice, origen) {
        // Si había un relevo a medias, se da por terminado antes de empezar otro.
        if (relevoEnCurso) {
          relevoEnCurso.kill();
          pieza.a = pieza.b;
          pieza.relevo = 0;
        }
        pieza.b = indice;
        pieza.relevo = 0.0001;
        if (origen) pieza.origenRelevo = origen;
        relevoEnCurso = animar({
          relevo: 1,
          duration: 1.6,
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

      remover(x, y, dx, dy) {
        const i = pieza.siguienteEstela * 4;
        pieza.estela[i] = x;
        pieza.estela[i + 1] = y;
        // Tope: un puntero que cruza de golpe no debe romper la imagen.
        pieza.estela[i + 2] = gsap.utils.clamp(-0.05, 0.05, dx);
        pieza.estela[i + 3] = gsap.utils.clamp(-0.05, 0.05, dy);
        pieza.siguienteEstela = (pieza.siguienteEstela + 1) % ESTELAS;
        pieza.removida = true;
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
      document.documentElement.classList.remove("gl");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
