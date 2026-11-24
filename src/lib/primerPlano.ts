/**
 * EL PRIMER PLANO: la gota se acerca. Al pulsar un retrato con vídeo, su gota
 * sale de su sitio, crece hasta casi llenar la ventana y pasa a ser la
 * pantalla donde se ve el vídeo entero, a su proporción y con sonido. Al
 * cerrar, vuelve a su sitio. Lo usan el hero (BlobHero.astro) y el retrato de
 * la ficha (Blob.astro); la pieza y sus mandos son PrimerPlano.astro.
 *
 * NO ES UNA PANTALLA COMPLETA. Deja ver la página alrededor, fuera de foco.
 * El borde sigue siendo el de una gota: parte de la silueta del retrato y se
 * va haciendo una pantalla (una superelipse con la proporción del vídeo, lo
 * bastante simétrica para no comerse la imagen) que sigue respirando.
 *
 * SOLO ÓPTICA, como el resto. El retrato es un recorte cuadrado y el vídeo
 * entero es apaisado: no encajan. Por eso el paso de uno a otro es un cambio
 * de foco: la gota sale desenfocándose, a medio camino las dos imágenes son
 * luz, y enfoca ya en el vídeo. Detrás, la página se desenfoca y el retrato
 * que se dejó atrás vuelve a la tinta.
 *
 * EL SONIDO ES UNA SOLA PISTA (lib/voz.ts). Si el retrato ya sonaba al
 * pulsarlo, la gota se abre con esa misma reproducción: ni se corta ni
 * vuelve a empezar. Si no sonaba, entra fundido cuando el vídeo ya anda. Al
 * cerrar, sale fundido mientras la gota vuelve; y si el puntero quedó sobre
 * el retrato, sigue sonando.
 *
 * CALIDAD, COMO EN UN SERVICIO DE VÍDEO. Con varias calidades (`videoSonido`)
 * la persona elige una o deja "Auto", que escoge según el tamaño de la gota
 * en pantalla y la conexión, y baja un escalón si el vídeo se queda parado
 * cargando. Son archivos enteros, no trozos, pero el cambio no se nota: la
 * calidad nueva carga en un segundo vídeo, se coloca un poco por delante y
 * entra justo cuando el primero llega a ese punto.
 */
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { CONTORNOS, MUESTRAS_CONTORNO } from "./blob";
import type { VideoSonido } from "./directorio";
import { obtenerScroll, sinMovimiento } from "./scroll";
import { callar, cederVoz, retomarVoz, type EstadoSonido } from "./sonido";
import { activa, ajustes, aplicar, buscarVoz, fijarNivel, gemela, guardarAjustes, nivel, relevar, vaciar } from "./voz";

gsap.registerPlugin(CustomEase);
/** Arranca suave y se asienta despacio: la curva de algo grande que se mueve. */
const SUAVE = CustomEase.create("primer-plano", "0.3,0,0.1,1");

export type OrigenPlano = {
  /** El recorte del retrato: de ahí sale la gota y ahí vuelve. */
  caja: HTMLElement;
  /** El blob del retrato, para leer su silueta de este momento. */
  blob: Element | null;
  /** Grados que está girado el retrato en la página. */
  giro?: number;
  /** Lo que se ve ahora en el retrato: el fotograma del vídeo o la foto. */
  fotograma: () => CanvasImageSource | null;
  /** Por qué segundo va el vídeo del retrato. */
  hora: () => number;
  /** El vídeo del retrato: si ya sonaba, la gota se abre con ese sonido. */
  retrato?: HTMLVideoElement | null;
  /** ¿Sigue el puntero sobre el retrato? Entonces, al cerrar, sigue sonando. */
  encima?: () => boolean;
  /** Cómo queda el altavoz del retrato cuando la voz vuelve a él. */
  alSonar?: (estado: EstadoSonido) => void;
  /** Las calidades, de mayor a menor. Una sola: sin selector. */
  calidades: VideoSonido[];
  nombre: string;
  /**
   * Quién es, para el cartel que acompaña a la gota en el teléfono. `href` es
   * su ficha; sin él (ya se está en ella) el cartel no enlaza.
   */
  cartel?: { categoria: string; oficio: string; color: string; colorTexto: string; href: string | null } | null;
  /** La gota ha salido: el retrato se queda atrás. */
  alAbrir?: () => void;
  /** La gota empieza a volver; recibe el segundo por el que iba el vídeo. */
  alVolver?: (hora: number) => void;
  /** Ya está en su sitio. `suena`: la voz sigue con el retrato. */
  alCerrar?: (suena: boolean) => void;
};

/** Puntos del borde. Más que los del retrato: la pantalla es mucho mayor. */
const PUNTOS = 96;
const TAU = Math.PI * 2;
/** Desenfoque máximo del cambio de foco, en píxeles. */
const BRUMA = 24;

type Caja = { x: number; y: number; ancho: number; alto: number };

let dialogo: HTMLDialogElement | null = null;
let soltarMandos: (() => void) | null = null;
let ponerSonido: (() => void) | null = null;
let abierto: {
  origen: OrigenPlano;
  desde: Caja;
  hasta: Caja;
  radios: Float32Array;
  estado: { p: number; bruma: number; mezcla: number };
  linea: gsap.core.Timeline | null;
  pintar: () => void;
  cerrando: boolean;
  actual: number;
  auto: boolean;
  paradas: number[];
  /** Deshace un cambio de calidad que aún no ha entrado. */
  relevo: (() => void) | null;
  esperas: gsap.core.Tween[];
} | null = null;

const pieza = <T extends HTMLElement | SVGElement = HTMLElement>(nombre: string) =>
  dialogo!.querySelector<T>(`[data-${nombre}]`)!;

