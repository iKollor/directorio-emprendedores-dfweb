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
 * luz, y enfoca ya en el vídeo. Cambiar de calidad hace lo mismo. Detrás, la
 * página se desenfoca y el retrato que se dejó atrás vuelve a la tinta.
 *
 * CALIDAD, COMO EN UN SERVICIO DE VÍDEO. Con varias calidades (`videoSonido`)
 * la persona elige una o deja "Auto", que escoge según el tamaño de la gota
 * en pantalla y la conexión, y baja un escalón si el vídeo se queda parado
 * cargando. Son archivos enteros, no trozos: cambiar de calidad vuelve a
 * cargar desde el segundo en que iba.
 */
import { gsap } from "gsap";
import { CONTORNOS, MUESTRAS_CONTORNO } from "./blob";
import type { VideoSonido } from "./directorio";
import { obtenerScroll, sinMovimiento } from "./scroll";
import { ajustes, callar, guardarAjustes } from "./sonido";

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
  /** Las calidades, de mayor a menor. Una sola: sin selector. */
  calidades: VideoSonido[];
  nombre: string;
  /** La gota ha salido: el retrato se queda atrás. */
  alAbrir?: () => void;
  /** La gota empieza a volver; recibe el segundo por el que iba el vídeo. */
  alVolver?: (hora: number) => void;
  /** Ya está en su sitio. */
  alCerrar?: () => void;
};

/** Puntos del borde. Más que los del retrato: la pantalla es mucho mayor. */
const PUNTOS = 96;
const TAU = Math.PI * 2;
/** Desenfoque máximo del cambio de foco, en píxeles. */
const BRUMA = 26;

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

