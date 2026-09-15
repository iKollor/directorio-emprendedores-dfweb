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

import { construirPath, type Deformacion, type Encaje, type Vertice } from "./blob";

type BlobVivo = {
  elemento: HTMLElement;
  /** El respaldo de color no persigue al puntero; solo lo hace el retrato. */
  reactivo: boolean;
  vertices: Vertice[];
  encaje: Encaje;
  paths: SVGPathElement[];
  /** Desfase temporal para que dos vecinos nunca respiren a la vez. */
  desfase: number;
  visible: boolean;
  /** Empuje actual y objetivo del cursor; se interpolan para que no salte. */
  actual: Deformacion;
  objetivo: Deformacion;
};

/** Cuánto se abulta la silueta hacia el puntero, en unidades del viewBox 0-100. */
const FUERZA_CURSOR = 9;
const ALCANCE_CURSOR = 42;
/** Suavizado del seguimiento: bajo = líquido y perezoso, alto = pegado al ratón. */
const SUAVIZADO = 0.12;

export type ControlBlobs = { destruir: () => void };

export function animarBlobs(raiz: ParentNode = document): ControlBlobs {
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Sin puntero fino (móvil, tablet) la reactividad al ratón no aplica.
  const punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)");

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

    const cero = (): Deformacion => ({ x: 50, y: 50, fuerza: 0, alcance: ALCANCE_CURSOR });

    vivos.push({
      elemento,
      vertices,
      encaje,
      paths,
      reactivo: !elemento.hasAttribute("data-sin-cursor"),
      desfase: Number(elemento.dataset.desfase ?? 0),
      visible: false,
      actual: cero(),
      objetivo: cero(),
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

  // --- Cursor -----------------------------------------------------------
  const alMover = (evento: PointerEvent) => {
    for (const vivo of vivos) {
      if (!vivo.visible || !vivo.reactivo) continue;

      const r = vivo.elemento.getBoundingClientRect();
      if (r.width === 0) continue;

      const dentro =
        evento.clientX >= r.left &&
        evento.clientX <= r.right &&
        evento.clientY >= r.top &&
        evento.clientY <= r.bottom;

      if (dentro) {
        // A coordenadas locales del viewBox (0-100).
        vivo.objetivo.x = ((evento.clientX - r.left) / r.width) * 100;
        vivo.objetivo.y = ((evento.clientY - r.top) / r.height) * 100;
        vivo.objetivo.fuerza = FUERZA_CURSOR;
      } else {
        vivo.objetivo.fuerza = 0;
      }
    }
  };

  const escuchaCursor = punteroFino.matches && !sinMovimiento.matches;
  if (escuchaCursor) {
    window.addEventListener("pointermove", alMover, { passive: true });
  }

  // --- Bucle ------------------------------------------------------------
  const pintar = (tiempo: number) => {
    for (const vivo of vivos) {
      if (!vivo.visible) continue;

      // El empuje persigue a su objetivo en vez de saltar: el borde se
      // deforma con inercia, que es lo que lo hace sentir líquido.
      const a = vivo.actual;
      const o = vivo.objetivo;
      a.x += (o.x - a.x) * SUAVIZADO;
      a.y += (o.y - a.y) * SUAVIZADO;
      a.fuerza += (o.fuerza - a.fuerza) * SUAVIZADO;

      const d = construirPath(
        vivo.vertices,
        tiempo + vivo.desfase,
        a.fuerza > 0.05 ? a : null,
        vivo.encaje,
      );

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
      if (escuchaCursor) window.removeEventListener("pointermove", alMover);
    },
  };
}