/** La pantalla: una superelipse en la caja unidad, que respira. */
function radioPantalla(angulo: number, t: number): number {
  const c = Math.abs(Math.cos(angulo));
  const s = Math.abs(Math.sin(angulo));
  const r = 0.5 / Math.pow(Math.pow(c, 4.4) + Math.pow(s, 4.4), 1 / 4.4);
  return (
    r *
    0.972 *
    (1 +
      0.011 * Math.sin(3 * angulo + t * 0.7) +
      0.007 * Math.sin(5 * angulo - t * 0.52 + 1.7) +
      0.006 * Math.sin(2 * angulo + t * 0.31 + 0.6))
  );
}

/** La silueta del retrato ahora mismo, en las mismas direcciones. */
function radiosDelRetrato(blob: Element | null): Float32Array {
  const salida = new Float32Array(PUNTOS);
  const contorno = blob ? CONTORNOS.get(blob) : undefined;
  for (let k = 0; k < PUNTOS; k++) {
    if (!contorno) {
      salida[k] = 0.44;
      continue;
    }
    const x = (k / PUNTOS) * MUESTRAS_CONTORNO;
    const i = Math.floor(x) % MUESTRAS_CONTORNO;
    const f = x - Math.floor(x);
    salida[k] = contorno[i]! * (1 - f) + contorno[(i + 1) % MUESTRAS_CONTORNO]! * f;
  }
  return salida;
}

/** El borde como curva cerrada y suave, en unidades de la caja (0 a 1). */
function trazar(radios: Float32Array, p: number, t: number): string {
  const xs = new Float32Array(PUNTOS);
  const ys = new Float32Array(PUNTOS);
  for (let k = 0; k < PUNTOS; k++) {
    // La dirección 0 apunta a la izquierda, como en lib/blob.ts.
    const angulo = -Math.PI + (k / PUNTOS) * TAU;
    const r = radios[k]! * (1 - p) + radioPantalla(angulo, t) * p;
    xs[k] = 0.5 + r * Math.cos(angulo);
    ys[k] = 0.5 + r * Math.sin(angulo);
  }
  const n = (v: number) => v.toFixed(4);
  let d = `M${n((xs[0]! + xs[PUNTOS - 1]!) / 2)} ${n((ys[0]! + ys[PUNTOS - 1]!) / 2)}`;
  for (let k = 0; k < PUNTOS; k++) {
    const s = (k + 1) % PUNTOS;
    d += `Q${n(xs[k]!)} ${n(ys[k]!)} ${n((xs[k]! + xs[s]!) / 2)} ${n((ys[k]! + ys[s]!) / 2)}`;
  }
  return `${d}Z`;
}

/** Dónde está el retrato en la ventana, deshaciendo su giro. */
function medirOrigen(origen: OrigenPlano): Caja {
  const r = origen.caja.getBoundingClientRect();
  const giro = ((origen.giro ?? 0) * Math.PI) / 180;
  const lado = r.width / (Math.abs(Math.cos(giro)) + Math.abs(Math.sin(giro)));
  return { x: r.left + r.width / 2 - lado / 2, y: r.top + r.height / 2 - lado / 2, ancho: lado, alto: lado };
}

/**
 * EN LA MANO: un teléfono de pie. Ahí un vídeo apaisado a su proporción es una
 * tira en mitad de una pantalla vacía, así que la gota es alta y lo recorta
 * por los lados, con la persona en el centro, como cualquier vídeo vertical
 * de teléfono. Girándolo se ve el encuadre entero.
 */
const enMano = () => window.innerWidth < 640 && window.innerHeight > window.innerWidth;

/**
 * PANTALLA COMPLETA DE VERDAD: la del sistema, no la gota grande. Se pone
 * entera la pieza (vídeo y mandos), no el vídeo solo, para no perder el
 * reproductor. El iPhone no lo permite: allí solo se puede poner a pantalla
 * completa el propio vídeo, con el reproductor del sistema.
 */
type ConWebkit = { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
const enCompleta = (): boolean => {
  const lienzo = dialogo?.querySelector("[data-lienzo]") ?? null;
  return Boolean(lienzo) && (document.fullscreenElement === lienzo || (document as ConWebkit).webkitFullscreenElement === lienzo);
};
function salirDeCompleta(): void {
  if (!enCompleta()) return;
  if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
  else (document as ConWebkit).webkitExitFullscreen?.();
}
/** Lo que ocupan, bajo la gota, el cartel y los mandos del teléfono (px). */
const BAJO_LA_GOTA = 238;

/** Dónde queda la pantalla: centrada, con sitio para los mandos y el cierre. */
function medirDestino(proporcion: number): Caja {
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (enCompleta()) return { x: 0, y: 0, ancho: W, alto: H };
  if (enMano()) {
    const lado = 10;
    const arriba = 58;
    const ancho = W - lado * 2;
    // Alta (hasta 4:5) si la pantalla da; en un teléfono corto, casi cuadrada.
    const alto = Math.max(ancho * 0.72, Math.min(ancho * 1.25, H - arriba - BAJO_LA_GOTA));
    return { x: lado, y: arriba + Math.max(0, (H - arriba - BAJO_LA_GOTA - alto) * 0.4), ancho, alto };
  }
  // No llena la ventana: alrededor se sigue viendo la página, fuera de foco.
  // Un teléfono tumbado tiene poco alto: ahí los márgenes se quedan en nada.
  const bajo = H < 480;
  const lado = bajo ? 56 : W < 640 ? 12 : Math.max(24, Math.min(W, H) * 0.075);
  const arriba = bajo ? 10 : Math.max(56, H * 0.075);
  const abajo = bajo ? 44 : Math.max(72, H * 0.1);
  const ancho = Math.min(W - lado * 2, (H - arriba - abajo) * proporcion, 1400);
  const alto = ancho / proporcion;
  return { x: (W - ancho) / 2, y: arriba + (H - arriba - abajo - alto) / 2, ancho, alto };
}

/** Qué calidad toca en "Auto": la menor que llena la gota, si la red da. */
function elegirAuto(calidades: VideoSonido[], altoEnPantalla: number): number {
  const red = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number } })
    .connection;
  let tope = Infinity;
  if (red?.saveData || red?.effectiveType === "slow-2g" || red?.effectiveType === "2g") tope = 0;
  else if (red?.effectiveType === "3g" || (red?.downlink ?? 99) < 1.5) tope = 480;
  else if ((red?.downlink ?? 99) < 4) tope = 720;

  const hace = altoEnPantalla * Math.min(window.devicePixelRatio || 1, 2) * 0.85;
  let elegida = calidades.length - 1;
  for (let i = calidades.length - 1; i >= 0; i--) {
    if (calidades[i]!.alto > tope) break;
    elegida = i;
    if (calidades[i]!.alto >= hace) break;
  }
  return elegida;
}

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const completa = (src: string) => new URL(src, location.href).href;

