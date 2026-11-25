/**
 * EL FAVICON. Genera, a partir de dos SVG, todo lo que piden los navegadores
 * (la receta de Evil Martians, "How to Favicon in 2026": seis archivos).
 *
 *   public/icon.svg            el original: se sirve tal cual. Cambia de color
 *                              con el modo oscuro (media query dentro del SVG).
 *   scripts/favicon/icono-lleno.svg
 *                              el mismo a sangre, opaco, con el dibujo al 80 %.
 *
 * Salen:
 *   public/favicon.ico         16, 32 y 48 px, para lo que no lee SVG.
 *   public/apple-touch-icon.png 180 px, opaco (transparente, iOS pone negro).
 *   public/icon-192.png, public/icon-512.png   para Android ("any").
 *   public/icon-mask.png       512 px, "maskable": Android lo recorta en
 *                              círculo u otra forma, por eso va a sangre.
 *
 * Los PNG y el ICO son siempre la cara clara: un PNG no tiene modo oscuro.
 *
 * Uso: node scripts/favicon/generar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const publico = path.join(raiz, "public");
// La cara clara: sin el bloque de modo oscuro.
const claro = (archivo) => Buffer.from(fs.readFileSync(archivo, "utf8").replace(/<style>[\s\S]*?<\/style>/, ""));
const icono = claro(path.join(publico, "icon.svg"));
const lleno = claro(path.join(raiz, "scripts/favicon/icono-lleno.svg"));

/** Un SVG de 32 unidades, a `lado` píxeles, nítido (se rasteriza a su tamaño, no se reduce). */
const png = (svg, lado) => sharp(svg, { density: (72 * lado) / 32 }).resize(lado, lado).png({ compressionLevel: 9 }).toBuffer();

/** Un ICO con PNG dentro (lo leen todos los navegadores y Windows desde Vista). */
function ico(imagenes) {
  const cabecera = Buffer.alloc(6 + 16 * imagenes.length);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2);
  cabecera.writeUInt16LE(imagenes.length, 4);
  let desplazamiento = cabecera.length;
  imagenes.forEach(({ lado, datos }, i) => {
    const e = 6 + 16 * i;
    cabecera.writeUInt8(lado >= 256 ? 0 : lado, e);
    cabecera.writeUInt8(lado >= 256 ? 0 : lado, e + 1);
    cabecera.writeUInt8(0, e + 2);
    cabecera.writeUInt8(0, e + 3);
    cabecera.writeUInt16LE(1, e + 4);
    cabecera.writeUInt16LE(32, e + 6);
    cabecera.writeUInt32LE(datos.length, e + 8);
    cabecera.writeUInt32LE(desplazamiento, e + 12);
    desplazamiento += datos.length;
  });
  return Buffer.concat([cabecera, ...imagenes.map((i) => i.datos)]);
}

const capas = [];
for (const lado of [16, 32, 48]) capas.push({ lado, datos: await png(icono, lado) });
fs.writeFileSync(path.join(publico, "favicon.ico"), ico(capas));
fs.writeFileSync(path.join(publico, "apple-touch-icon.png"), await png(lleno, 180));
fs.writeFileSync(path.join(publico, "icon-192.png"), await png(icono, 192));
fs.writeFileSync(path.join(publico, "icon-512.png"), await png(icono, 512));
fs.writeFileSync(path.join(publico, "icon-mask.png"), await png(lleno, 512));

for (const f of ["icon.svg", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-mask.png"]) {
  console.log(f.padEnd(22), fs.statSync(path.join(publico, f)).size, "bytes");
}
