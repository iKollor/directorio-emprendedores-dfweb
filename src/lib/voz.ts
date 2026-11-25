/**
 * LA VOZ: una sola pista de sonido para todo el sitio.
 *
 * El sonido de un retrato al pasar el puntero (lib/sonido.ts) y el vídeo del
 * primer plano (lib/primerPlano.ts) son LA MISMA reproducción: los dos
 * vídeos que lleva la pieza del primer plano (PrimerPlano.astro), que
 * suenan aunque la pieza esté cerrada. Así, al pulsar un retrato que ya
 * suena, el sonido no se corta ni vuelve a empezar: la gota se abre con la
 * pista tal como iba. Antes eran dos reproducciones y se oía entrar, irse y
 * volver a entrar.
 *
 * Son dos vídeos para poder cambiar de calidad sin corte: el segundo carga
 * la calidad nueva, se coloca un poco por delante y entra justo cuando el
 * primero llega a ese punto.
 *
 * NINGÚN CAMBIO DE VOLUMEN ES UN ESCALÓN. Todo entra y sale con `nivel`, que
 * es un fundido. El volumen real es el cuadrado del nivel: así suena igual
 * de gradual al oído, que no percibe el volumen en línea recta.
 *
 * EL RELEVO ENTRE LOS DOS ES OTRA COSA (`cruzar`): los dos dicen lo mismo a
 * la vez, así que lo que se oye es la SUMA de sus volúmenes, y esa suma no
 * se mueve de 1 en todo el cruce. Fundiendo cada uno por su cuenta, a mitad
 * de camino la suma bajaba a la mitad: se oía un bache.
 */
import { gsap } from "gsap";

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

type Pista = { el: HTMLVideoElement; nivel: number; tapada: boolean };

let pistas: Pista[] = [];
let cual = 0;

/** Se llama una vez por página, con la pieza del primer plano. */
export function buscarVoz(raiz: ParentNode | null): void {
  for (const pista of pistas) gsap.killTweensOf(pista);
  pistas = raiz ? [...raiz.querySelectorAll<HTMLVideoElement>("[data-video]")].map((el) => ({ el, nivel: 0, tapada: false })) : [];
  cual = 0;
}

/** El vídeo que suena (o que sonará). */
export const activa = (): HTMLVideoElement | null => pistas[cual]?.el ?? null;
/** El otro: donde se prepara la calidad nueva. */
export const gemela = (): HTMLVideoElement | null => (pistas.length > 1 ? pistas[1 - cual]!.el : null);
/** La gemela pasa a ser la que suena. */
export function relevar(): void {
  if (pistas.length > 1) cual = 1 - cual;
}

const pistaDe = (el: HTMLVideoElement) => pistas.find((p) => p.el === el) ?? null;

/** Lleva al vídeo el volumen que le toca: su nivel y lo que eligió la persona. */
export function aplicar(el?: HTMLVideoElement): void {
  for (const pista of pistas) {
    if (el && pista.el !== el) continue;
    pista.el.muted = ajustes.mudo || pista.tapada;
    pista.el.volume = Math.min(1, Math.max(0, pista.nivel * pista.nivel * ajustes.volumen));
  }
}

export const nivelDe = (el: HTMLVideoElement) => pistaDe(el)?.nivel ?? 0;

/** Pone el nivel de golpe (solo en silencio: antes de empezar a sonar). */
export function fijarNivel(el: HTMLVideoElement, valor: number): void {
  const pista = pistaDe(el);
  if (!pista) return;
  gsap.killTweensOf(pista);
  pista.nivel = valor;
  aplicar(el);
}

/** Funde el nivel hasta `hasta` en `segundos`. Un fundido nuevo sustituye al anterior. */
export function nivel(
  el: HTMLVideoElement,
  hasta: number,
  segundos: number,
  alTerminar?: () => void,
  curva: string | ((t: number) => number) = "sine.inOut",
): void {
  const pista = pistaDe(el);
  if (!pista) return;
  gsap.killTweensOf(pista);
  gsap.to(pista, {
    nivel: hasta,
    // Lo que falta por recorrer: un fundido a medias no tarda lo que uno entero.
    duration: Math.max(0.05, segundos * Math.abs(hasta - pista.nivel)),
    ease: curva,
    onUpdate: () => aplicar(el),
    onComplete: alTerminar,
  });
}

/**
 * Tapa un vídeo aunque esté andando: es como el segundo se pone a la par del
 * primero, en silencio, antes de relevarlo.
 */
export function tapar(el: HTMLVideoElement, si: boolean): void {
  const pista = pistaDe(el);
  if (!pista) return;
  pista.tapada = si;
  aplicar(el);
}

/**
 * ¿Deja este aparato cambiar el volumen de un vídeo? El iPhone no: ahí manda
 * el botón del teléfono, y un vídeo o suena entero o no suena.
 */
let fijo: boolean | null = null;
export function volumenFijo(): boolean {
  if (fijo === null) {
    const prueba = document.createElement("video");
    prueba.volume = 0.5;
    fijo = prueba.volume !== 0.5;
  }
  return fijo;
}

/**
 * El relevo: `a` entra y `de` sale a la vez, los dos ya andando y a la par.
 * La suma de los dos volúmenes es 1 de principio a fin.
 */
export function cruzar(de: HTMLVideoElement, a: HTMLVideoElement, segundos: number): void {
  fijarNivel(a, 0);
  tapar(a, false);
  // El volumen es el cuadrado del nivel: con la raíz, el volumen va en recta.
  nivel(a, 1, segundos, undefined, (t) => Math.sqrt(t));
  nivel(de, 0, segundos, undefined, (t) => 1 - Math.sqrt(1 - t));
}

/** Deja un vídeo vacío y en silencio. */
export function vaciar(el: HTMLVideoElement): void {
  fijarNivel(el, 0);
  tapar(el, false);
  el.playbackRate = 1;
  el.pause();
  if (el.getAttribute("src")) {
    el.removeAttribute("src");
    el.load();
  }
}