/** Se llama una vez por página: engancha los mandos de la pieza. */
export function montarPrimerPlano(): void {
  soltarMandos?.();
  dialogo = document.querySelector<HTMLDialogElement>("[data-primer-plano]");
  buscarVoz(dialogo);
  if (!dialogo) return;

  const eventos = new AbortController();
  const { signal } = eventos;
  const videos = [...dialogo.querySelectorAll<HTMLVideoElement>("[data-video]")];
  const avance = pieza<HTMLInputElement>("avance");
  const volumen = pieza<HTMLInputElement>("volumen");
  const botonCalidad = pieza<HTMLButtonElement>("calidad-boton");
  const lista = pieza<HTMLElement>("calidad-lista");
  const textos = dialogo.dataset;
  let arrastrando = false;
  /** Lo que pidió la persona, aunque el fundido de la pausa no haya acabado. */
  let quiereParar = false;

  // Pausar y seguir también van fundidos: cortar el sonido en seco da un chasquido.
  const alternar = () => {
    const v = activa();
    if (!v) return;
    if (v.paused || v.ended || quiereParar) {
      quiereParar = false;
      if (v.paused || v.ended) fijarNivel(v, 0);
      void v.play().then(
        () => nivel(v, 1, 0.3),
        () => {},
      );
      nivel(v, 1, 0.3);
    } else {
      quiereParar = true;
      nivel(v, 0, 0.16, () => {
        if (quiereParar) v.pause();
      });
    }
    pintarReproducir();
  };
  const pintarReproducir = () => {
    const v = activa();
    const parado = !v || v.paused || v.ended || quiereParar;
    dialogo!.toggleAttribute("data-parado", parado);
    pieza("reproducir").setAttribute("aria-label", parado ? textos.tReproducir! : textos.tPausar!);
  };
  const pintarSonido = () => {
    const mudo = ajustes.mudo || ajustes.volumen === 0;
    aplicar();
    dialogo!.toggleAttribute("data-sin-sonido", mudo);
    pieza("mudo").setAttribute("aria-label", mudo ? textos.tSonido! : textos.tSilenciar!);
    pieza("mudo").setAttribute("aria-pressed", String(mudo));
    volumen.value = String(Math.round((ajustes.mudo ? 0 : ajustes.volumen) * 100));
    volumen.parentElement!.style.setProperty("--p", `${volumen.value}%`);
  };
  const cerrarLista = () => {
    lista.hidden = true;
    botonCalidad.setAttribute("aria-expanded", "false");
  };

  /*
   * EN EL TELÉFONO, LA GOTA SE DEVUELVE CON EL DEDO. Arrastrarla hacia abajo
   * la encoge hacia su retrato, siguiendo al dedo; al soltarla lejos o con
   * impulso, vuelve a su sitio, y si no, se queda. Es el gesto con el que se
   * cierra una foto o un vídeo en cualquier teléfono.
   */
  const gota = pieza("gota");
  const velo = pieza("velo");
  const alrededor = [pieza("mandos"), pieza("cerrar"), pieza("cartel")];
  let tiron: { x0: number; y0: number; t0: number; activo: boolean } | null = null;
  let tragarToque = false;
  gota.addEventListener(
    "pointerdown",
    (e) => {
      if (!abierto || abierto.cerrando || !enMano() || enCompleta() || abierto.estado.p < 0.98) return;
      tiron = { x0: e.clientX, y0: e.clientY, t0: e.timeStamp, activo: false };
    },
    { signal },
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!tiron || !abierto || abierto.cerrando) return;
      const dy = e.clientY - tiron.y0;
      if (!tiron.activo) {
        if (dy < 10 || Math.abs(e.clientX - tiron.x0) > dy) return;
        tiron.activo = true;
        gsap.killTweensOf(abierto.estado, "p");
      }
      const cuanto = Math.min(1, Math.max(0, dy / (window.innerHeight * 0.55)));
      abierto.estado.p = 1 - cuanto * 0.55;
      gsap.set(velo, { autoAlpha: 1 - cuanto * 0.6 });
      gsap.set(alrededor, { opacity: 1 - Math.min(1, cuanto * 3) });
    },
    { signal },
  );
  const soltarTiron = (e: PointerEvent) => {
    if (!tiron) return;
    const { activo, y0, t0 } = tiron;
    tiron = null;
    if (!activo || !abierto || abierto.cerrando) return;
    tragarToque = true;
    window.setTimeout(() => (tragarToque = false), 0);
    const dy = e.clientY - y0;
    const conImpulso = dy > 40 && dy / Math.max(1, e.timeStamp - t0) > 0.5;
    if (dy > 110 || conImpulso) {
      cerrarPrimerPlano();
      return;
    }
    gsap.to(abierto.estado, { p: 1, duration: 0.5, ease: SUAVE });
    gsap.to(velo, { autoAlpha: 1, duration: 0.4, ease: "sine.out" });
    gsap.to(alrededor, { opacity: 1, duration: 0.3, ease: "sine.out" });
  };
  window.addEventListener("pointerup", soltarTiron, { signal });
  window.addEventListener("pointercancel", soltarTiron, { signal });

  pieza("reproducir").addEventListener("click", alternar, { signal });
  pieza("pantalla").addEventListener("click", () => !tragarToque && alternar(), { signal });

  // ---- Pantalla completa ---------------------------------------------------
  const lienzo = pieza("lienzo");
  const botonCompleta = pieza<HTMLButtonElement>("completa");
  type VideoIos = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean };
  type LienzoWebkit = HTMLElement & { webkitRequestFullscreen?: () => void };
  const pedir = lienzo.requestFullscreen
    ? () => lienzo.requestFullscreen({ navigationUI: "hide" })
    : (lienzo as LienzoWebkit).webkitRequestFullscreen
      ? () => Promise.resolve((lienzo as LienzoWebkit).webkitRequestFullscreen!())
      : null;
  // Sin ninguna de las dos maneras, el botón no sale.
  botonCompleta.hidden = !pedir && !("webkitEnterFullscreen" in HTMLVideoElement.prototype);
  const pintarCompleta = () => {
    const si = enCompleta();
    dialogo!.toggleAttribute("data-es-completa", si);
    botonCompleta.setAttribute("aria-pressed", String(si));
    botonCompleta.setAttribute("aria-label", si ? textos.tSalirCompleta! : textos.tCompleta!);
    const giro = screen.orientation as (ScreenOrientation & { unlock?: () => void }) | undefined;
    if (!si) giro?.unlock?.();
    const v = activa();
    if (!abierto || !v) return;
    gsap.killTweensOf(abierto.hasta);
    abierto.hasta = medirDestino(v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9);
    colocarMandos();
  };
  botonCompleta.addEventListener(
    "click",
    () => {
      const v = activa() as VideoIos | null;
      if (enCompleta()) {
        salirDeCompleta();
        return;
      }
      const aLaManeraDelIphone = () => v?.webkitEnterFullscreen?.();
      if (!pedir) {
        aLaManeraDelIphone();
        return;
      }
      void pedir().then(() => {
        // Un vídeo apaisado, a pantalla completa, se ve tumbado (donde se pueda).
        const giro = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
        if (v && v.videoWidth > v.videoHeight) void giro?.lock?.("landscape").catch(() => {});
      }, aLaManeraDelIphone);
    },
    { signal },
  );
  document.addEventListener("fullscreenchange", pintarCompleta, { signal });
  document.addEventListener("webkitfullscreenchange", pintarCompleta, { signal });
  for (const v of videos) {
    for (const tipo of ["play", "pause", "ended"]) {
      v.addEventListener(
        tipo,
        () => {
          if (v !== activa()) return;
          if (tipo !== "play") quiereParar = false;
          pintarReproducir();
        },
        { signal },
      );
    }
    // "Auto" baja un escalón si el vídeo se queda parado cargando dos veces
    // en poco tiempo.
    v.addEventListener(
      "waiting",
      () => {
        if (!abierto || abierto.cerrando || !abierto.auto || v !== activa() || v.seeking || abierto.relevo) return;
        const ahora = performance.now();
        abierto.paradas = abierto.paradas.filter((t) => ahora - t < 12000);
        abierto.paradas.push(ahora);
        if (abierto.paradas.length >= 2 && abierto.actual < abierto.origen.calidades.length - 1) {
          abierto.paradas = [];
          cambiarCalidad(abierto.actual + 1);
        }
      },
      { signal },
    );
  }

  avance.addEventListener("pointerdown", () => (arrastrando = true), { signal });
  window.addEventListener("pointerup", () => (arrastrando = false), { signal });
  avance.addEventListener(
    "input",
    () => {
      const v = activa();
      if (v && Number.isFinite(v.duration)) v.currentTime = (Number(avance.value) / 1000) * v.duration;
    },
    { signal },
  );

  pieza("mudo").addEventListener(
    "click",
    () => {
      ajustes.mudo = !(ajustes.mudo || ajustes.volumen === 0);
      if (!ajustes.mudo && ajustes.volumen === 0) ajustes.volumen = 0.6;
      guardarAjustes();
      pintarSonido();
    },
    { signal },
  );
  volumen.addEventListener(
    "input",
    () => {
      ajustes.volumen = Number(volumen.value) / 100;
      ajustes.mudo = false;
      guardarAjustes();
      pintarSonido();
    },
    { signal },
  );

  botonCalidad.addEventListener(
    "click",
    () => {
      lista.hidden = !lista.hidden;
      botonCalidad.setAttribute("aria-expanded", String(!lista.hidden));
      if (!lista.hidden) lista.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    },
    { signal },
  );
  lista.addEventListener(
    "click",
    (e) => {
      const opcion = (e.target as HTMLElement).closest<HTMLElement>("[data-opcion]");
      if (!opcion || !abierto) return;
      const valor = opcion.dataset.opcion!;
      abierto.auto = valor === "auto";
      const destino = abierto.auto ? elegirAuto(abierto.origen.calidades, abierto.hasta.alto) : Number(valor);
      cerrarLista();
      botonCalidad.focus();
      cambiarCalidad(destino);
    },
    { signal },
  );
  // Las opciones son un grupo de radio: flechas para moverse entre ellas.
  lista.addEventListener(
    "keydown",
    (e) => {
      const opciones = [...lista.querySelectorAll<HTMLElement>("[data-opcion]")];
      const i = opciones.indexOf(document.activeElement as HTMLElement);
      const paso =
        e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!paso || i < 0) return;
      e.preventDefault();
      e.stopPropagation();
      opciones[(i + paso + opciones.length) % opciones.length]!.focus();
    },
    { signal },
  );

  // Fuera de la gota y de los mandos, cerrar. Y cerrar la lista de calidad.
  dialogo.addEventListener(
    "click",
    (e) => {
      const blanco = e.target as HTMLElement;
      if (!blanco.closest("[data-calidad]")) cerrarLista();
      if (blanco === dialogo || blanco.hasAttribute("data-velo")) cerrarPrimerPlano();
    },
    { signal },
  );
  pieza("cerrar").addEventListener("click", () => cerrarPrimerPlano(), { signal });
  // Escape: primero la lista, luego la pieza. Siempre con su vuelta animada.
  dialogo.addEventListener(
    "cancel",
    (e) => {
      e.preventDefault();
      if (!lista.hidden) {
        cerrarLista();
        botonCalidad.focus();
      } else cerrarPrimerPlano();
    },
    { signal },
  );
  dialogo.addEventListener(
    "keydown",
    (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const v = activa();
      const blanco = e.target as HTMLElement;
      const enMando = blanco.matches("button, input");
      if ((e.key === " " || e.key === "k") && !enMando) {
        e.preventDefault();
        alternar();
      } else if (
        v &&
        (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
        !blanco.matches("input") &&
        !blanco.closest("[data-calidad-lista]")
      ) {
        e.preventDefault();
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (e.key === "ArrowRight" ? 5 : -5)));
      } else if (e.key === "m") {
        pieza<HTMLButtonElement>("mudo").click();
      }
    },
    { signal },
  );
  // La rueda no mueve la página de debajo.
  dialogo.addEventListener("wheel", (e) => e.preventDefault(), { signal, passive: false });
  window.addEventListener(
    "resize",
    () => {
      const v = activa();
      if (!abierto || !v) return;
      gsap.killTweensOf(abierto.hasta);
      abierto.hasta = medirDestino(v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9);
      colocarMandos();
    },
    { signal },
  );

  // El avance, cada fotograma: `timeupdate` va a saltos.
  const marcar = () => {
    const v = activa();
    if (!abierto || !v || !Number.isFinite(v.duration) || v.duration === 0) return;
    const hecho = v.currentTime / v.duration;
    if (!arrastrando) avance.value = String(Math.round(hecho * 1000));
    const barra = avance.parentElement!;
    barra.style.setProperty("--p", `${(Number(avance.value) / 10).toFixed(2)}%`);
    const cargado = v.buffered.length ? v.buffered.end(v.buffered.length - 1) / v.duration : 0;
    barra.style.setProperty("--cargado", `${(cargado * 100).toFixed(1)}%`);
    const hora = reloj(v.currentTime);
    const tiempo = pieza("tiempo");
    if (tiempo.textContent !== hora) {
      tiempo.textContent = hora;
      avance.setAttribute("aria-valuetext", `${hora} / ${reloj(v.duration)}`);
    }
  };
  gsap.ticker.add(marcar);

  pintarSonido();
  pintarReproducir();
  ponerSonido = () => {
    quiereParar = false;
    pintarSonido();
    pintarReproducir();
  };
  soltarMandos = () => {
    eventos.abort();
    gsap.ticker.remove(marcar);
    cerrarPrimerPlano(true);
    soltarMandos = null;
  };
}

