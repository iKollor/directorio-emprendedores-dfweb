/**
 * Gelatina: al pasar el puntero (o enfocar con teclado) sobre un enlace con
 * retrato, la silueta cambia a otra forma con resorte y vuelve a la suya al
 * salir.
 *
 * NO sigue al puntero. La forma nueva es fija y sale de la semilla de cada
 * persona: da igual por dónde entre el cursor, el blob hace siempre lo mismo.
 * Es una respuesta al gesto, no algo que persiga a quien navega (lo que
 * Diseña Futuro pidió quitar).
 *
 * El cambio de forma lo ejecuta el motor de siluetas (lib/blobRuntime.ts) a
 * través del evento `blob:forma`; aquí solo se decide cuándo pedirlo.
 */

import { generarBlob } from "./blob";
import type { DetalleForma } from "./blobRuntime";
import { sinMovimiento } from "./scroll";

export function montarGelatina(enlaces: Iterable<HTMLElement>, signal: AbortSignal): void {
  // Sin puntero fino no hay "pasar por encima": en táctil se queda quieto.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (sinMovimiento()) return;

  for (const enlace of enlaces) {
    const blob = enlace.querySelector<HTMLElement>(".blob[data-blob]");
    if (!blob?.dataset.vertices || !blob.dataset.encaje) continue;

    let reposo: DetalleForma;
    try {
      reposo = {
        vertices: JSON.parse(blob.dataset.vertices),
        encaje: JSON.parse(blob.dataset.encaje),
      };
    } catch {
      continue;
    }

    // Misma cantidad de lados que la silueta en reposo: el motor solo mezcla
    // formas compatibles. Irregularidad dentro del rango seguro de lib/blob.ts.
    const alterna = generarBlob(`${enlace.getAttribute("href") ?? ""}-gelatina`, {
      lados: reposo.vertices.length,
      irregularidad: 0.14,
    });
    const activa: DetalleForma = { vertices: alterna.vertices, encaje: alterna.encaje };

    let dentro = false;
    const pedir = (forma: DetalleForma) =>
      blob.dispatchEvent(new CustomEvent<DetalleForma>("blob:forma", { detail: forma }));

    const entrar = () => {
      if (dentro) return;
      dentro = true;
      pedir(activa);
    };
    const salir = () => {
      if (!dentro) return;
      dentro = false;
      pedir(reposo);
    };

    enlace.addEventListener("pointerenter", entrar, { signal });
    enlace.addEventListener("pointerleave", salir, { signal });
    enlace.addEventListener("focusin", (e) => (e.target as HTMLElement).matches(":focus-visible") && entrar(), { signal });
    enlace.addEventListener("focusout", salir, { signal });
  }
}
