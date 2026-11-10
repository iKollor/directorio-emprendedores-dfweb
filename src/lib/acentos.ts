/**
 * Qué tarjetas del listado llevan una forma de Diseña Futuro detrás del
 * retrato, y cuál (la dibuja TarjetaEmprendedor.astro con Forma.astro).
 *
 * Dos de cada cuatro, alternando blob y trazo y siempre hacia su borde de la
 * página: la columna izquierda hacia la izquierda y la derecha hacia la
 * derecha. Con una por tarjeta la página se llenaba de formas. La primera va
 * sin nada porque ya tiene encima las de la cabecera del listado.
 *
 * Los blobs son de color claro, así que asoman solo por arriba y por el
 * lado: abajo está el texto de la tarjeta. El trazo va en azul hondo.
 */

export type Acento = { tipo: "blob" | "arco"; color: string; lado: "izq" | "der" };

const COLORES = ["var(--df-pink)", "var(--df-yellow)", "var(--df-cyan)"];

export function acentoDe(indice: number): Acento | null {
  const turno = indice % 4;
  if (turno !== 1 && turno !== 2) return null;

  const lado = indice % 2 === 0 ? "izq" : "der";
  const esTrazo = indice % 8 === 1 || indice % 8 === 6;
  if (esTrazo) return { tipo: "arco", color: "var(--df-blue-deep)", lado };

  // Los blobs rotan de color según cuántos van antes en la lista.
  const anteriores = Math.floor(indice / 8) * 2 + (indice % 8 > 2 ? 1 : 0);
  return { tipo: "blob", color: COLORES[anteriores % COLORES.length]!, lado };
}