/**
 * Coloca los mandos, el aspa y el cartel alrededor de la gota. Las posiciones
 * van en píxeles, sin `translate` en porcentaje: GSAP se queda con el que
 * encuentra la primera vez que anima la pieza y, al girar el teléfono, los
 * mandos seguían desplazados como en la otra postura.
 */
function colocarMandos(): void {
  if (!abierto || !dialogo) return;
  const { hasta } = abierto;
  const W = window.innerWidth;
  const mano = enMano();
  dialogo.toggleAttribute("data-en-mano", mano);
  const mandos = pieza("mandos");
  const cerrar = pieza("cerrar");
  const cartel = pieza("cartel");
  const aspa = cerrar.offsetWidth || 48;
  if (enCompleta()) {
    // A pantalla completa todo va dentro: el aspa en la esquina y, si el
    // teléfono no está de pie, los mandos pegados abajo.
    cerrar.style.left = `${W - aspa - 12}px`;
    cerrar.style.top = "12px";
    if (mano) {
      mandos.style.width = mandos.style.left = mandos.style.top = "";
      return;
    }
    const ancho = Math.min(W - 24, 760);
    mandos.style.width = `${ancho}px`;
    mandos.style.left = `${(W - ancho) / 2}px`;
    mandos.style.top = `${window.innerHeight - (mandos.offsetHeight || 56) - 14}px`;
    return;
  }
  if (mano) {
    // En el teléfono los mandos van abajo, al alcance del pulgar (CSS), y el
    // cartel de la persona, pisando el canto inferior de la gota.
    mandos.style.width = mandos.style.left = mandos.style.top = "";
    cerrar.style.left = `${hasta.x + hasta.ancho - aspa * 0.92}px`;
    cerrar.style.top = `${Math.max(6, hasta.y - aspa * 0.08)}px`;
    cartel.style.left = `${hasta.x + 12}px`;
    cartel.style.top = `${hasta.y + hasta.alto - 22}px`;
    cartel.style.maxWidth = `${hasta.ancho - 40}px`;
    return;
  }
  const ancho = Math.max(Math.min(hasta.ancho - 24, 760, W - 24), Math.min(300, W - 24));
  mandos.style.width = `${ancho}px`;
  mandos.style.left = `${hasta.x + hasta.ancho / 2 - ancho / 2}px`;
  mandos.style.top = `${hasta.y + hasta.alto - (mandos.offsetHeight || 56) / 2}px`;
  cerrar.style.left = `${Math.min(hasta.x + hasta.ancho - aspa * 0.78, W - aspa - 6)}px`;
  cerrar.style.top = `${Math.max(6, hasta.y - aspa * 0.22)}px`;
}

