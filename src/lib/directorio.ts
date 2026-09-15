/**
 * ADAPTADOR DE DATOS — la única puerta a los emprendedores.
 *
 * Ningún componente debe leer el JSON ni hacer fetch por su cuenta. Todo pasa
 * por getEmprendedores() / getEmprendedor(). Cuando en la Fase 2 la fuente sea
 * Strapi (self-hosted en Coolify), se reescribe SOLO este archivo: se cambia
 * `cargarCrudos()` por la llamada a la API y el resto del sitio no se entera.
 *
 * Por eso el tipo `Emprendedor` es el contrato: el content-type de Strapi debe
 * poder mapearse a esta forma exacta.
 */

import type { ImageMetadata } from "astro";
import crudos from "../data/emprendedores.json";
import {
  esClaveCategoria,
  esComunidad,
  type ClaveCategoria,
  type Comunidad,
} from "../data/taxonomia";

export type Emprendedor = {
  slug: string;
  nombre: string;
  comunidad: Comunidad;
  categoria: ClaveCategoria;
  /** null mientras la persona no haya entregado los datos de su negocio. */
  emprendimiento: string | null;
  /** Descripción ya partida en párrafos; el Excel trae saltos dobles. */
  parrafos: string[];
  /** Sin datos de negocio todavía: se lista, pero en estado "en preparación". */
  fichaPendiente: boolean;
  /**
   * TEMPORAL: muestra la foto de otra persona porque la suya sigue en Drive.
   * La UI lo marca visiblemente y el build avisa. Ver scripts/placeholders.mjs.
   */
  fotoPendiente: boolean;
  /**
   * Nunca es null: sin retrato no hay ficha. El concepto entero es el rostro
   * dentro del blob, así que una entrada sin foto se queda fuera del listado.
   */
  foto: ImageMetadata;
  telefono: string | null;
  whatsapp: string | null;
  /**
   * Vídeo de presentación. Hoy todos comparten un placeholder de stock; en la
   * Fase 2 cada emprendedor sube el suyo a Strapi y este campo apunta a él.
   */
  video: string | null;
  /** TEMPORAL: el vídeo es de stock, no es esta persona. La UI lo marca. */
  videoPendiente: boolean;
};

/**
 * Placeholder compartido: Big Buck Bunny (Blender Foundation, CC-BY), recortado
 * a cuadrado y sin audio. Es deliberadamente obvio que no es material real,
 * igual que las fotos prestadas, para que nadie lo confunda con lo definitivo.
 * Al ser un único archivo, se descarga una vez y vale para los catorce.
 */
const VIDEO_PLACEHOLDER = "/video/emprendedor-placeholder.mp4";

/**
 * Astro necesita las imágenes importadas estáticamente para optimizarlas en
 * build. `eager` las resuelve en tiempo de compilación, no en el navegador.
 */
const ARCHIVOS_FOTO = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/emprendedores/*.{jpg,jpeg,png,webp}",
  { eager: true },
);

function buscarFoto(nombreArchivo: string | null): ImageMetadata | null {
  if (!nombreArchivo) return null;
  const clave = Object.keys(ARCHIVOS_FOTO).find((ruta) =>
    ruta.endsWith(`/${nombreArchivo}`),
  );
  return clave ? ARCHIVOS_FOTO[clave]!.default : null;
}

type Crudo = (typeof crudos)[number];

/** Descarta lo que no puede sostener una ficha, en vez de renderizar huecos. */
function normalizar(crudo: Crudo): Emprendedor | null {
  if (!crudo.publicado) return null;
  if (!esComunidad(crudo.comunidad)) return null;
  if (!esClaveCategoria(crudo.categoria)) return null;

  // El retrato es obligatorio: el concepto entero es el rostro dentro del blob.
  const foto = buscarFoto(crudo.foto);
  if (!foto) return null;

  const fichaPendiente = Boolean(crudo.fichaPendiente);

  return {
    slug: crudo.slug,
    nombre: crudo.nombre,
    comunidad: crudo.comunidad,
    categoria: crudo.categoria,
    emprendimiento: fichaPendiente ? null : crudo.emprendimiento,
    parrafos: fichaPendiente ? [] : crudo.parrafos,
    fichaPendiente,
    fotoPendiente: Boolean(crudo.fotoPendiente),
    foto,
    // Sin ficha no se ofrece contacto: no se manda gente a un negocio sin describir.
    telefono: fichaPendiente ? null : crudo.telefono,
    whatsapp: fichaPendiente ? null : crudo.whatsapp,
    video: VIDEO_PLACEHOLDER,
    videoPendiente: true,
  };
}

let cache: Emprendedor[] | null = null;

export async function getEmprendedores(): Promise<Emprendedor[]> {
  if (cache) return cache;

  const lista = (crudos as Crudo[])
    .map(normalizar)
    .filter((e): e is Emprendedor => e !== null)
    // Las fichas completas primero; las que están en preparación cierran.
    .sort((a, b) => Number(a.fichaPendiente) - Number(b.fichaPendiente));

  const prestadas = lista.filter((e) => e.fotoPendiente);
  if (prestadas.length > 0) {
    console.warn(
      `\n⚠️  ${prestadas.length} fichas usan la foto de otra persona (maqueta).` +
        `\n   No desplegar así. Corre: npm run fotos && npm run placeholders\n`,
    );
  }

  cache = lista;
  return cache;
}

export async function getEmprendedor(slug: string): Promise<Emprendedor | null> {
  const todos = await getEmprendedores();
  return todos.find((e) => e.slug === slug) ?? null;
}
