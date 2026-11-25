/**
 * EL MANIFIESTO: lo que usa el teléfono al añadir el sitio a la pantalla de
 * inicio (nombre, colores e iconos). El nombre sale del panel ("Textos y
 * logos" > General > título del sitio), así que se cambia con él: el sitio se
 * reconstruye al publicar. Antes era un archivo fijo y no cambiaba.
 *
 * Los iconos los genera scripts/favicon/generar.mjs.
 */
import type { APIRoute } from "astro";
import { getSitio } from "../lib/sitio";

export const GET: APIRoute = async ({ locals }) => {
  const { general } = await getSitio(locals);
  const nombre = general.tituloSitio;
  // El corto, bajo el icono: lo que va antes de "·" ("Emprendedores · Diseña Futuro").
  const corto = nombre.split(/\s+[·|–—-]\s+/)[0]?.trim() || nombre;
  const manifiesto = {
    name: nombre,
    short_name: corto,
    lang: "es",
    start_url: "/",
    theme_color: "#4141f9",
    background_color: "#4141f9",
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-mask.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
  return new Response(JSON.stringify(manifiesto, null, 2), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
};
