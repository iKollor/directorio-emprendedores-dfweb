/**
 * EL SONIDO DE LOS RETRATOS. Los vídeos de los retratos van en silencio y en
 * bucle; al pasar el puntero por encima de uno, suena.
 *
 * El retrato es un recorte cuadrado y mudo. Lo que suena es la versión con
 * sonido del mismo vídeo (`videoSonido` en lib/directorio.ts), que tiene la
 * misma línea de tiempo, reproducida en la voz del sitio (lib/voz.ts). Si la
 * persona no tiene esa versión, suena el propio archivo del retrato.
 *
 * EL SONIDO NO SE TOCA; SE AJUSTA LA IMAGEN. Para que boca y voz vayan a la
 * par, una de las dos tiene que ceder. Antes cedía el sonido: se recolocaba
 * cada vez que se separaba de la imagen, y cada recolocación era un corte
 * (con el vídeo llegando por la red, varios seguidos: entraba, se iba y
 * volvía). Ahora la voz arranca una vez, donde va el retrato, y a partir de
 * ahí es el retrato, que es mudo, el que acelera o frena un poco para seguirla:
 * eso no se oye ni se ve.
 *
 * ENTRA Y SALE FUNDIDO, nunca de golpe, y solo cuando ya está sonando de
 * verdad (no mientras carga). Si el puntero sale y vuelve antes de que
 * termine de apagarse, sube otra vez desde donde iba.
 *
 * LOS NAVEGADORES NO DEJAN SONAR NADA SIN UN GESTO. Pasar el puntero no cuenta
 * como gesto: hasta que la persona pulsa o toca algo de la página, pedir
 * sonido falla. Por eso `sonar` avisa de cómo quedó (`suena` o `bloqueado`) y
 * quien lo llama enseña el altavoz tachado: pulsarlo, o pulsar el retrato, sí es un gesto.
 * En el primer gesto se "despiertan" los vídeos de la voz, que es lo que pide
 * Safari para dejarlos sonar después sin otro gesto.
 *
 * UNA PERSONA, UNA PISTA. Cada persona tiene su vídeo con sonido en varias
 * calidades (su "familia"). Si la voz ya tiene cargada cualquiera de ellas,
 * se sigue con esa: no se vuelve a cargar otra. Antes, al cerrar el primer
 * plano y volver al retrato, se descargaba lo que sonaba y se cargaba la
 * versión ligera desde cero: el sonido se apagaba y volvía a entrar.
 */
import { activa, ajustes, fijarNivel, gemela, nivel } from "./voz";

export type EstadoSonido = "calla" | "suena" | "bloqueado";

/** Lo que tarda en entrar y en salir el sonido de un retrato (s). */
const ENTRA = 0.9;
const SALE = 0.6;
/** Lo que suele tardar la voz en arrancar: se la coloca ese poco por delante (s). */
const ADELANTO = 0.1;
/** Un WAV vacío, para despertar los vídeos de la voz en el primer gesto. */
const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

type Turno = {
  retrato: HTMLVideoElement;
  el: HTMLVideoElement;
  avisar: (estado: EstadoSonido) => void;
  vigia: number;
  /** Por dónde iba la voz en la última mirada, y si entonces avanzaba. */
  ultimo: number;
  anda: boolean;
};
let turno: Turno | null = null;

/** Dónde está el puntero, por si hay que saberlo sin esperar a que se mueva. */
const puntero = { x: -1, y: -1, raton: false };
let despierta = false;

function despertar(): void {
  if (despierta) return;
  despierta = true;
  for (const el of [activa(), gemela()]) {
    if (!el || el.getAttribute("src")) continue;
    el.src = SILENCIO;
    void el.play().then(
      () => {
        if (el.getAttribute("src") === SILENCIO) {
          el.pause();
          el.removeAttribute("src");
          el.load();
        }
      },
      () => {},
    );
  }
}