/** Copia a la pieza lo que se ve ahora en el retrato, para el cambio de foco. */
function fotografiar(fuente: CanvasImageSource | null): void {
  const lienzo = pieza<HTMLCanvasElement>("fotograma");
  const ancho =
    fuente instanceof HTMLVideoElement ? fuente.videoWidth : fuente instanceof HTMLImageElement ? fuente.naturalWidth : 0;
  const alto =
    fuente instanceof HTMLVideoElement
      ? fuente.videoHeight
      : fuente instanceof HTMLImageElement
        ? fuente.naturalHeight
        : 0;
  if (!fuente || !ancho || !alto) return;
  const escala = Math.min(1, 960 / Math.max(ancho, alto));
  lienzo.width = Math.round(ancho * escala);
  lienzo.height = Math.round(alto * escala);
  try {
    lienzo.getContext("2d")?.drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
  } catch {
    // Una fuente que no se puede dibujar: la gota sale en el azul del fondo.
  }
}

/** Cuál de los dos vídeos se ve: el que suena, entero; el otro, escondido. */
function mostrar(): void {
  const v = activa();
  const g = gemela();
  if (v) {
    gsap.killTweensOf(v, "opacity");
    v.style.opacity = "1";
    v.style.zIndex = "1";
  }
  if (g) {
    gsap.killTweensOf(g, "opacity");
    g.style.opacity = "0";
    g.style.zIndex = "2";
  }
}

