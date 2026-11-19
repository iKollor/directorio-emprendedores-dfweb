/**
 * LOS VÍDEOS DEL PANEL, SERVIDOS DESDE EL SITIO. El material `tinta.ts` usa
 * el vídeo como textura, y el navegador solo deja hacerlo con vídeos del
 * mismo origen. Además así el panel no tiene que ser visible desde fuera
 * más que para quien lo edita.
 *
 * Las fotos no pasan por aquí: las optimiza Astro (`paraImage`).
 */
import type { APIRoute } from "astro";
import { CMS_URL } from "../../lib/directorio";

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const archivo = params.archivo ?? "";
  // Solo vídeos, y solo un nombre de archivo: nada de rutas.
  if (!CMS_URL || !/^[^/\\]+\.(mp4|webm)$/i.test(archivo)) return new Response("No encontrado", { status: 404 });

  // Se reenvía el tramo pedido: los navegadores piden el vídeo a trozos.
  const tramo = request.headers.get("range");
  const origen = await fetch(`${CMS_URL}/api/medios/file/${encodeURIComponent(archivo)}`, {
    headers: tramo ? { range: tramo } : undefined,
  });
  if (!origen.ok && origen.status !== 206) return new Response("No encontrado", { status: 404 });

  const cabeceras = new Headers({ "Cache-Control": "public, max-age=86400", "Accept-Ranges": "bytes" });
  for (const nombre of ["content-type", "content-length", "content-range", "etag", "last-modified"]) {
    const valor = origen.headers.get(nombre);
    if (valor) cabeceras.set(nombre, valor);
  }
  return new Response(origen.body, { status: origen.status, headers: cabeceras });
};
