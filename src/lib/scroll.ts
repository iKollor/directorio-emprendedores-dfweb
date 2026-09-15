/**
 * Dueño único de la instancia de Lenis.
 *
 * Varios componentes necesitan el mismo objeto: el layout para arrancarlo y
 * pararlo entre transiciones, el listado para engancharle el snap por filas, y
 * los enlaces ancla para navegar a través de él. Como los scripts de Astro se
 * empaquetan juntos, este módulo es un singleton real y evita tener que colgar
 * nada de `window`.
 *
 * `iniciar()` es idempotente a propósito: el orden en que corren los scripts de
 * los componentes no está garantizado, así que cualquiera puede pedirlo primero.
 */

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let lenis: Lenis | null = null;
let quitarTicker: (() => void) | null = null;

export const sinMovimiento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function iniciarScroll(): Lenis | null {
  if (sinMovimiento()) return null;
  if (lenis) return lenis;

  lenis = new Lenis({
    duration: 1.1,
    // Curva casi lineal al final: evita la sensación de "flotar" que hace que
    // un smooth scroll se perciba lento en vez de suave.
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  return lenis;
}

/**
 * Engancha Lenis al reloj de GSAP. Un solo ticker para todo: si Lenis corriera
 * su propio requestAnimationFrame competiría con GSAP y se perderían frames.
 */
export async function conectarReloj(): Promise<void> {
  if (!lenis || quitarTicker) return;

  gsap.registerPlugin(ScrollTrigger);

  const actualizar = () => ScrollTrigger.update();
  const avanzar = (tiempo: number) => lenis?.raf(tiempo * 1000);

  lenis.on("scroll", actualizar);
  gsap.ticker.add(avanzar);
  gsap.ticker.lagSmoothing(0);

  quitarTicker = () => {
    lenis?.off("scroll", actualizar);
    gsap.ticker.remove(avanzar);
  };
}

export function obtenerScroll(): Lenis | null {
  return lenis;
}

export function detenerScroll(): void {
  quitarTicker?.();
  quitarTicker = null;
  lenis?.destroy();
  lenis = null;
}
