/**
 * Descarga los retratos desde Google Drive a src/assets/emprendedores/.
 *
 * Se corre una sola vez: los archivos quedan versionados en el repo para que
 * el sitio no dependa de que el Drive siga compartido, y son los mismos que
 * en la Fase 2 se suben al Media Library de Strapi.
 *
 *   node scripts/descargar-fotos.mjs          # solo los que faltan
 *   node scripts/descargar-fotos.mjs --force  # vuelve a bajar todo
 */

import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_DATOS = path.join(RAIZ, "src", "data", "emprendedores.json");
const DIR_DESTINO = path.join(RAIZ, "src", "assets", "emprendedores");

const forzar = process.argv.includes("--force");

/**
 * Google limita las descargas por ráfaga y, cuando lo hace, responde 200 con una
 * página HTML en vez del archivo. Por eso se prueban dos rutas y se reintenta
 * con espera creciente en lugar de dar el fallo por definitivo.
 *
 *  - lh3 con `=s2048`: copia ya reescalada, suficiente para un blob a 88vw y
 *    mucho más liviana que el original.
 *  - uc?export=download: el original completo, como respaldo.
 */
const ESTRATEGIAS = [
  (id) => `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=s2048`,
  (id) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
];

const REINTENTOS = 4;
const ESPERA_BASE_MS = 6000;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function existe(ruta) {
  try {
    const info = await stat(ruta);
    return info.size > 0;
  } catch {
    return false;
  }
}

async function intentar(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const tipo = res.headers.get("content-type") ?? "";
  if (!tipo.startsWith("image/")) {
    // HTML aquí significa "throttling" o "ya no es público": no sirve guardarlo.
    throw new Error(`respuesta HTML, no imagen (${tipo || "sin content-type"})`);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 4096) throw new Error(`imagen sospechosamente corta (${bytes.length} B)`);

  return bytes;
}

async function descargar(id, destino) {
  let ultimoError;

  for (let intento = 0; intento < REINTENTOS; intento++) {
    for (const construirUrl of ESTRATEGIAS) {
      try {
        const bytes = await intentar(construirUrl(id));
        await writeFile(destino, bytes);
        return bytes.length;
      } catch (err) {
        ultimoError = err;
      }
    }
    if (intento < REINTENTOS - 1) {
      const espera = ESPERA_BASE_MS * 2 ** intento;
      console.log(`    … limitado por Google, reintento en ${espera / 1000}s`);
      await esperar(espera);
    }
  }

  throw ultimoError ?? new Error("fallo desconocido");
}

const registros = JSON.parse(await readFile(JSON_DATOS, "utf-8"));
const conFoto = registros.filter((r) => r.fotoDriveId && r.foto);

await mkdir(DIR_DESTINO, { recursive: true });

let bajados = 0;
let omitidos = 0;
const fallos = [];

for (const r of conFoto) {
  const destino = path.join(DIR_DESTINO, r.foto);

  if (!forzar && (await existe(destino))) {
    console.log(`  = ${r.foto} (ya está)`);
    omitidos++;
    continue;
  }

  try {
    const bytes = await descargar(r.fotoDriveId, destino);
    console.log(`  ✓ ${r.foto} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
    bajados++;
  } catch (err) {
    console.error(`  ✗ ${r.foto} — ${err.message}`);
    fallos.push({ slug: r.slug, motivo: err.message });
  }

  // Espaciar las peticiones es lo que evita el bloqueo, más que reintentar.
  await esperar(2500);
}

console.log(`\n${bajados} descargados, ${omitidos} ya presentes, ${fallos.length} fallidos.`);

if (fallos.length > 0) {
  console.error("\nRevisar permisos de Drive para:");
  for (const f of fallos) console.error(`  · ${f.slug}: ${f.motivo}`);
  process.exit(1);
}