if (typeof window !== "undefined") {
  const anotar = (e: PointerEvent) => {
    puntero.x = e.clientX;
    puntero.y = e.clientY;
    puntero.raton = e.pointerType === "mouse";
  };
  window.addEventListener("pointermove", anotar, { capture: true, passive: true });
  window.addEventListener(
    "pointerdown",
    (e) => {
      anotar(e);
      despertar();
    },
    { capture: true, passive: true },
  );
  window.addEventListener("keydown", despertar, { capture: true, passive: true });
}

/**
 * ¿Está el ratón sobre este retrato? Por geometría (la gota es casi un
 * círculo), porque con el primer plano abierto la página de debajo no recibe
 * el puntero y no se le puede preguntar.
 */
export function punteroSobre(caja: Element): boolean {
  if (!puntero.raton) return false;
  const r = caja.getBoundingClientRect();
  const dx = (puntero.x - (r.left + r.width / 2)) / (r.width * 0.47);
  const dy = (puntero.y - (r.top + r.height / 2)) / (r.height * 0.47);
  return dx * dx + dy * dy < 1;
}

/** Lo mismo para una pieza rectangular (el cartel, el altavoz). */
export function punteroEn(caja: Element | null | undefined): boolean {
  if (!puntero.raton || !caja) return false;
  const r = caja.getBoundingClientRect();
  return puntero.x >= r.left && puntero.x <= r.right && puntero.y >= r.top && puntero.y <= r.bottom;
}

const entera = (src: string) => new URL(src, location.href).href;
/** ¿Tiene la voz cargado ya el vídeo de esta persona, en la calidad que sea? */
const esSuya = (el: HTMLVideoElement, destino: string, familia: string[]) =>
  el.src === destino || familia.some((src) => entera(src) === el.src);

/** El retrato, mudo, sigue a la voz: acelera o frena un poco, sin que se note. */
function acompasar(mio: Turno): void {
  const { retrato, el } = mio;
  // Si el retrato se para (pestaña oculta, fuera de pantalla), la voz espera.
  if (retrato.paused || retrato.ended) {
    if (!el.paused) el.pause();
    return;
  }
  if (el.paused) {
    void el.play().catch(() => {});
    return;
  }
  // ¿ANDA DE VERDAD? Con la red lenta la voz se queda cargando: no está en
  // pausa, pero tampoco avanza. Mientras tanto el retrato sigue a su aire.
  // Antes la seguía igual, y como ella no se movía, él se quedaba clavado:
  // pasar el puntero "pausaba" el vídeo.
  const avanza = el.readyState >= 3 && !el.seeking && el.currentTime !== mio.ultimo;
  mio.ultimo = el.currentTime;
  if (!avanza) {
    if (mio.anda) {
      mio.anda = false;
      retrato.playbackRate = 1;
      mio.avisar("calla");
    }
    return;
  }
  const dura = el.duration;
  if (!Number.isFinite(dura) || dura <= 0) return;
  let d = retrato.currentTime - el.currentTime;
  // Los dos van en bucle: al dar la vuelta uno antes que otro, no es un desfase.
  if (d > dura / 2) d -= dura;
  if (d < -dura / 2) d += dura;
  const colocar = () => {
    retrato.playbackRate = 1;
    retrato.currentTime = Math.min(el.currentTime + 0.04, Math.max(0, retrato.duration - 0.05));
  };
  if (!mio.anda) {
    // Empieza (o vuelve) a sonar: el retrato se coloca UNA vez donde va ella.
    mio.anda = true;
    mio.avisar("suena");
    if (Math.abs(d) > 0.25) {
      colocar();
      return;
    }
  }
  if (Math.abs(d) > 0.6) colocar();
  else retrato.playbackRate = Math.min(1.12, Math.max(0.88, 1 - d * 0.6));
}

function seguir(mio: Turno): void {
  window.clearInterval(mio.vigia);
  mio.vigia = window.setInterval(() => turno === mio && acompasar(mio), 200);
  acompasar(mio);
}

/**
 * Va cargando el sonido de un retrato antes de que haga falta (cuando el
 * puntero se acerca): así, al llegar, entra sin espera. No suena nada.
 */
