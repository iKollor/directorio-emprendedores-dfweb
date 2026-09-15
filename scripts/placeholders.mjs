/**
 * Completa los huecos para poder maquetar con los 14 emprendedores.
 *
 *   node scripts/placeholders.mjs
 *
 * Hace dos cosas, ambas TEMPORALES y marcadas como tales en los datos:
 *
 * 1. FOTO. A quien no tenga retrato descargado le copia uno existente, para
 *    que el blob tenga una imagen real con la que trabajar. Queda marcado con
 *    `fotoPendiente: true`.
 *
 *    ⚠️ Esto pone la cara de una persona real en la ficha de OTRA persona con
 *    nombre y apellido. Sirve para maquetar; NO puede desplegarse. El sitio
 *    lo muestra con marca de agua y el build avisa mientras quede alguno.
 *    Se corrige solo al correr `npm run fotos` con las fotos reales.
 *
 * 2. FICHA. A quien no tenga negocio ni descripción NO se le inventa nada:
 *    se le marca `fichaPendiente: true` y el sitio muestra un estado honesto
 *    de "Ficha en preparación", sin contacto.
 *
 * Es idempotente: vuelve a evaluar el estado real en cada corrida y limpia las
 * marcas de quien ya tenga su foto o su ficha de verdad.
 */

import { readFile, writeFile, readdir, copyFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_DATOS = path.join(RAIZ, "src", "data", "emprendedores.json");
const DIR_FOTOS = path.join(RAIZ, "src", "assets", "emprendedores");

const MARCA = ".placeholder.jpg";

const registros = JSON.parse(await readFile(JSON_DATOS, "utf-8"));

const presentes = new Set(await readdir(DIR_FOTOS).catch(() => []));
/** Fotos reales = las que no son copias que dejó este mismo script. */
const reales = [...presentes].filter((f) => !f.endsWith(MARCA)).sort();

if (reales.length === 0) {
  console.error("No hay ninguna foto real en src/assets/emprendedores/.");
  console.error("Corre primero:  npm run fotos");
  process.exit(1);
}

let conFotoPrestada = 0;
let conFichaPendiente = 0;

for (const [i, r] of registros.entries()) {
  const propia = r.foto && presentes.has(r.foto) && !r.foto.endsWith(MARCA);

  if (propia) {
    // Ya llegó su foto real: se borra la prestada si quedaba alguna.
    if (r.fotoPendiente) {
      await unlink(path.join(DIR_FOTOS, `${r.slug}${MARCA}`)).catch(() => {});
    }
    r.fotoPendiente = false;
  } else {
    // Se reparten las fotos disponibles en vez de repetir siempre la misma,
    // para que la maqueta no parezca ocho veces la misma persona.
    const prestada = reales[i % reales.length];
    const destino = `${r.slug}${MARCA}`;
    await copyFile(path.join(DIR_FOTOS, prestada), path.join(DIR_FOTOS, destino));
    r.foto = destino;
    r.fotoPendiente = true;
    conFotoPrestada++;
  }

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
console.log(`  · ${conFotoPrestada} con foto prestada (fotoPendiente)`);
console.log(`  · ${conFichaPendiente} con ficha en preparación (fichaPendiente)`);

if (conFotoPrestada > 0) {
  console.log(
    `\n⚠️  ${conFotoPrestada} fichas muestran la foto de otra persona.` +
      `\n   Estado de maqueta. Antes de desplegar: npm run fotos`,
  );
}