/** Dónde queda la pantalla: centrada, con sitio para los mandos y el cierre. */
function medirDestino(proporcion: number): Caja {
  const W = window.innerWidth;
  const H = window.innerHeight;
  // No llena la ventana: alrededor se sigue viendo la página, fuera de foco.
  // En el teléfono el aire va arriba y abajo; a los lados apenas cabe.
  const lado = W < 640 ? 12 : Math.max(24, Math.min(W, H) * 0.075);
  const arriba = Math.max(56, H * 0.075);
  const abajo = Math.max(72, H * 0.1);
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

/** Se llama una vez por página: engancha los mandos de la pieza. */
export function montarPrimerPlano(): void {
  soltarMandos?.();
  dialogo = document.querySelector<HTMLDialogElement>("[data-primer-plano]");
  if (!dialogo) return;

  const eventos = new AbortController();
  const { signal } = eventos;
  const video = pieza<HTMLVideoElement>("video");
  const avance = pieza<HTMLInputElement>("avance");
  const volumen = pieza<HTMLInputElement>("volumen");
  const botonCalidad = pieza<HTMLButtonElement>("calidad-boton");
  const lista = pieza<HTMLElement>("calidad-lista");
  const textos = dialogo.dataset;
  let arrastrando = false;

  const alternar = () => {
    if (video.paused || video.ended) void video.play().catch(() => {});
    else video.pause();
  };
  const pintarReproducir = () => {
    const parado = video.paused || video.ended;
    dialogo!.toggleAttribute("data-parado", parado);
    pieza("reproducir").setAttribute("aria-label", parado ? textos.tReproducir! : textos.tPausar!);
  };
  const pintarSonido = () => {
    const mudo = ajustes.mudo || ajustes.volumen === 0;
    video.muted = ajustes.mudo;
    video.volume = ajustes.volumen;
    dialogo!.toggleAttribute("data-sin-sonido", mudo);
    pieza("mudo").setAttribute("aria-label", mudo ? textos.tSonido! : textos.tSilenciar!);
    pieza("mudo").setAttribute("aria-pressed", String(mudo));
    volumen.value = String(Math.round((ajustes.mudo ? 0 : ajustes.volumen) * 100));
    volumen.style.setProperty("--p", `${volumen.value}%`);
  };
  const cerrarLista = () => {
    lista.hidden = true;
    botonCalidad.setAttribute("aria-expanded", "false");
  };

  pieza("reproducir").addEventListener("click", alternar, { signal });
  video.addEventListener("click", alternar, { signal });
  for (const tipo of ["play", "pause", "ended"]) video.addEventListener(tipo, pintarReproducir, { signal });

  avance.addEventListener("pointerdown", () => (arrastrando = true), { signal });
  window.addEventListener("pointerup", () => (arrastrando = false), { signal });
  avance.addEventListener(
    "input",
    () => {
      if (Number.isFinite(video.duration)) video.currentTime = (Number(avance.value) / 1000) * video.duration;
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
      const destino = abierto.auto
        ? elegirAuto(abierto.origen.calidades, abierto.hasta.alto)
        : Number(valor);
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
      const paso = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!paso || i < 0) return;
      e.preventDefault();
      e.stopPropagation();
      opciones[(i + paso + opciones.length) % opciones.length]!.focus();
    },
    { signal },
  );

  // "Auto" baja un escalón si el vídeo se queda parado cargando dos veces
  // en poco tiempo.
  video.addEventListener(
    "waiting",
    () => {
      if (!abierto || !abierto.auto || video.seeking) return;
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
      const blanco = e.target as HTMLElement;
      const enMando = blanco.matches("button, input");
      if ((e.key === " " || e.key === "k") && !enMando) {
        e.preventDefault();
        alternar();
      } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !blanco.matches("input") && !blanco.closest("[data-calidad-lista]")) {
        e.preventDefault();
        video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + (e.key === "ArrowRight" ? 5 : -5)));
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
      if (!abierto) return;
      abierto.hasta = medirDestino(video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : abierto.hasta.ancho / abierto.hasta.alto);
      colocarMandos();
    },
    { signal },
  );

  // El avance, cada fotograma: `timeupdate` va a saltos.
  const marcar = () => {
    if (!abierto || !Number.isFinite(video.duration) || video.duration === 0) return;
    const hecho = video.currentTime / video.duration;
    if (!arrastrando) avance.value = String(Math.round(hecho * 1000));
    avance.style.setProperty("--p", `${(Number(avance.value) / 10).toFixed(2)}%`);
    const cargado = video.buffered.length ? video.buffered.end(video.buffered.length - 1) / video.duration : 0;
    avance.style.setProperty("--cargado", `${(cargado * 100).toFixed(1)}%`);
    const hora = reloj(video.currentTime);
    const tiempo = pieza("tiempo");
    if (tiempo.textContent !== hora) {
      tiempo.textContent = hora;
      avance.setAttribute("aria-valuetext", `${hora} / ${reloj(video.duration)}`);
    }
  };
  gsap.ticker.add(marcar);

  pintarSonido();
  pintarReproducir();
  soltarMandos = () => {
    eventos.abort();
    gsap.ticker.remove(marcar);
    cerrarPrimerPlano(true);
    soltarMandos = null;
  };
  ponerSonido = pintarSonido;
}

function colocarMandos(): void {
  if (!abierto || !dialogo) return;
  const { hasta } = abierto;
  const mandos = pieza("mandos");
  const ancho = Math.min(hasta.ancho - 24, 760, window.innerWidth - 24);
  mandos.style.width = `${Math.max(ancho, Math.min(300, window.innerWidth - 24))}px`;
  mandos.style.left = `${hasta.x + hasta.ancho / 2}px`;
  mandos.style.top = `${hasta.y + hasta.alto}px`;
  const cerrar = pieza("cerrar");
  cerrar.style.left = `${Math.min(hasta.x + hasta.ancho, window.innerWidth - 8)}px`;
  cerrar.style.top = `${Math.max(hasta.y, 8)}px`;
}

