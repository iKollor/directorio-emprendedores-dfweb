/**
 * Completa los huecos para poder listar a los 14 emprendedores.
 *
 *   node scripts/placeholders.mjs
 *
 * A quien no tenga negocio ni descripción NO se le inventa nada: se le marca
 * `fichaPendiente: true` y el sitio lo muestra como "Próximamente", sin
 * contacto.
 *
 * Ya NO presta fotos de otras personas. Quien no tenga foto propia muestra una
 * silueta neutra, y eso lo decide el adaptador (src/lib/directorio.ts) en
 * cada build. Este script borra las copias que dejaba la versión anterior.
 *
 * Es idempotente: vuelve a evaluar el estado real en cada corrida.
 */

import { readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_DATOS = path.join(RAIZ, "src", "data", "emprendedores.json");
const DIR_FOTOS = path.join(RAIZ, "src", "assets", "emprendedores");

const MARCA = ".placeholder.jpg";

const registros = JSON.parse(await readFile(JSON_DATOS, "utf-8"));

let conFichaPendiente = 0;

for (const r of registros) {
  // Las copias de la versión anterior ponían la cara de otra persona: fuera.
  if (r.foto?.endsWith(MARCA)) r.foto = r.fotoDriveId ? `${r.slug}.jpg` : null;
  await unlink(path.join(DIR_FOTOS, `${r.slug}${MARCA}`)).catch(() => {});
  delete r.fotoPendiente;

  // Sin negocio o sin descripción: estado honesto, nada inventado.
  const fichaCompleta = Boolean(r.emprendimiento) && r.parrafos.length > 0;
  r.fichaPendiente = !fichaCompleta;
  if (!fichaCompleta) {
    r.categoria = "pendiente";
    conFichaPendiente++;
  }

  // Ahora todos se listan: los 14 entran a la maqueta.
  r.publicado = true;
}

await writeFile(JSON_DATOS, JSON.stringify(registros, null, 2) + "\n", "utf-8");

console.log(`${registros.length} emprendedores listados.`);
console.log(`  · ${conFichaPendiente} en estado "Próximamente" (fichaPendiente)`);
