/**
 * Prepara los retratos para el blob: recorte cuadrado + tamaño acotado.
 *
 *   node scripts/normalizar-fotos.mjs [--force]
 *
 * Dos problemas reales de los archivos de origen:
 *
 * 1. NO SON RETRATOS. Son fotos de clase de 6000px: gente escribiendo en un
 *    pupitre, de cuerpo entero junto a un banner, a veces con más de una
 *    persona en cuadro. Un `object-position` fijo en CSS recorta mal a unos
 *    para acertar con otros. Aquí se recorta a cuadrado con la estrategia de
 *    saliencia de sharp, que encuentra al sujeto; y cuando se equivoca, se
 *    corrige a mano en scripts/recortes.json sin tocar código.
 *
 * 2. PESAN 2-6 MB. El mayor ancho que sirve el sitio es 1400px, así que todo
 *    lo demás infla el repo y hace que Astro genere un `src` de respaldo
 *    gigantesco.
 *
 * Idempotente: una foto ya cuadrada y acotada se salta, salvo con --force.
 */

import { readdir, stat, rename, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR_FOTOS = path.join(RAIZ, "src", "assets", "emprendedores");
const AJUSTES = path.join(RAIZ, "scripts", "recortes.json");

/** Por encima del mayor ancho del srcset (1400), con margen para pantallas 2x. */
const LADO = 1800;
const CALIDAD = 86;

const forzar = process.argv.includes("--force");

const ajustes = JSON.parse(await readFile(AJUSTES, "utf-8").catch(() => "{}"));
const slugDe = (archivo) => archivo.replace(/\.placeholder\.jpg$/i, "").replace(/\.\w+$/, "");

/**
 * Recorte cuadrado alrededor de un punto focal dado a mano (0-1 sobre la foto).
 * Se calcula el cuadrado más grande posible y se desplaza sin salirse del borde.
 */
function ventanaFocal(ancho, alto, foco) {
  const lado = Math.min(ancho, alto);
  const centro = (valor, total) => {
    const bruto = valor * total - lado / 2;
    return Math.round(Math.min(Math.max(bruto, 0), total - lado));
  };
  return { left: centro(foco.x ?? 0.5, ancho), top: centro(foco.y ?? 0.5, alto), width: lado, height: lado };
}

const archivos = (await readdir(DIR_FOTOS).catch(() => [])).filter((f) =>
  /\.(jpe?g|png)$/i.test(f),
);

if (archivos.length === 0) {
  console.log("No hay fotos que preparar. Corre primero: npm run fotos");
  process.exit(0);
}

let tocados = 0;
let ahorro = 0;

for (const archivo of archivos) {
  const ruta = path.join(DIR_FOTOS, archivo);
  const antes = (await stat(ruta)).size;
  const meta = await sharp(ruta).metadata();
  const ancho = meta.width ?? 0;
  const alto = meta.height ?? 0;

  const yaLista = ancho === alto && ancho <= LADO;
  if (yaLista && !forzar) {
    console.log(`  = ${archivo} (${ancho}×${alto}, ya preparada)`);
    continue;
  }

  const foco = ajustes[slugDe(archivo)];
  // sharp no puede escribir sobre el archivo que está leyendo.
  const temporal = `${ruta}.tmp`;

  let tuberia = sharp(ruta).rotate(); // respeta la orientación EXIF

  if (foco && typeof foco === "object" && !Array.isArray(foco)) {
    tuberia = tuberia.extract(ventanaFocal(ancho, alto, foco)).resize(LADO, LADO, {
      fit: "cover",
      withoutEnlargement: true,
    });
  } else {
    tuberia = tuberia.resize(LADO, LADO, {
      fit: "cover",
      position: sharp.strategy.attention,
      withoutEnlargement: true,
    });
  }

  await tuberia.jpeg({ quality: CALIDAD, mozjpeg: true }).toFile(temporal);
  await rename(temporal, ruta);

  const despues = (await stat(ruta)).size;
  ahorro += antes - despues;
  tocados++;

  const modo = foco ? `foco ${foco.x},${foco.y}` : "saliencia";
  console.log(
    `  ✓ ${archivo}  ${ancho}×${alto} → ${LADO}² (${modo})  ` +
      `${(antes / 1024 / 1024).toFixed(1)} → ${(despues / 1024 / 1024).toFixed(1)} MB`,
  );
}

console.log(`\n${tocados} preparadas. ${(ahorro / 1024 / 1024).toFixed(1)} MB menos.`);
if (tocados > 0) {
  console.log("Revisa los recortes; si alguno corta mal, ajústalo en scripts/recortes.json.");
}