/**
 * Empieza un vídeo desde cero (nadie lo traía sonando): lo carga, lo deja en
 * `hora` y, cuando ya anda, sube su sonido poco a poco.
 */
function empezar(indice: number, hora: number, alEstarListo: () => void): void {
  const v = activa();
  if (!abierto || !v) return;
  abierto.actual = indice;
  let listo = false;
  const avisar = () => {
    if (listo) return;
    listo = true;
    alEstarListo();
  };
  fijarNivel(v, 0);
  v.loop = false;
  v.addEventListener(
    "loadedmetadata",
    () => {
      if (!Number.isFinite(v.duration)) return;
      // Si al retrato le quedaba un suspiro, mejor desde el principio.
      const desde = hora > v.duration - 3 ? 0 : hora;
      if (desde > 0.05) v.currentTime = Math.min(desde, Math.max(0, v.duration - 0.2));
    },
    { once: true },
  );
  v.src = abierto.origen.calidades[indice]!.src;
  v.load();
  // La llamada a `play` va dentro del gesto de la persona: es lo que deja
  // que suene. Avisa cuando ya anda: entonces entra el sonido.
  void v.play().then(
    () => {
      if (!abierto || abierto.cerrando || v !== activa()) return;
      nivel(v, 1, 1);
      avisar();
    },
    () => {
      // No ha podido arrancar solo: se enseña parado, listo para pulsar.
      fijarNivel(v, 1);
      if (v.readyState >= 2) avisar();
      else v.addEventListener("canplay", avisar, { once: true });
    },
  );
  pintarCalidad();
}

function pintarCalidad(): void {
  if (!abierto || !dialogo) return;
  const { calidades } = abierto.origen;
  const boton = pieza("calidad-boton");
  const lista = pieza("calidad-lista");
  const auto = dialogo.dataset.tAuto!;
  const nombre = (c: VideoSonido) => `${c.alto}p`;
  pieza("calidad").hidden = calidades.length < 2;
  boton.textContent = abierto.auto
    ? `${auto} · ${nombre(calidades[abierto.actual]!)}`
    : nombre(calidades[abierto.actual]!);
  lista.replaceChildren(
    ...[{ valor: "auto", texto: auto, marcada: abierto.auto }]
      .concat(
        calidades.map((c, i) => ({
          valor: String(i),
          texto: nombre(c),
          marcada: !abierto!.auto && i === abierto!.actual,
        })),
      )
      .map(({ valor, texto, marcada }) => {
        const opcion = document.createElement("button");
        opcion.type = "button";
        opcion.className = "opcion";
        opcion.dataset.opcion = valor;
        opcion.setAttribute("role", "radio");
        opcion.setAttribute("aria-checked", String(marcada));
        opcion.tabIndex = marcada ? 0 : -1;
        opcion.textContent = texto;
        return opcion;
      }),
  );
}

/**
 * OTRA CALIDAD, SIN CORTE. La nueva carga en el vídeo gemelo, parada un poco
 * por delante de donde va el que suena; cuando este llega a ese punto, el
 * gemelo arranca y los dos se cruzan en un instante: la imagen gana o pierde
 * nitidez y el sonido no se entera. Si no le da tiempo a cargar, se coloca
 * más adelante y lo vuelve a intentar.
 */
