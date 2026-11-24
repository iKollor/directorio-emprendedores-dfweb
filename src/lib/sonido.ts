/**
 * EL SONIDO DE LOS RETRATOS. Los vídeos de los retratos van en silencio y en
 * bucle; al pasar el puntero por encima de uno, suena.
 *
 * El retrato es un recorte cuadrado y mudo. El sonido sale de la versión con
 * sonido del mismo vídeo (`videoSonido` en lib/directorio.ts), que tiene la
 * misma línea de tiempo: se reproduce aparte, solo el audio, y se mantiene a
 * la par del retrato. Si la persona no tiene esa versión, se le quita el
 * silencio a su propio vídeo.
 *
 * LOS NAVEGADORES NO DEJAN SONAR NADA SIN UN GESTO. Pasar el puntero no cuenta
 * como gesto: hasta que la persona pulsa o toca algo de la página, pedir
 * sonido falla. Por eso `sonar` avisa de cómo quedó (`suena` o `bloqueado`) y
 * quien lo llama enseña el altavoz tachado: pulsar el retrato sí es un gesto.
 * En el primer gesto se "despierta" el reproductor de audio, que es lo que
 * pide Safari para dejarlo sonar después sin otro gesto.
 *
 * El volumen y el silencio que la persona elige en el primer plano
 * (lib/primerPlano.ts) valen también aquí, y se recuerdan en su navegador.
 */
import { gsap } from "gsap";

export type EstadoSonido = "calla" | "suena" | "bloqueado";

/** Lo que eligió la persona. Se recuerda entre visitas, si el navegador deja. */
export const ajustes = { volumen: 1, mudo: false };

try {
  const guardado = JSON.parse(localStorage.getItem("df-sonido") ?? "null") as Partial<typeof ajustes> | null;
  if (guardado && typeof guardado.volumen === "number") ajustes.volumen = Math.min(1, Math.max(0, guardado.volumen));
  if (guardado && typeof guardado.mudo === "boolean") ajustes.mudo = guardado.mudo;
} catch {
  // Sin almacenamiento (ventana privada, bloqueado): valen los de partida.
}

export function guardarAjustes(): void {
  try {
    localStorage.setItem("df-sonido", JSON.stringify(ajustes));
  } catch {
    // No pasa nada: se pierde al cerrar.
  }
}

/** Cuánto se pueden separar el audio y la imagen antes de recolocarlo (s). */
const DESFASE = 0.09;
/** Lo que tarda el audio en arrancar tras recolocarlo: se le adelanta eso (s). */
const ARRANQUE = 0.06;
/** Un WAV vacío, para despertar el reproductor en el primer gesto. */
const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let voz: HTMLAudioElement | null = null;
let despierta = false;
let turno: {
  video: HTMLVideoElement;
  propio: boolean;
  avisar: (estado: EstadoSonido) => void;
  vigia: number;
  nivel: { v: number };
} | null = null;

function laVoz(): HTMLAudioElement {
  if (!voz) {
    voz = new Audio();
    voz.preload = "auto";
  }
  return voz;
}

function despertar(): void {
  if (despierta) return;
  despierta = true;
  const a = laVoz();
  if (turno && !turno.propio) return;
  a.src = SILENCIO;
  void a.play().then(
    () => a.pause(),
    () => {},
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", despertar, { capture: true, passive: true });
  window.addEventListener("keydown", despertar, { capture: true, passive: true });
}

/** Quién suena: el propio vídeo o el audio aparte. */
const fuente = () => (turno ? (turno.propio ? turno.video : laVoz()) : null);

function subir(): void {
  if (!turno) return;
  const { nivel } = turno;
  gsap.killTweensOf(nivel);
  gsap.to(nivel, {
    v: 1,
    duration: 0.45,
    ease: "power1.out",
    onUpdate: () => {
      const f = fuente();
      if (f) f.volume = nivel.v * ajustes.volumen;
    },
  });
}

/**
 * Hace sonar un retrato. `src` es su versión con sonido; sin ella, suena el
 * propio vídeo. `avisar` recibe cómo quedó, también si después cambia.
 */
export function sonar(video: HTMLVideoElement, src: string | null, avisar: (estado: EstadoSonido) => void): void {
  callar();
  if (ajustes.mudo) {
    avisar("bloqueado");
    return;
  }
  const mio = { video, propio: !src, avisar, vigia: 0, nivel: { v: 0 } };
  turno = mio;
  const sigue = () => turno === mio;
  const bloqueado = () => {
    if (!sigue()) return;
    callar();
    avisar("bloqueado");
  };

  if (!src) {
    // Su propio vídeo. Sin gesto previo el navegador lo pausa al quitarle el
    // silencio: si pasa, se le devuelve y sigue reproduciéndose en silencio.
    video.volume = 0;
    video.muted = false;
    mio.vigia = window.setTimeout(() => {
      if (!sigue()) return;
      if (video.paused) {
        video.muted = true;
        void video.play().catch(() => {});
        bloqueado();
        return;
      }
      avisar("suena");
      subir();
    }, 140);
    return;
  }

  const a = laVoz();
  const destino = new URL(src, location.href).href;
  if (a.src !== destino) a.src = destino;
  a.loop = false;
  a.muted = false;
  a.volume = 0;
  const alinear = () => {
    if (!Number.isFinite(video.currentTime)) return;
    if (Math.abs(a.currentTime - video.currentTime) > DESFASE) {
      try {
        a.currentTime = video.currentTime + ARRANQUE;
      } catch {
        // Todavía sin metadatos: se alinea en la siguiente vuelta.
      }
    }
  };
  alinear();
  void a.play().then(() => {
    if (!sigue()) return;
    alinear();
    avisar("suena");
    subir();
    // A la par del retrato: si este se pausa o vuelve a empezar, el audio
    // hace lo mismo.
    mio.vigia = window.setInterval(() => {
      if (!sigue()) return;
      if (video.paused) {
        if (!a.paused) a.pause();
        return;
      }
      alinear();
      if (a.paused) void a.play().catch(() => {});
    }, 300);
  }, bloqueado);
}

/** Deja de sonar, bajando el volumen en vez de cortar. */
export function callar(): void {
  if (!turno) return;
  const { video, propio, vigia, nivel } = turno;
  const f = fuente()!;
  turno = null;
  window.clearTimeout(vigia);
  window.clearInterval(vigia);
  gsap.killTweensOf(nivel);
  gsap.to(nivel, {
    v: 0,
    duration: 0.22,
    ease: "power1.in",
    onUpdate: () => {
      // Si mientras tanto empezó a sonar otro retrato, no se le toca.
      if (!turno || fuente() !== f) f.volume = nivel.v * ajustes.volumen;
    },
    onComplete: () => {
      if (turno && fuente() === f) return;
      if (propio) video.muted = true;
      else f.pause();
    },
  });
}
