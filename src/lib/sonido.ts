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
 * quien lo llama enseña el altavoz tachado: pulsar el retrato sí es un gesto.
 * En el primer gesto se "despiertan" los vídeos de la voz, que es lo que pide
 * Safari para dejarlos sonar después sin otro gesto.
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
  const dx = (puntero.x - (r.left + r.width / 2)) / (r.width * 0.45);
  const dy = (puntero.y - (r.top + r.height / 2)) / (r.height * 0.45);
  return dx * dx + dy * dy < 1;
}

/** El retrato, mudo, sigue a la voz: acelera o frena un poco, sin que se note. */
function acompasar({ retrato, el }: Turno): void {
  // Si el retrato se para (pestaña oculta, fuera de pantalla), la voz espera.
  if (retrato.paused || retrato.ended) {
    if (!el.paused) el.pause();
    return;
  }
  if (el.paused) {
    void el.play().catch(() => {});
    return;
  }
  const dura = el.duration;
  if (!Number.isFinite(dura) || dura <= 0) return;
  let d = retrato.currentTime - el.currentTime;
  // Los dos van en bucle: al dar la vuelta uno antes que otro, no es un desfase.
  if (d > dura / 2) d -= dura;
  if (d < -dura / 2) d += dura;
  if (Math.abs(d) > 0.6) {
    retrato.playbackRate = 1;
    retrato.currentTime = Math.min(el.currentTime + 0.04, Math.max(0, retrato.duration - 0.05));
  } else {
    retrato.playbackRate = Math.min(1.12, Math.max(0.88, 1 - d * 0.6));
  }
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
export function preparar(src: string | null): void {
  const el = activa();
  if (!el || !src || turno || ajustes.mudo || !el.paused) return;
  const destino = new URL(src, location.href).href;
  if (el.src === destino) return;
  fijarNivel(el, 0);
  el.preload = "auto";
  el.src = destino;
}

/**
 * Hace sonar un retrato. `src` es su versión con sonido; sin ella, suena el
 * propio archivo. `avisar` recibe cómo quedó.
 */
export function sonar(retrato: HTMLVideoElement, src: string | null, avisar: (estado: EstadoSonido) => void): void {
  if (turno?.retrato === retrato) return;
  callar();
  const el = activa();
  if (!el || ajustes.mudo) {
    avisar("bloqueado");
    return;
  }
  const destino = new URL(src ?? (retrato.currentSrc || retrato.src), location.href).href;
  const mio: Turno = { retrato, el, avisar, vigia: 0 };
  turno = mio;

  // Si es la misma pista y aún se estaba apagando, sube otra vez desde donde iba.
  const yaSuena = el.src === destino && !el.paused && !el.ended;
  el.loop = true;
  if (!yaSuena) {
    fijarNivel(el, 0);
    if (el.src !== destino) el.src = destino;
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
      avisar("suena");
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
  const mio: Turno = { retrato, el, avisar, vigia: 0 };
  turno = mio;
  el.loop = true;
  avisar("suena");
  nivel(el, 1, 0.4);
  seguir(mio);
}

/**
 * Tras volver del primer plano el navegador no avisa de que el puntero "sale"
 * de un retrato en el que nunca le vio entrar. Se mira el primer movimiento:
 * si ya no está encima, se llama a `alSalir`.
 */
export function vigilarSalida(dentro: (nodo: EventTarget | null) => boolean, alSalir: () => void): void {
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!dentro(e.target)) alSalir();
    },
    { once: true, passive: true },
  );
}