function cambiarCalidad(indice: number): void {
  if (!abierto || abierto.cerrando) return;
  const plano = abierto;
  plano.relevo?.();
  plano.relevo = null;
  const de = activa();
  const a = gemela();
  const calidad = plano.origen.calidades[indice];
  if (!de || !calidad) return;
  plano.actual = indice;
  pintarCalidad();
  if (!a || completa(calidad.src) === de.src) return;

  fijarNivel(a, 0);
  a.loop = false;
  a.src = calidad.src;
  a.load();

  let adelanto = 0.8;
  let objetivo = -1;
  const quieto = () => de.paused || de.ended || de.readyState < 3;
  const apuntar = () => {
    const tope = Math.max(0, (Number.isFinite(de.duration) ? de.duration : 1e9) - 0.08);
    objetivo = Math.min(quieto() ? de.currentTime : de.currentTime + adelanto, tope);
    try {
      a.currentTime = objetivo;
    } catch {
      objetivo = -1;
    }
  };
  if (a.readyState >= 1) apuntar();
  else a.addEventListener("loadedmetadata", apuntar, { once: true });

  const entregar = () => {
    gsap.ticker.remove(paso);
    plano.relevo = null;
    const sonando = !de.paused && !de.ended;
    if (sonando) void a.play().catch(() => {});
    // El sonido se cruza en un instante (los dos dicen lo mismo a la vez);
    // la imagen nueva aparece encima de la vieja.
    fijarNivel(a, sonando ? 0 : 1);
    if (sonando) nivel(a, 1, 0.14);
    nivel(de, 0, 0.14, () => vaciar(de));
    relevar();
    a.style.zIndex = "2";
    de.style.zIndex = "1";
    gsap.fromTo(
      a,
      { opacity: 0 },
      { opacity: 1, duration: 0.45, ease: "sine.inOut", onComplete: () => void (de.style.opacity = "0") },
    );
    ponerSonido?.();
  };

  const paso = () => {
    if (objetivo < 0) return;
    const lista = a.readyState >= 3 && !a.seeking;
    if (quieto()) {
      if (!lista) return;
      // Parado o atascado: el gemelo entra donde está el otro.
      if (Math.abs(a.currentTime - de.currentTime) > 0.25 && !de.ended) apuntar();
      else entregar();
    } else if (objetivo - de.currentTime <= 0.02) {
      if (lista) entregar();
      else {
        adelanto = Math.min(adelanto * 1.8, 5);
        apuntar();
      }
    }
  };
  gsap.ticker.add(paso);
  plano.relevo = () => {
    gsap.ticker.remove(paso);
    vaciar(a);
  };
}

/** Saca la gota de su retrato. Devuelve si pudo. */
export function abrirPrimerPlano(origen: OrigenPlano): boolean {
  if (!dialogo || abierto || origen.calidades.length === 0 || !activa()) return false;
  const gota = pieza("gota");
  const velo = pieza("velo");
  const mandos = [pieza("mandos"), pieza("cerrar"), pieza("cartel")];
  const contorno = pieza<SVGPathElement>("contorno");
  const luz = pieza<SVGPathElement>("luz");
  const quieto = sinMovimiento();

  // Si este retrato ya sonaba, la gota se abre con ese mismo sonido.
  const cedida = origen.retrato ? cederVoz(origen.retrato) : null;
  if (!cedida) callar(0.35);
  const g = gemela();
  if (g) vaciar(g);

  const desde = medirOrigen(origen);
  // Mientras no se sabe la proporción del vídeo, apaisada: es lo habitual.
  const hasta = medirDestino(16 / 9);
  const estado = { p: quieto ? 1 : 0, bruma: 0, mezcla: 0 };
  const inicio = performance.now();
  const giro = origen.giro ?? 0;

  const pintar = () => {
    if (!abierto) return;
    const { desde: a, hasta: b } = abierto;
    const p = estado.p;
    gota.style.left = `${a.x + (b.x - a.x) * p}px`;
    gota.style.top = `${a.y + (b.y - a.y) * p}px`;
    gota.style.width = `${a.ancho + (b.ancho - a.ancho) * p}px`;
    gota.style.height = `${a.alto + (b.alto - a.alto) * p}px`;
    gota.style.rotate = `${giro * (1 - p)}deg`;
    gota.style.setProperty("--bruma", `${estado.bruma.toFixed(2)}px`);
    gota.style.setProperty("--mezcla", estado.mezcla.toFixed(3));
    gota.style.setProperty("--bruma-n", (estado.bruma / BRUMA).toFixed(3));
    const d = trazar(abierto.radios, p, (performance.now() - inicio) / 1000);
    contorno.setAttribute("d", d);
    luz.setAttribute("d", d);
  };

  const plano = {
    origen,
    desde,
    hasta,
    radios: radiosDelRetrato(origen.blob),
    estado,
    linea: null as gsap.core.Timeline | null,
    pintar,
    cerrando: false,
    actual: 0,
    auto: true,
    paradas: [] as number[],
    relevo: null as (() => void) | null,
    esperas: [] as gsap.core.Tween[],
  };
  abierto = plano;

  dialogo.setAttribute("aria-label", dialogo.dataset.titulo!.replaceAll("{nombre}", origen.nombre));
  // El cartel de la persona (solo se ve en el teléfono).
  const cartel = pieza("cartel");
  cartel.hidden = !origen.cartel;
  if (origen.cartel) {
    pieza("cartel-categoria").textContent = origen.cartel.categoria;
    pieza("cartel-nombre").textContent = origen.nombre;
    pieza("cartel-oficio").textContent = origen.cartel.oficio;
    cartel.style.setProperty("--acento", origen.cartel.color);
    cartel.style.setProperty("--acento-texto", origen.cartel.colorTexto);
    if (origen.cartel.href) cartel.setAttribute("href", origen.cartel.href);
    else cartel.removeAttribute("href");
  }
  fotografiar(origen.fotograma());
  mostrar();
  pintar();
  colocarMandos();
  gsap.set(gota, { autoAlpha: 1 });
  gsap.set(velo, { autoAlpha: 0 });
  gsap.set(mandos, { opacity: 0, y: 14 });
  dialogo.showModal();
  // Otra vez, ya abierta: cerrada, la pieza no tiene medidas.
  colocarMandos();
  // El foco, en el botón de pausa: así la barra espaciadora ya lo maneja.
  pieza("reproducir").focus({ preventScroll: true });
  obtenerScroll()?.stop();
  gsap.ticker.add(pintar);

  // Con la proporción real del vídeo, la pantalla se ajusta a ella.
  const v = activa()!;
  const proporcionar = () => {
    if (abierto !== plano || !v.videoWidth || !v.videoHeight) return;
    const nueva = medirDestino(v.videoWidth / v.videoHeight);
    gsap.to(plano.hasta, { ...nueva, duration: 0.5, ease: "expo.out", onUpdate: colocarMandos });
  };

  // ENFOCA cuando ya va por medio camino Y el vídeo tiene imagen. Si tarda en
  // cargar, espera en la bruma.
  let enfocado = false;
  let asentado = quieto;
  let videoListo = false;
  const intentar = () => {
    if (!videoListo || !asentado || enfocado || abierto !== plano || plano.cerrando) return;
    enfocado = true;
    gsap.to(estado, { mezcla: 1, duration: 0.45, ease: "sine.inOut" });
    gsap.to(estado, { bruma: 0, duration: 0.85, ease: "sine.inOut", delay: 0.12 });
  };

  const quiere = elegirAuto(origen.calidades, hasta.alto);
  if (cedida) {
    // Ya anda y ya suena: no se carga nada ni se toca el sonido.
    const va = origen.calidades.findIndex((c) => completa(c.src) === cedida.src);
    plano.actual = va >= 0 ? va : origen.calidades.length - 1;
    nivel(cedida, 1, 0.3);
    videoListo = true;
    proporcionar();
    pintarCalidad();
    // Lo que sonaba era la versión más ligera: ya abierta, sube a la que toca.
    if (quiere !== plano.actual) plano.esperas.push(gsap.delayedCall(1.1, () => cambiarCalidad(quiere)));
  } else {
    v.addEventListener("loadedmetadata", proporcionar, { once: true });
    empezar(quiere, origen.hora(), () => {
      videoListo = true;
      intentar();
    });
  }
  ponerSonido?.();

  const linea = gsap.timeline();
  plano.linea = linea;
  linea.to(velo, { autoAlpha: 1, duration: 0.8, ease: "sine.out" }, 0);
  if (!quieto) {
    // Sale desenfocándose y crece, despacio al arrancar y al llegar.
    linea.to(estado, { bruma: BRUMA, duration: 0.42, ease: "sine.inOut" }, 0);
    linea.to(estado, { p: 1, duration: 1.15, ease: SUAVE }, 0);
    linea.call(
      () => {
        asentado = true;
        intentar();
      },
      [],
      0.4,
    );
  } else {
    estado.bruma = BRUMA * 0.5;
    intentar();
  }
  linea.to(mandos, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.07 }, quieto ? 0.1 : 0.6);

  origen.alAbrir?.();
  return true;
}

