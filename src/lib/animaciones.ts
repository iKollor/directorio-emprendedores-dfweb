/**
 * Animaciones de texto y entrada, declaradas en el HTML con `data-anim`.
 *
 * Son versiones con GSAP de efectos populares de librerías de React (React
 * Bits y parecidas): este sitio no usa React, y GSAP ya trae SplitText y
 * ScrollTrigger gratis, así que no hace falta sumar dependencias ni peso.
 *
 *   data-anim="letras"     letras que suben desde su línea (SplitText)
 *   data-anim="lineas"     líneas que suben tras una máscara (SplitText)
 *   data-anim="desenfoque" palabras que entran desenfocadas (BlurText)
 *   data-anim="lectura"    palabras que se encienden con el scroll (ScrollReveal)
 *   data-anim="subir"      el bloque, o sus hijos, suben y aparecen
 *   data-anim="pop"        el bloque, o sus hijos, aparecen creciendo apenas
 *   data-anim="revelar"    los hijos se destapan de abajo arriba (clip-path)
 *   data-anim="subrayado"  el subrayado amarillo se dibuja de izquierda a derecha
 *
 * Modificadores:
 *   data-anim-hijos="sel"  anima los hijos que cumplen el selector, en cascada
 *                          (vacío = hijos directos)
 *   data-anim-retraso="s"  segundos de espera; ordena la secuencia del hero
 *
 * Todo entra con ScrollTrigger `once`: lo que ya está en pantalla al cargar
 * arranca enseguida y lo de abajo espera a que llegue. Con movimiento
 * reducido no se toca nada y el texto queda tal cual.
 *
 * Mientras el script no corre, el CSS esconde estos elementos para que no
 * parpadeen (tokens.css). Si el JavaScript fallara, un rescate en CSS los
 * muestra a los 2.5 s: nunca se queda texto invisible.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { SUAVE } from "./movimiento";
import { sinMovimiento } from "./scroll";

gsap.registerPlugin(ScrollTrigger, SplitText);

const ARRANQUE = "top 92%";

type Fabrica = (el: HTMLElement, retraso: number) => void;

function disparador(el: HTMLElement) {
  return { trigger: el, start: ARRANQUE, once: true };
}

function objetivos(el: HTMLElement): HTMLElement[] {
  if (!el.hasAttribute("data-anim-hijos")) return [el];
  const selector = el.dataset.animHijos || ":scope > *";
  return [...el.querySelectorAll<HTMLElement>(selector)];
}

/** Lo que GSAP deja escrito al terminar; nunca `all`, que borraría --acento. */
const LIMPIAR = "opacity,visibility,transform,filter,clipPath";

const FABRICAS: Record<string, Fabrica> = {
  letras(el, retraso) {
    SplitText.create(el, {
      type: "lines,chars",
      mask: "lines",
      linesClass: "anim-linea",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 100,
          duration: 1.1,
          ease: SUAVE,
          stagger: { amount: Math.min(0.6, self.chars.length * 0.025) },
          delay: retraso,
          scrollTrigger: disparador(el),
        }),
    });
  },

  lineas(el, retraso) {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "anim-linea",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 100,
          duration: 1.1,
          ease: SUAVE,
          stagger: 0.1,
          delay: retraso,
          scrollTrigger: disparador(el),
        }),
    });
  },

  desenfoque(el, retraso) {
    SplitText.create(el, {
      type: "words",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.words, {
          opacity: 0,
          y: 8,
          filter: "blur(8px)",
          duration: 1,
          ease: SUAVE,
          stagger: { amount: Math.min(0.8, self.words.length * 0.03) },
          delay: retraso,
          clearProps: "filter",
          scrollTrigger: disparador(el),
        }),
    });
  },

  lectura(el) {
    SplitText.create(el, {
      type: "words",
      autoSplit: true,
      onSplit: (self) =>
        gsap.fromTo(
          self.words,
          { opacity: 0.18 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: "top 88%", end: "top 45%", scrub: true },
          },
        ),
    });
  },

  subir(el, retraso) {
    gsap.from(objetivos(el), {
      autoAlpha: 0,
      y: 18,
      duration: 1,
      ease: SUAVE,
      stagger: 0.08,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  pop(el, retraso) {
    gsap.from(objetivos(el), {
      autoAlpha: 0,
      scale: 0.96,
      y: 10,
      duration: 0.9,
      ease: SUAVE,
      stagger: 0.05,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  revelar(el, retraso) {
    gsap.from(objetivos(el), {
      clipPath: "inset(100% 0% 0% 0%)",
      y: 24,
      duration: 1.2,
      ease: SUAVE,
      stagger: 0.12,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  subrayado(el, retraso) {
    gsap.fromTo(
      el,
      { "--subrayado": "0%" },
      {
        "--subrayado": "100%",
        duration: 0.8,
        ease: "power2.inOut",
        delay: retraso,
        scrollTrigger: disparador(el),
      },
    );
  },
};

/** Monta todas las animaciones de la página; devuelve cómo deshacerlas. */
export function animarTextos(raiz: ParentNode = document): () => void {
  const elementos = [...raiz.querySelectorAll<HTMLElement>("[data-anim]")];

  if (sinMovimiento()) {
    elementos.forEach((el) => el.classList.add("anim-listo"));
    return () => {};
  }

  const contexto = gsap.context(() => {
    for (const el of elementos) {
      const fabrica = FABRICAS[el.dataset.anim ?? ""];
      // Los estados iniciales se escriben en la misma vuelta, antes de que el
      // CSS deje de esconder el elemento: así no hay fotograma intermedio.
      fabrica?.(el, Number(el.dataset.animRetraso ?? 0));
      el.classList.add("anim-listo");
    }
  });

  return () => {
    contexto.revert();
    // Al revertir, SplitText devuelve el texto original y GSAP limpia estilos.
    elementos.forEach((el) => el.classList.remove("anim-listo"));
  };
}
