/**
 * Comportamiento de los retratos sueltos (listado, ficha, "conoce también"):
 * cuándo enfoca cada gota. El dibujo es de lib/tinta.ts; aquí solo se decide
 * cuándo pedírselo.
 *
 *   data-tinta="foco"   fuera de foco (vidrio esmerilado en tinta azul) hasta
 *                       que ocupa la zona central de la pantalla o recibe el
 *                       puntero o el foco del teclado
 *   data-tinta="color"  retrato de la ficha: enfocado. En la primera carga de
 *                       la página llega fuera de foco y enfoca una vez.
 *
 * NADA SIGUE AL PUNTERO NI SE DEFORMA CON ÉL. Pasar por encima de un retrato
 * solo lo enfoca, igual que llegar a él con el scroll o con el teclado.
 *
 * El hero lleva su propia lógica (BlobHero.astro) porque además releva
 * personas.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { obtenerTinta, type Tinta } from "./tinta";

gsap.registerPlugin(ScrollTrigger);

/**
 * El monograma de quien no tiene foto, dibujado en un lienzo para que pase
 * por el mismo vidrio que las fotos: si no, doce gotas de catorce serían
 * planas y dos tendrían volumen. Copia lo que ya pinta el CSS (colores,
 * pesos y tamaño), así que el HTML sigue siendo la fuente.
 */
function dibujarMonograma(monograma: HTMLElement): HTMLCanvasElement | null {
  const LADO = 1024;
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = LADO;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;

  const estilo = getComputedStyle(monograma);
  ctx.fillStyle = estilo.backgroundColor;
  ctx.fillRect(0, 0, LADO, LADO);

  const letras = [...monograma.children].map((hijo) => ({
    texto: hijo.textContent ?? "",
    peso: getComputedStyle(hijo).fontWeight,
  }));
  // 38cqw en el CSS: el 38 % del lado. Interletrado de -0.07em.
  const cuerpo = LADO * 0.38;
  const aprieto = cuerpo * -0.07;
  const fuente = (peso: string) => `${peso} ${cuerpo}px ${estilo.fontFamily}`;

  let ancho = 0;
  const anchos = letras.map((l) => {
    ctx.font = fuente(l.peso);
    const a = ctx.measureText(l.texto).width;
    ancho += a;
    return a;
  });
  ancho += aprieto * (letras.length - 1);

  ctx.fillStyle = estilo.color;
  ctx.textBaseline = "alphabetic";
  let x = (LADO - ancho) / 2;
  letras.forEach((l, i) => {
    ctx.font = fuente(l.peso);
    // Centrado óptico: las mayúsculas ocupan unos 0.7 del cuerpo.
    ctx.fillText(l.texto, x, LADO / 2 + cuerpo * 0.35);
    x += anchos[i]! + aprieto;
  });
  return lienzo;
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
  let vivo = true;

  function montar(contenedor: HTMLElement, fuente: HTMLImageElement | HTMLCanvasElement) {
    const modo = contenedor.dataset.tinta;
    const tinta = motor!.montar(contenedor, {
      fuentes: [fuente],
      // Al llegar a la ficha desde el listado el retrato ya viene enfocado:
      // no se desenfoca para volver a enfocarlo.
      foco: modo === "color" && !primeraCarga ? 1 : 0,
    });
    if (!tinta) return;
    tintas.push(tinta);

    if (modo === "color") {
      if (primeraCarga) esperas.push(gsap.delayedCall(0.5, () => tinta.enfocar(true, 1.8)));
      return;
    }

    // ---- foco: enfoca mientras está en la zona central o recibe atención ----
    let enZona = false;
    let encima = false;
    let activo = false;
    const actualizar = () => {
      const ahora = enZona || encima;
      if (ahora === activo) return;
      activo = ahora;
      tinta.enfocar(ahora);
    };

    disparadores.push(
      ScrollTrigger.create({
        trigger: contenedor,
        // Enfoca cuando ya se ve buena parte del retrato, no al asomar.
        start: "top 62%",
        end: "bottom 32%",
        onToggle: (self) => {
          enZona = self.isActive;
          actualizar();
        },
      }),
    );

    const enlace = contenedor.closest<HTMLElement>("a");
    if (!enlace) return;
    const entrar = () => ((encima = true), actualizar());
    const salir = () => ((encima = false), actualizar());
    if (conPuntero) {
      enlace.addEventListener("pointerenter", entrar, { signal });
      enlace.addEventListener("pointerleave", salir, { signal });
    }
    enlace.addEventListener("focusin", entrar, { signal });
    enlace.addEventListener("focusout", salir, { signal });
  }

  const monogramas: { contenedor: HTMLElement; monograma: HTMLElement }[] = [];
  for (const contenedor of raiz.querySelectorAll<HTMLElement>("[data-tinta]")) {
    const foto = contenedor.querySelector<HTMLImageElement>(":scope > img");
    if (foto) {
      montar(contenedor, foto);
      continue;
    }
    const monograma = contenedor.querySelector<HTMLElement>(":scope > .monograma");
    if (monograma) monogramas.push({ contenedor, monograma });
  }

  // Los monogramas esperan a la tipografía: dibujados antes, saldrían con la
  // letra de reserva del sistema.
  if (monogramas.length > 0) {
    void document.fonts.ready.then(() => {
      if (!vivo) return;
      for (const { contenedor, monograma } of monogramas) {
        const dibujo = dibujarMonograma(monograma);
        if (dibujo) montar(contenedor, dibujo);
      }
      ScrollTrigger.refresh();
    });
  }

  return () => {
    vivo = false;
    eventos.abort();
    esperas.forEach((e) => e.kill());
    disparadores.forEach((d) => d.kill());
    tintas.forEach((t) => t.destruir());
  };
}
