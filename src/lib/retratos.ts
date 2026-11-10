/**
 * Comportamiento de los retratos sueltos (listado, ficha, "conoce también"):
 * cuándo pasan de tinta a color y cómo responden al puntero. El dibujo es de
 * lib/tinta.ts; aquí solo se decide cuándo pedírselo.
 *
 *   data-tinta="foco"   impreso en tinta; pasa a color mientras ocupa la zona
 *                       central de la pantalla o tiene el puntero encima
 *   data-tinta="color"  retrato de la ficha: a color. En la primera carga de
 *                       la página llega en tinta y se revela una vez.
 *
 * El hero lleva su propia lógica (BlobHero.astro) porque además releva
 * personas.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { obtenerTinta, type Tinta } from "./tinta";

gsap.registerPlugin(ScrollTrigger);

/**
 * Cuánto arrastra la imagen el movimiento del puntero. Contenido a propósito:
 * son retratos de personas, y el agua debe moverse sin deformarles la cara.
 */
const ARRASTRE = 0.34;

/**
 * Engancha la estela al puntero. Solo ratón: en táctil, mover el dedo es
 * hacer scroll, no explorar la imagen.
 */
export function engancharEstela(zona: HTMLElement, tinta: Tinta, signal: AbortSignal): void {
  let previo: [number, number] | null = null;
  zona.addEventListener(
    "pointermove",
    (evento) => {
      if (evento.pointerType !== "mouse") return;
      const caja = tinta.lienzo.getBoundingClientRect();
      if (!caja.width) return;
      const x = (evento.clientX - caja.left) / caja.width;
      const y = (evento.clientY - caja.top) / caja.height;
      if (previo) tinta.remover(x, y, (x - previo[0]) * ARRASTRE, (y - previo[1]) * ARRASTRE);
      previo = [x, y];
    },
    { signal },
  );
  zona.addEventListener("pointerleave", () => (previo = null), { signal });
}

export function montarRetratos(raiz: ParentNode, primeraCarga: boolean): () => void {
  const motor = obtenerTinta();
  if (!motor) return () => {};

  const eventos = new AbortController();
  const { signal } = eventos;
  const tintas: Tinta[] = [];
  const disparadores: ScrollTrigger[] = [];
  const esperas: gsap.core.Tween[] = [];
  const conPuntero = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  for (const contenedor of raiz.querySelectorAll<HTMLElement>("[data-tinta]")) {
    const foto = contenedor.querySelector<HTMLImageElement>(":scope > img");
    if (!foto) continue; // monograma: no hay foto que imprimir

    const modo = contenedor.dataset.tinta;
    const tinta = motor.montar(contenedor, {
      fuentes: [foto],
      // Al llegar a la ficha desde el listado el retrato ya viene a color: no
      // se vuelve a entintar para revelarlo otra vez.
      color: modo === "color" && !primeraCarga ? 1 : 0,
    });
    if (!tinta) continue;
    tintas.push(tinta);

    if (conPuntero) engancharEstela(contenedor, tinta, signal);

    if (modo === "color") {
      if (primeraCarga) esperas.push(gsap.delayedCall(0.45, () => tinta.revelar(true, [0.12, 0.92])));
      continue;
    }

    // ---- foco: color mientras está en la zona central o bajo el puntero ----
    let enZona = false;
    let encima = false;
    let activo = false;
    const actualizar = (origen: [number, number]) => {
      const ahora = enZona || encima;
      if (ahora === activo) return;
      activo = ahora;
      tinta.revelar(ahora, origen);
    };

    disparadores.push(
      ScrollTrigger.create({
        trigger: contenedor,
        // Empieza cuando ya se ve buena parte del retrato: si el color llegara
        // con el retrato apenas asomando, pasaría fuera de la pantalla.
        start: "top 60%",
        end: "bottom 34%",
        onToggle: (self) => {
          enZona = self.isActive;
          // El color entra por el lado por el que llega el retrato y se
          // retira por el lado por el que se va.
          const bajando = self.direction >= 0;
          actualizar([0.5, enZona === bajando ? 1.05 : -0.05]);
        },
      }),
    );

    const enlace = contenedor.closest<HTMLElement>("a");
    if (conPuntero && enlace) {
      enlace.addEventListener(
        "pointerenter",
        (evento) => {
          encima = true;
          const caja = tinta.lienzo.getBoundingClientRect();
          actualizar([
            gsap.utils.clamp(0, 1, (evento.clientX - caja.left) / caja.width),
            gsap.utils.clamp(0, 1, (evento.clientY - caja.top) / caja.height),
          ]);
        },
        { signal },
      );
      enlace.addEventListener(
        "pointerleave",
        () => {
          encima = false;
          actualizar([0.5, 0.5]);
        },
        { signal },
      );
      enlace.addEventListener("focusin", () => ((encima = true), actualizar([0.5, 0.5])), { signal });
      enlace.addEventListener("focusout", () => ((encima = false), actualizar([0.5, 0.5])), { signal });
    }
  }

  return () => {
    eventos.abort();
    esperas.forEach((e) => e.kill());
    disparadores.forEach((d) => d.kill());
    tintas.forEach((t) => t.destruir());
  };
}