export function preparar(src: string | null, familia: string[] = []): void {
  const el = activa();
  if (!el || !src || turno || ajustes.mudo || !el.paused) return;
  const destino = entera(src);
  if (esSuya(el, destino, familia)) return;
  fijarNivel(el, 0);
  el.preload = "auto";
  el.src = destino;
}

/**
 * Hace sonar un retrato. `src` es su versión con sonido; sin ella, suena el
 * propio archivo. `familia` son todas las calidades de esa persona: si la voz
 * ya tiene una, sigue con ella. `avisar` recibe cómo quedó.
 */
export function sonar(
  retrato: HTMLVideoElement,
  src: string | null,
  avisar: (estado: EstadoSonido) => void,
  familia: string[] = [],
): void {
  if (turno?.retrato === retrato) return;
  callar();
  const el = activa();
  if (!el || ajustes.mudo) {
    avisar("bloqueado");
    return;
  }
  const destino = entera(src ?? (retrato.currentSrc || retrato.src));
  const mio: Turno = { retrato, el, avisar, vigia: 0, ultimo: -1, anda: false };
  turno = mio;

  // Si es la misma pista y aún se estaba apagando, sube otra vez desde donde iba.
  const suya = esSuya(el, destino, familia);
  const yaSuena = suya && !el.paused && !el.ended;
  el.loop = true;
  el.playbackRate = 1;
  if (!yaSuena) {
    fijarNivel(el, 0);
    if (!suya) el.src = destino;
    const situar = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) el.currentTime = (retrato.currentTime + ADELANTO) % el.duration;
    };
    if (el.readyState >= 1) situar();
    else el.addEventListener("loadedmetadata", situar, { once: true });
  }
  // `play` avisa cuando ya suena de verdad: hasta entonces no se oye nada.
  void (yaSuena ? Promise.resolve() : el.play()).then(
    () => {
      if (turno !== mio) return;
      // Que suena lo dice `acompasar`, cuando la ve avanzar de verdad.
      nivel(el, 1, ENTRA);
      seguir(mio);
    },
    () => {
      if (turno !== mio) return;
      turno = null;
      avisar("bloqueado");
    },
  );
}

/** Deja de sonar, apagándose poco a poco. */
export function callar(segundos = SALE): void {
  if (!turno) return;
  const { retrato, el, vigia } = turno;
  turno = null;
  window.clearInterval(vigia);
  retrato.playbackRate = 1;
  nivel(el, 0, segundos, () => el.pause());
}

/**
 * El primer plano se queda con la voz TAL COMO VA: si este retrato estaba
 * sonando, devuelve su vídeo, que sigue sin corte. Si no, no devuelve nada.
 */
export function cederVoz(retrato: HTMLVideoElement): HTMLVideoElement | null {
  if (!turno || turno.retrato !== retrato || turno.el.paused || turno.el.readyState < 2) return null;
  const { el, vigia } = turno;
  turno = null;
  window.clearInterval(vigia);
  retrato.playbackRate = 1;
  el.loop = false;
  return el;
}

/**
 * Al cerrar el primer plano con el puntero sobre el retrato: la voz sigue
 * sonando y el retrato vuelve a ir a su par.
 */
export function retomarVoz(retrato: HTMLVideoElement, el: HTMLVideoElement, avisar: (estado: EstadoSonido) => void): void {
  callar();
  const mio: Turno = { retrato, el, avisar, vigia: 0, ultimo: -1, anda: false };
  turno = mio;
  el.loop = true;
  nivel(el, 1, 0.4);
  seguir(mio);
}

/**
 * Tras volver del primer plano el navegador no avisa de que el puntero "sale"
 * de un retrato en el que nunca le vio entrar. Se mira ya, y otra vez en el
 * primer movimiento: si no está encima, se llama a `alSalir`.
 */
export function vigilarSalida(dentro: (nodo: EventTarget | null) => boolean, alSalir: () => void): void {
  // Ya sin la pieza encima, la página sí sabe qué hay bajo el puntero.
  if (puntero.raton && !dentro(document.elementFromPoint(puntero.x, puntero.y))) {
    alSalir();
    return;
  }
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!dentro(e.target)) alSalir();
    },
    { once: true, passive: true },
  );
}
