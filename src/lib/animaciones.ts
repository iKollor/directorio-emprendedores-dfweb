/**
 * Animaciones de texto y entrada, declaradas en el HTML con `data-anim`.
 *
 * UNA SOLA FAMILIA DE MOVIMIENTO. Todo lo que entra lo hace igual: sube un
 * poco y se asienta con la misma curva (`CURVA`), sin rebotes, giros ni
 * desenfoques. Antes cada efecto traía su propia curva y su propio truco
 * (rebote, giro de letras, palabras borrosas) y la página parecía un
 * muestrario. Los titulares suben tras una máscara; los bloques, sin ella.
 * Los nombres se conservan para no tocar el HTML.
 *
 *   data-anim="letras"     letras que suben desde su línea (solo titulares)
 *   data-anim="lineas"     líneas que suben tras una máscara
 *   data-anim="desenfoque" texto corrido: sus párrafos suben, sin desenfoque
 *   data-anim="lectura"    palabras que se aclaran al avanzar el scroll
 *   data-anim="subir"      el bloque, o sus hijos, suben y aparecen
 *   data-anim="pop"        igual que subir, para botones y píldoras
 *   data-anim="revelar"    los hijos se destapan de abajo arriba (clip-path)
 *   data-anim="subrayado"  el subrayado amarillo se dibuja de izquierda a derecha
 *   data-anim="forma"      formas de fondo (Forma.astro): el blob y la estrella
 *                          crecen desde su centro; el arco se dibuja
 *
 * Modificadores:
 *   data-anim-hijos="sel"  anima los hijos que cumplen el selector, en cascada
 *                          (vacío = hijos directos)
 *   data-anim-retraso="s"  segundos de espera; ordena la secuencia del hero
 *
 * Lo que ya está en pantalla al montarse entra en el acto, sin ScrollTrigger;
 * lo de abajo espera con un ScrollTrigger `once` a que llegue. Antes también
 * lo visible dependía del ScrollTrigger, y si se calculaba con la página a
 * medio cambiar (al volver de una ficha) el titular no llegaba a entrar
 * nunca. Con movimiento reducido no se toca nada y el texto queda tal cual.
 *
 * Lo que recibe una pieza que vuela entre páginas (lib/viaje.ts) no hace su
 * entrada: el retrato aterrizaría en un contenedor que aún se está
 * encendiendo. Viaje lo marca `anim-listo` y aquí se salta.
 *
 * Mientras el script no corre, el CSS esconde estos elementos para que no
 * parpadeen (tokens.css). Si el JavaScript fallara, un rescate en CSS los
 * muestra a los 2.5 s: nunca se queda texto invisible.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { sinMovimiento } from "./scroll";

gsap.registerPlugin(ScrollTrigger, SplitText);

const ARRANQUE = "top 92%";
/** La curva de todo el sitio: sale rápido y se asienta despacio. */
const CURVA = "expo.out";

type Fabrica = (el: HTMLElement, retraso: number) => void;

/** ¿Asoma ya por la pantalla? El mismo umbral que ARRANQUE (92 %). */
export function aLaVista(el: Element): boolean {
  const caja = el.getBoundingClientRect();
  return caja.bottom > 0 && caja.top < window.innerHeight * 0.92;
}

/** Sin ScrollTrigger si ya está a la vista: entra en el acto. */
function disparador(el: HTMLElement) {
  return aLaVista(el) ? undefined : { trigger: el, start: ARRANQUE, once: true };
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
          yPercent: 110,
          duration: 1.1,
          ease: CURVA,
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
          yPercent: 105,
          duration: 1.1,
          ease: CURVA,
          stagger: 0.09,
          delay: retraso,
          scrollTrigger: disparador(el),
        }),
    });
  },

  desenfoque(el, retraso) {
    // Sin partir el texto: los párrafos suben enteros. Partirlo en líneas
    // rompía el interlineado cuando el bloque trae varios párrafos.
    const parrafos = el.children.length > 0 ? ([...el.children] as HTMLElement[]) : [el];
    gsap.from(parrafos, {
      autoAlpha: 0,
      y: 18,
      duration: 1,
      ease: CURVA,
      stagger: 0.08,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  lectura(el) {
    SplitText.create(el, {
      type: "words",
      autoSplit: true,
      onSplit: (self) =>
        gsap.fromTo(
          self.words,
          // Nunca por debajo de lo legible: es un énfasis, no un texto oculto.
          { opacity: 0.45 },
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
      y: 22,
      duration: 1,
      ease: CURVA,
      stagger: 0.08,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  pop(el, retraso) {
    gsap.from(objetivos(el), {
      autoAlpha: 0,
      y: 14,
      duration: 0.9,
      ease: CURVA,
      stagger: 0.045,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  revelar(el, retraso) {
    gsap.from(objetivos(el), {
      clipPath: "inset(100% 0% 0% 0%)",
      y: 40,
      duration: 1.1,
      ease: CURVA,
      stagger: 0.12,
      delay: retraso,
      clearProps: LIMPIAR,
      scrollTrigger: disparador(el),
    });
  },

  forma(el, retraso) {
    const trazo = el.querySelector<SVGPathElement>("[data-trazo]");
    if (trazo) {
      // El trazo mide 100 (pathLength) y un hueco de 200 lo esconde entero.
      // Se aparta con holgura: justo al límite asomaba la punta redonda como
      // un punto suelto. Y en centenas, no en unidades: GSAP redondea este
      // valor y con un trazo de longitud 1 lo dejaba clavado en el límite.
      const oculto = el.dataset.animDesde === "fin" ? -115 : 115;
      gsap.fromTo(
        trazo,
        { strokeDasharray: "100 200", strokeDashoffset: oculto },
        {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: CURVA,
          delay: retraso,
          clearProps: "strokeDasharray,strokeDashoffset",
          scrollTrigger: disparador(el),
        },
      );
      return;
    }
    gsap.from(el, {
      autoAlpha: 0,
      scale: 0.55,
      duration: 1.5,
      ease: CURVA,
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
        duration: 0.9,
        ease: CURVA,
        delay: retraso,
        scrollTrigger: disparador(el),
      },
    );
  },
};

/** Monta todas las animaciones de la página; devuelve cómo deshacerlas. */
export function animarTextos(raiz: ParentNode = document): () => void {
  // Los ya listos son los que recibe un viaje: no se animan.
  const elementos = [...raiz.querySelectorAll<HTMLElement>("[data-anim]")].filter(
    (el) => !el.classList.contains("anim-listo"),
  );

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