/** Copia a la pieza lo que se ve ahora (retrato o vídeo), para el cambio de foco. */
function fotografiar(fuente: CanvasImageSource | null): void {
  const lienzo = pieza<HTMLCanvasElement>("fotograma");
  const ancho = fuente instanceof HTMLVideoElement ? fuente.videoWidth : fuente instanceof HTMLImageElement ? fuente.naturalWidth : 0;
  const alto = fuente instanceof HTMLVideoElement ? fuente.videoHeight : fuente instanceof HTMLImageElement ? fuente.naturalHeight : 0;
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

/** Carga una calidad en el vídeo y lo deja en `hora`, sonando o no. */
function cargar(indice: number, hora: number, sonando: boolean, alEstarListo: () => void, alAbrir = false): void {
  if (!abierto) return;
  const video = pieza<HTMLVideoElement>("video");
  abierto.actual = indice;
  const calidad = abierto.origen.calidades[indice]!;
  let listo = false;
  const avisar = () => {
    if (listo) return;
    listo = true;
    alEstarListo();
  };
  video.addEventListener(
    "loadedmetadata",
    () => {
      if (!Number.isFinite(video.duration)) return;
      // Si al retrato le quedaba un suspiro, mejor desde el principio.
      const desde = alAbrir && hora > video.duration - 3 ? 0 : hora;
      if (desde > 0.05) video.currentTime = Math.min(desde, Math.max(0, video.duration - 0.2));
    },
    { once: true },
  );
  // Listo cuando ya pinta el fotograma que toca, no solo cuando tiene datos.
  const comprobar = () => {
    if (video.readyState >= 2 && !video.seeking) avisar();
  };
  video.addEventListener("seeked", comprobar, { once: true });
  video.addEventListener("canplay", comprobar, { once: true });
  video.addEventListener("playing", comprobar, { once: true });
  video.src = calidad.src;
  video.load();
  // La llamada a `play` va dentro del gesto de la persona: es lo que deja
  // que suene.
  if (sonando) void video.play().catch(() => {});
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
  boton.textContent = abierto.auto ? `${auto} · ${nombre(calidades[abierto.actual]!)}` : nombre(calidades[abierto.actual]!);
  lista.replaceChildren(
    ...[{ valor: "auto", texto: auto, marcada: abierto.auto }]
      .concat(calidades.map((c, i) => ({ valor: String(i), texto: nombre(c), marcada: !abierto!.auto && i === abierto!.actual })))
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

/** Otro archivo, el mismo segundo: se desenfoca, cambia y vuelve a enfocar. */
function cambiarCalidad(indice: number): void {
  if (!abierto || abierto.cerrando) return;
  const video = pieza<HTMLVideoElement>("video");
  const { estado } = abierto;
  if (indice === abierto.actual) {
    pintarCalidad();
    return;
  }
  const hora = video.currentTime;
  const sonando = !video.paused && !video.ended;
  fotografiar(video);
  estado.mezcla = 0;
  gsap.killTweensOf(estado, "bruma,mezcla");
  gsap.to(estado, { bruma: BRUMA * 0.6, duration: 0.25, ease: "power1.out" });
  cargar(indice, hora, sonando, () => {
    if (!abierto || abierto.cerrando) return;
    gsap.to(estado, { mezcla: 1, duration: 0.3, ease: "power1.inOut" });
    gsap.to(estado, { bruma: 0, duration: 0.55, ease: "power2.out", delay: 0.1 });
  });
}

/** Saca la gota de su retrato. Devuelve si pudo. */
export function abrirPrimerPlano(origen: OrigenPlano): boolean {
  if (!dialogo || abierto || origen.calidades.length === 0) return false;
  const video = pieza<HTMLVideoElement>("video");
  const gota = pieza("gota");
  const velo = pieza("velo");
  const mandos = [pieza("mandos"), pieza("cerrar")];
  const contorno = pieza<SVGPathElement>("contorno");
  const luz = pieza<SVGPathElement>("luz");
  const quieto = sinMovimiento();

  callar();
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

  abierto = {
    origen,
    desde,
    hasta,
    radios: radiosDelRetrato(origen.blob),
    estado,
    linea: null,
    pintar,
    cerrando: false,
    actual: 0,
    auto: true,
    paradas: [],
  };

  dialogo.setAttribute("aria-label", dialogo.dataset.titulo!.replaceAll("{nombre}", origen.nombre));
  fotografiar(origen.fotograma());
  pintar();
  colocarMandos();
  gsap.set(gota, { autoAlpha: 1 });
  gsap.set(velo, { autoAlpha: 0 });
  gsap.set(mandos, { autoAlpha: 0, y: 14 });
  dialogo.showModal();
  // El foco, en el botón de pausa: así la barra espaciadora ya lo maneja.
  pieza("reproducir").focus({ preventScroll: true });
  obtenerScroll()?.stop();
  gsap.ticker.add(pintar);
  ponerSonido?.();

  // Con la proporción real del vídeo, la pantalla se ajusta a ella.
  video.addEventListener(
    "loadedmetadata",
    () => {
      if (!abierto || !video.videoWidth || !video.videoHeight) return;
      const nueva = medirDestino(video.videoWidth / video.videoHeight);
      gsap.to(abierto.hasta, { ...nueva, duration: 0.5, ease: "expo.out", onUpdate: colocarMandos });
    },
    { once: true },
  );

  let enfocado = false;
  let asentado = quieto;
  const enfocar = () => {
    if (enfocado || !abierto || abierto.cerrando) return;
    enfocado = true;
    gsap.to(estado, { mezcla: 1, duration: 0.35, ease: "power1.inOut" });
    gsap.to(estado, { bruma: 0, duration: 0.75, ease: "power2.out", delay: 0.22 });
  };
  let videoListo = false;
  const intentar = () => {
    if (videoListo && asentado) enfocar();
  };
  cargar(elegirAuto(origen.calidades, hasta.alto), origen.hora(), true, () => {
    videoListo = true;
    intentar();
  }, true);

  const linea = gsap.timeline();
  abierto.linea = linea;
  linea.to(velo, { autoAlpha: 1, duration: 0.55, ease: "power2.out" }, 0);
  if (!quieto) {
    // Sale desenfocándose y crece. Enfoca cuando ya va por medio camino y el
    // vídeo tiene imagen; si tarda en cargar, espera en la bruma.
    linea.to(estado, { bruma: BRUMA, duration: 0.28, ease: "power1.out" }, 0);
    linea.to(estado, { p: 1, duration: 1.1, ease: "power4.out" }, 0);
    linea.call(
      () => {
        asentado = true;
        intentar();
      },
      [],
      0.34,
    );
  } else {
    estado.bruma = BRUMA * 0.5;
    intentar();
  }
  linea.to(mandos, { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 }, quieto ? 0.1 : 0.5);

  origen.alAbrir?.();
  return true;
}

/** Devuelve la gota a su retrato. `yaMismo`: sin animación (cambio de página). */
export function cerrarPrimerPlano(yaMismo = false): void {
  if (!abierto || !dialogo) return;
  if (abierto.cerrando && !yaMismo) return;
  const plano = abierto;
  const { origen, estado } = plano;
  const video = pieza<HTMLVideoElement>("video");
  const gota = pieza("gota");
  const velo = pieza("velo");
  const mandos = [pieza("mandos"), pieza("cerrar")];
  plano.cerrando = true;
  plano.linea?.kill();
  gsap.killTweensOf([estado, plano.hasta, velo, ...mandos]);
  pieza("calidad-lista").hidden = true;

  const hora = video.ended ? 0 : video.currentTime;
  const terminar = () => {
    gsap.ticker.remove(plano.pintar);
    video.pause();
    video.removeAttribute("src");
    video.load();
    abierto = null;
    if (dialogo?.open) dialogo.close();
    obtenerScroll()?.start();
    origen.alCerrar?.();
  };

  if (yaMismo || sinMovimiento()) {
    origen.alVolver?.(hora);
    terminar();
    return;
  }

  // El retrato puede haberse movido (cambio de tamaño de la ventana).
  plano.desde = medirOrigen(origen);
  plano.radios = radiosDelRetrato(origen.blob);
  const linea = gsap.timeline({ onComplete: terminar });
  plano.linea = linea;
  linea.to(mandos, { autoAlpha: 0, y: 10, duration: 0.2, ease: "power1.in" }, 0);
  linea.to(estado, { bruma: BRUMA * 0.8, duration: 0.3, ease: "power1.out" }, 0);
  linea.to(estado, { p: 0, duration: 0.85, ease: "power4.out" }, 0.05);
  linea.to(velo, { autoAlpha: 0, duration: 0.55, ease: "power2.inOut" }, 0.15);
  // Ya casi en su sitio, el retrato vuelve a enfocar y la gota se deshace
  // sobre él: las dos están fuera de foco, así que no se ve el relevo.
  linea.call(() => origen.alVolver?.(hora), [], 0.3);
  linea.to(video, { volume: 0, duration: 0.3, ease: "power1.in" }, 0);
  linea.to(gota, { autoAlpha: 0, duration: 0.3, ease: "power1.inOut" }, 0.55);
}

export const primerPlanoAbierto = () => abierto !== null;
