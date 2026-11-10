/**
 * EL VIAJE: al abrir a una persona, su retrato y su nombre vuelan desde donde
 * se pulsó hasta su sitio en la ficha, y hacen el camino inverso al volver.
 * Esa es toda la transición entre páginas; lo demás se apaga y se enciende.
 *
 * Los nombres de transición se ponen aquí, en el momento y solo a las dos
 * piezas que viajan. Antes los llevaban todas las tarjetas (`transition:name`
 * con el slug), y eso rompía la transición de tres maneras:
 *
 *   - El navegador sacaba una foto aparte de los catorce retratos y nombres,
 *     que se desvanecían por su cuenta encima de la página nueva.
 *   - La foto vieja y la nueva de cada pieza se fundían una sobre otra. Con
 *     dos tamaños de letra, el nombre se veía doble durante todo el vuelo.
 *   - Si la foto de la ficha aún no estaba decodificada, el retrato
 *     desaparecía a mitad de camino.
 *
 * Ahora vuela una sola imagen de cada pieza (la de la página nueva), y la
 * foto de la ficha se decodifica antes de cambiar de página.
 *
 * En el HTML:
 *   data-viaja-a="slug"      en el enlace que lleva a esa persona
 *   data-ficha="slug"        en la ficha de esa persona
 *   data-viaja="retrato"     la pieza que vuela como retrato
 *   data-viaja="nombre"      la pieza que vuela como nombre
 *   data-viaja-ambito        ancestro donde buscar el retrato si no está
 *                            dentro del enlace (el escenario del hero)
 *
 * Las reglas de animación están en tokens.css (`::view-transition-*`).
 */

import type { TransitionBeforePreparationEvent } from "astro:transitions/client";

const PIEZAS = ["retrato", "nombre"] as const;

let nombradas: HTMLElement[] = [];
let slugEnViaje: string | null = null;

function soltar() {
  for (const el of nombradas) el.style.removeProperty("view-transition-name");
  nombradas = [];
}

/** El enlace o la ficha a la que pertenece una pieza. */
const duenoDe = (el: Element) => el.closest("[data-viaja-a], [data-ficha]");

function pieza(origen: Element, tipo: string): HTMLElement | null {
  const selector = `[data-viaja="${tipo}"]`;
  const propia = [...origen.querySelectorAll<HTMLElement>(selector)].find((el) => duenoDe(el) === origen);
  if (propia) return propia;
  return origen.closest("[data-viaja-ambito]")?.querySelector<HTMLElement>(selector) ?? null;
}

function nombrar(origen: Element) {
  for (const tipo of PIEZAS) {
    const el = pieza(origen, tipo);
    if (!el) continue;
    el.style.setProperty("view-transition-name", tipo);
    nombradas.push(el);
  }
}

/** ¿Se ve ahora mismo? Un viaje hacia fuera de la pantalla no se entiende. */
function aLaVista(origen: Element): boolean {
  if (origen.closest("[inert]")) return false;
  const retrato = pieza(origen, "retrato") ?? origen;
  // Lo que aún espera su animación de entrada está escondido (tokens.css).
  if (getComputedStyle(retrato).visibility === "hidden") return false;
  const caja = retrato.getBoundingClientRect();
  return caja.width > 0 && caja.bottom > 0 && caja.top < window.innerHeight;
}

function enlaceA(slug: string): Element | null {
  const candidatos = document.querySelectorAll(`[data-viaja-a="${CSS.escape(slug)}"]`);
  return [...candidatos].find(aLaVista) ?? null;
}

/** El último tramo de la dirección, que en las fichas es el slug. */
function tramoFinal(url: URL): string {
  const tramos = url.pathname.split("/").filter(Boolean);
  return (tramos.at(-1) ?? "").replace(/\.html$/, "");
}

/** Espera a que la foto de la ficha esté decodificada, sin pasarse de 600 ms. */
async function decodificarRetrato(documento: Document, slug: string) {
  const foto = [...documento.querySelectorAll(`[data-ficha="${CSS.escape(slug)}"] [data-viaja="retrato"] img`)].find(
    (img) => !img.closest("[data-viaja-a]"),
  );
  const src = foto?.getAttribute("src");
  if (!foto || !src) return;

  const previa = new Image();
  previa.sizes = foto.getAttribute("sizes") ?? "";
  previa.srcset = foto.getAttribute("srcset") ?? "";
  previa.src = src;
  await Promise.race([previa.decode().catch(() => {}), new Promise((listo) => setTimeout(listo, 600))]);
}

/** Antes de pedir la página nueva: se marca quién sale de viaje. */
export function prepararViaje(evento: TransitionBeforePreparationEvent) {
  soltar();
  slugEnViaje = null;

  const pulsado = evento.sourceElement?.closest("[data-viaja-a]") ?? null;
  // Sin clic (atrás o adelante del navegador) se busca por la dirección.
  const origen = pulsado ?? enlaceA(tramoFinal(evento.to));
  const ficha = document.querySelector<HTMLElement>("[data-ficha]");

  if (origen instanceof HTMLElement) {
    slugEnViaje = origen.dataset.viajaA ?? null;
    nombrar(origen);
  } else if (ficha) {
    // Se sale de una ficha hacia el listado: viaja el retrato de la ficha.
    slugEnViaje = ficha.dataset.ficha ?? null;
    nombrar(ficha);
  }

  if (!slugEnViaje) return;
  const slug = slugEnViaje;
  const cargar = evento.loader;
  evento.loader = async () => {
    await cargar();
    await decodificarRetrato(evento.newDocument, slug);
  };
}

/** Con la página nueva ya puesta: se marca dónde aterriza. */
export function recibirViaje() {
  soltar();
  if (!slugEnViaje) return;
  const destino =
    document.querySelector(`[data-ficha="${CSS.escape(slugEnViaje)}"]`) ?? enlaceA(slugEnViaje);
  if (destino) nombrar(destino);
}
