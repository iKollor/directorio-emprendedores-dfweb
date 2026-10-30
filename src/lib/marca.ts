/**
 * Logo de Intervalores: se busca una sola vez por build en public/brand/.
 *
 * Vive en un módulo y no en Marca.astro porque el frontmatter de un componente
 * corre en cada página, y el aviso salía repetido tantas veces como rutas.
 */
import { existsSync } from "node:fs";

const FORMATOS = ["svg", "webp", "png"];
const formato = FORMATOS.find((f) => existsSync(`public/brand/intervalores.${f}`));

export const LOGO_INTERVALORES = formato ? `/brand/intervalores.${formato}` : null;

if (!LOGO_INTERVALORES) {
  console.warn(
    "\n⚠️  Falta el logo de Intervalores. Guárdalo como public/brand/intervalores.svg (o .webp/.png).\n",
  );
}