/** Devuelve la gota a su retrato. `yaMismo`: sin animación (cambio de página). */
export function cerrarPrimerPlano(yaMismo = false): void {
  if (!abierto || !dialogo) return;
  if (abierto.cerrando && !yaMismo) return;
  const plano = abierto;
  const { origen, estado } = plano;
  const v = activa();
  const gota = pieza("gota");
  const velo = pieza("velo");
  const mandos = [pieza("mandos"), pieza("cerrar"), pieza("cartel")];
  plano.cerrando = true;
  salirDeCompleta();
  dialogo.removeAttribute("data-es-completa");
  plano.linea?.kill();
  plano.esperas.forEach((e) => e.kill());
  plano.relevo?.();
  plano.relevo = null;
  gsap.killTweensOf([estado, plano.hasta, velo, ...mandos]);
  pieza("calidad-lista").hidden = true;

  const horaDe = () => (!v || v.ended ? 0 : v.currentTime);
  // Con el puntero sobre el retrato, al volver sigue sonando: la voz pasa a él.
  let sigue = false;
  const terminar = () => {
    gsap.ticker.remove(plano.pintar);
    if (v && !sigue) vaciar(v);
    abierto = null;
    if (dialogo?.open) dialogo.close();
    obtenerScroll()?.start();
    origen.alCerrar?.(sigue);
  };

  if (yaMismo || sinMovimiento()) {
    origen.alVolver?.(horaDe());
    terminar();
    return;
  }

  sigue = Boolean(v && origen.retrato && !v.paused && !v.ended && !ajustes.mudo && origen.encima?.());
  // Si no sigue, el sonido se va apagando mientras la gota vuelve.
  if (v && !sigue) nivel(v, 0, 0.9);

  // El retrato puede haberse movido (cambio de tamaño de la ventana).
  plano.desde = medirOrigen(origen);
  plano.radios = radiosDelRetrato(origen.blob);
  const linea = gsap.timeline({ onComplete: terminar });
  plano.linea = linea;
  linea.to(mandos, { opacity: 0, y: 10, duration: 0.3, ease: "sine.in" }, 0);
  linea.to(estado, { bruma: BRUMA * 0.8, duration: 0.5, ease: "sine.inOut" }, 0);
  linea.to(estado, { p: 0, duration: 1, ease: SUAVE }, 0);
  linea.to(velo, { autoAlpha: 0, duration: 0.8, ease: "sine.inOut" }, 0.1);
  // A medio camino, el retrato arranca por donde iba el vídeo y vuelve a
  // enfocar: cuando la gota llega, ya la espera casi nítido.
  linea.call(
    () => {
      origen.alVolver?.(horaDe());
      if (sigue && v && origen.retrato) retomarVoz(origen.retrato, v, origen.alSonar ?? (() => {}));
    },
    [],
    0.35,
  );
  // La gota se deshace sobre él: las dos están fuera de foco, no se ve el relevo.
  linea.to(gota, { autoAlpha: 0, duration: 0.45, ease: "sine.inOut" }, 0.62);
}

export const primerPlanoAbierto = () => abierto !== null;
