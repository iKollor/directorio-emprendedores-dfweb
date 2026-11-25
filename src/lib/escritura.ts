/**
 * EL LOGO DE LA ESCUELA, ESCRIBIÉNDOSE. El logo está pintado a mano; en la
 * portada se ve pintar. Encima del logo de verdad va un SVG con la misma
 * imagen tapada por una máscara: los trazos de la máscara son la línea
 * central de cada pincelada (scripts/logo/trazar.py), y al dibujarlos uno
 * tras otro, en el orden en que se escribiría, el logo se va destapando
 * letra a letra. Al terminar, el SVG se va y queda el logo normal (el mismo
 * que luego se encoge hasta la barra, lib/barra.ts).
 *
 * Solo con el logo de partida: los trazos están sacados de él. Si en el panel
 * se sube otro, no se escribe (entra como los demás).
 *
 * Si la persona baja mientras se escribe, termina en el acto: el logo se
 * encoge hacia la barra y no puede ir con la máscara a medias.
 */
import { gsap } from "gsap";
import trazo from "../data/trazo-escuela.json";

const NS = "http://www.w3.org/2000/svg";
/** Lo que tarda en escribirse entero (s). */
const DURACION = 1.6;

let cuenta = 0;

/** ¿Es el logo de partida, el de los trazos? */
export function sePuedeEscribir(img: HTMLImageElement): boolean {
  const src = img.currentSrc || img.src;
  if (!img.naturalWidth || !img.naturalHeight) return false;
  const proporcion = img.naturalWidth / img.naturalHeight;
  return /escuela-emprendimiento/.test(decodeURIComponent(src)) && Math.abs(proporcion - trazo.ancho / trazo.alto) < 0.02;
}

/** Escribe el logo. Devuelve su línea de tiempo, o null si no se puede. */
export function escribirLogo(img: HTMLImageElement, retraso = 0): gsap.core.Timeline | null {
  const caja = img.parentElement;
  if (!caja || !sePuedeEscribir(img)) return null;

  const id = `escritura-${++cuenta}`;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${trazo.ancho} ${trazo.alto}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("escritura");
  Object.assign(svg.style, {
    position: "absolute",
    left: `${img.offsetLeft}px`,
    top: `${img.offsetTop}px`,
    width: `${img.offsetWidth}px`,
    height: `${img.offsetHeight}px`,
    zIndex: "5",
    pointerEvents: "none",
    overflow: "visible",
  });

  const defs = document.createElementNS(NS, "defs");
  const mascara = document.createElementNS(NS, "mask");
  mascara.id = id;
  mascara.setAttribute("maskUnits", "userSpaceOnUse");
  for (const [k, v] of Object.entries({ x: "0", y: "0", width: String(trazo.ancho), height: String(trazo.alto) })) {
    mascara.setAttribute(k, v);
  }
  const caminos = trazo.trazos.map((t) => {
    const camino = document.createElementNS(NS, "path");
    camino.setAttribute("d", t.d);
    camino.setAttribute("fill", "none");
    camino.setAttribute("stroke", "#fff");
    camino.setAttribute("stroke-width", String(t.ancho));
    camino.setAttribute("stroke-linecap", "round");
    camino.setAttribute("stroke-linejoin", "round");
    mascara.appendChild(camino);
    return camino;
  });
  defs.appendChild(mascara);
  const imagen = document.createElementNS(NS, "image");
  imagen.setAttribute("href", img.currentSrc || img.src);
  imagen.setAttribute("width", String(trazo.ancho));
  imagen.setAttribute("height", String(trazo.alto));
  imagen.setAttribute("preserveAspectRatio", "none");
  imagen.setAttribute("mask", `url(#${id})`);
  svg.append(defs, imagen);
  caja.appendChild(svg);

  // El logo de verdad, transparente (no escondido: los lectores de pantalla lo siguen leyendo).
  img.style.opacity = "0";

  const largos = caminos.map((c) => c.getTotalLength());
  const total = largos.reduce((a, b) => a + b, 0) || 1;
  // Cada trazo dura según su largo (los cortos, deprisa, pero no de golpe), y
  // la mano ya va hacia el siguiente antes de acabar (un poco de solape).
  // Luego todo se escala para que el logo entero tarde DURACION.
  const plan: { inicio: number; dura: number }[] = [];
  let cursor = 0;
  let fin = 0;
  for (const largo of largos) {
    const dura = Math.max(0.045, largo / total);
    plan.push({ inicio: cursor, dura });
    fin = Math.max(fin, cursor + dura);
    cursor += dura * 0.88;
  }
  const escala = DURACION / (fin || 1);
  const linea = gsap.timeline({ delay: retraso });
  caminos.forEach((camino, i) => {
    const largo = largos[i]!;
    camino.style.strokeDasharray = `${largo} ${largo}`;
    camino.style.strokeDashoffset = String(largo);
    // Cada trazo arranca y frena, como una mano.
    linea.to(camino, { strokeDashoffset: 0, duration: plan[i]!.dura * escala, ease: "sine.inOut" }, plan[i]!.inicio * escala);
  });

  const terminar = () => {
    window.removeEventListener("scroll", siBaja);
    img.style.opacity = "";
    svg.remove();
  };
  const siBaja = () => {
    if (window.scrollY > 4) linea.progress(1);
  };
  window.addEventListener("scroll", siBaja, { passive: true });
  linea.eventCallback("onComplete", terminar);
  // Si la línea se mata o se deshace (cambio de página), no queda el logo invisible.
  linea.eventCallback("onInterrupt", terminar);
  return linea;
}

/**
 * ANTES DE EMPEZAR, QUE ESTÉ TODO. La entrada de la portada espera a las
 * fuentes y a las imágenes de arriba (logos y el primer retrato) para que
 * todo entre en su orden y nada aparezca de golpe al llegar tarde. Con un
 * tope: si algo tarda, se empieza igual.
 */
export async function esperarPortada(tope = 1200): Promise<void> {
  if (!document.querySelector(".hero")) return;
  const imagenes = [
    ...document.querySelectorAll<HTMLImageElement>(".cabecera .marcas img, .hero .con-logo img, .hero [data-escena][data-activa] img"),
  ];
  const listas = Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    ...imagenes.map((img) => (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {}))),
  ]);
  await Promise.race([listas, new Promise((r) => setTimeout(r, tope))]);
}
