/**
 * Bucle de animación de los blobs, en el navegador.
 *
 * Decisiones que importan para el rendimiento:
 *
 * - UN SOLO requestAnimationFrame para todos los blobs. Un rAF por blob
 *   multiplicaría el coste y desincronizaría los relojes entre sí.
 *   No se usa el ticker de GSAP a propósito: GSAP duerme el suyo cuando no hay
 *   tweens activos, y este bucle tiene que correr aunque no haya ninguno.
 *
 * - SOLO LOS VISIBLES. Un IntersectionObserver marca cuáles están en pantalla;
 *   el resto ni se evalúa. Con la grilla de 1-2 columnas eso son 1 o 2 blobs
 *   animándose a la vez, aunque haya catorce en la página.
 *
 * - DOS ESCRITURAS POR BLOB Y FRAME: el `d` del recorte y el del aro. Nada de
 *   layout, nada de estilos: solo el atributo de dos <path>.
 */

import { construirPath, type Encaje, type Vertice } from "./blob";

/*
 * Los blobs ya NO reaccionan al puntero. El abultamiento hacia el cursor se
 * leía como una mancha que perseguía a quien navegaba, y se retiró a pedido
 * de Diseña Futuro. Solo queda la respiración lenta de la silueta.
 */
type BlobVivo = {
  elemento: HTMLElement;
  vertices: Vertice[];
  encaje: Encaje;
  paths: SVGPathElement[];
  /** Desfase temporal para que dos vecinos nunca respiren a la vez. */
  desfase: number;
  visible: boolean;
};

export type ControlBlobs = { destruir: () => void };

export function animarBlobs(raiz: ParentNode = document): ControlBlobs {
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

  const nodos = [...raiz.querySelectorAll<HTMLElement>("[data-blob]")];
  const vivos: BlobVivo[] = [];

  for (const elemento of nodos) {
    const crudo = elemento.dataset.vertices;
    if (!crudo) continue;

    let vertices: Vertice[];
    let encaje: Encaje;
    try {
      vertices = JSON.parse(crudo);
      encaje = JSON.parse(elemento.dataset.encaje ?? "null");
    } catch {
      continue;
    }
    if (!encaje) continue;

    const paths = [
      ...elemento.querySelectorAll<SVGPathElement>("[data-path]"),
    ];
    if (paths.length === 0) continue;

    vivos.push({
      elemento,
      vertices,
      encaje,
      paths,
      desfase: Number(elemento.dataset.desfase ?? 0),
      visible: false,
    });
  }

  if (vivos.length === 0) return { destruir: () => {} };

  // --- Visibilidad ------------------------------------------------------
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        const vivo = vivos.find((v) => v.elemento === entrada.target);
        if (vivo) vivo.visible = entrada.isIntersecting;
      }
    },
    // Margen generoso: que empiece a moverse antes de asomar, para no
    // sorprender al usuario con un blob que arranca a mitad de pantalla.
    { rootMargin: "20% 0px" },
  );
  for (const v of vivos) observador.observe(v.elemento);

  // --- Bucle ------------------------------------------------------------
  const pintar = (tiempo: number) => {
    for (const vivo of vivos) {
      if (!vivo.visible) continue;

      const d = construirPath(vivo.vertices, tiempo + vivo.desfase, null, vivo.encaje);

      for (const p of vivo.paths) p.setAttribute("d", d);
    }
  };

  let cuadro = 0;
  let activo = !sinMovimiento.matches;

  const bucle = (ms: number) => {
    if (!activo) return;
    // El reloj va en segundos porque es lo que esperan los osciladores.
    pintar(ms / 1000);
    cuadro = requestAnimationFrame(bucle);
  };

  if (activo) cuadro = requestAnimationFrame(bucle);

  return {
    destruir() {
      activo = false;
      cancelAnimationFrame(cuadro);
      observador.disconnect();
    },
  };
}
