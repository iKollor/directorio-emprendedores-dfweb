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
import fotoNeutra from "../assets/marca/foto-pendiente.jpg";
import {
  esClaveCategoria,
  esComunidad,
  type ClaveCategoria,
  type Comunidad,
} from "../data/taxonomia";

export type Emprendedor = {
  slug: string;
  /**
   * Nombre PÚBLICO: un nombre y un apellido ("Daniela Holguín"). El nombre
   * completo no sale del adaptador, así que no llega a ningún HTML. Quien
   * contacte al emprendedor recibe el resto de sus datos de él mismo.
   */
  nombre: string;
  comunidad: Comunidad;
  categoria: ClaveCategoria;
  /** null mientras la persona no haya entregado los datos de su negocio. */
  emprendimiento: string | null;
  /** Descripción resumida; el Excel trae textos largos que se editan aparte. */
  parrafos: string[];
  /** Sin datos de negocio todavía: se lista, pero en estado "Próximamente". */
  fichaPendiente: boolean;
  /**
   * Todavía no hay foto propia: se muestra una silueta neutra. Nunca la foto
   * de otra persona.
   */
  fotoPendiente: boolean;
  /**
   * Nunca es null: sin retrato propio va la silueta neutra, así el blob
   * siempre tiene algo que recortar.
   */
  foto: ImageMetadata;
  telefono: string | null;
  whatsapp: string | null;
  /** Vídeo de presentación propio, o null si todavía no lo hay. */
  video: string | null;
  /** Fotos de sus productos o servicios, en orden de nombre de archivo. */
  galeria: ImageMetadata[];
};

/**
 * Astro necesita las imágenes importadas estáticamente para optimizarlas en
 * build. `eager` las resuelve en tiempo de compilación, no en el navegador.
 */
const ARCHIVOS_FOTO = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/emprendedores/*.{jpg,jpeg,png,webp}",
  { eager: true },
);

/**
 * MATERIAL POR CONVENCIÓN DE CARPETAS: para sumar contenido no hace falta
 * tocar código ni el JSON, solo dejar el archivo con el slug correcto.
 *
 *   src/assets/videos/<slug>.mp4            vídeo de presentación
 *   src/assets/productos/<slug>/<n>.jpg      fotos de productos o servicios
 *
 * El vídeo se importa como URL: Vite lo copia con hash al build.
 */
const ARCHIVOS_VIDEO = import.meta.glob<string>("../assets/videos/*.{mp4,webm}", {
  eager: true,
  query: "?url",
  import: "default",
});

const ARCHIVOS_PRODUCTO = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/productos/*/*.{jpg,jpeg,png,webp}",
  { eager: true },
);

function buscarFoto(nombreArchivo: string | null): ImageMetadata | null {
  if (!nombreArchivo) return null;
  const clave = Object.keys(ARCHIVOS_FOTO).find((ruta) =>
    ruta.endsWith(`/${nombreArchivo}`),
  );
  return clave ? ARCHIVOS_FOTO[clave]!.default : null;
}

function buscarVideo(slug: string): string | null {
  const clave = Object.keys(ARCHIVOS_VIDEO).find((ruta) =>
    /\/([^/]+)\.(mp4|webm)$/.exec(ruta)?.[1] === slug,
  );
  return clave ? ARCHIVOS_VIDEO[clave]! : null;
}

function buscarGaleria(slug: string): ImageMetadata[] {
  return Object.keys(ARCHIVOS_PRODUCTO)
    .filter((ruta) => ruta.includes(`/productos/${slug}/`))
    .sort()
    .map((ruta) => ARCHIVOS_PRODUCTO[ruta]!.default);
}

/**
 * Un nombre y un apellido. En Ecuador lo habitual son cuatro palabras (dos
 * nombres y dos apellidos), así que se toman la primera y la tercera. Con
 * tres palabras no se puede saber cuál es el apellido: se toman las dos
 * primeras, y si sale mal se fija `nombrePublico` en el JSON.
 */
function nombrePublico(crudo: Crudo): string {
  if ("nombrePublico" in crudo && typeof crudo.nombrePublico === "string") {
    return crudo.nombrePublico;
  }
  const partes = crudo.nombre.trim().split(/\s+/);
  if (partes.length >= 4) return `${partes[0]} ${partes[2]}`;
  return partes.slice(0, 2).join(" ");
}

type Crudo = (typeof crudos)[number];

/** Descarta lo que no puede sostener una ficha, en vez de renderizar huecos. */
function normalizar(crudo: Crudo): Emprendedor | null {
  if (!crudo.publicado) return null;
  if (!esComunidad(crudo.comunidad)) return null;
  if (!esClaveCategoria(crudo.categoria)) return null;

  const propia = buscarFoto(crudo.foto);
  const fichaPendiente = Boolean(crudo.fichaPendiente);
  const resumen = "resumen" in crudo ? crudo.resumen : null;
  const oficio = "oficio" in crudo ? crudo.oficio : null;

  return {
    slug: crudo.slug,
    nombre: nombrePublico(crudo),
    comunidad: crudo.comunidad,
    categoria: crudo.categoria,
    emprendimiento: fichaPendiente ? null : (oficio ?? crudo.emprendimiento),
    parrafos: fichaPendiente ? [] : resumen ? [resumen] : crudo.parrafos,
    fichaPendiente,
    fotoPendiente: !propia,
    foto: propia ?? fotoNeutra,
    // Sin ficha no se ofrece contacto: no se manda gente a un negocio sin describir.
    telefono: fichaPendiente ? null : crudo.telefono,
    whatsapp: fichaPendiente ? null : crudo.whatsapp,
    video: fichaPendiente ? null : buscarVideo(crudo.slug),
    galeria: fichaPendiente ? [] : buscarGaleria(crudo.slug),
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

  const sinFoto = lista.filter((e) => e.fotoPendiente);
  if (sinFoto.length > 0) {
    console.info(
      `\nℹ️  ${sinFoto.length} emprendedores todavía sin foto propia (se muestra una silueta).` +
        `\n   Corre: npm run fotos\n`,
    );
  }

  cache = lista;
  return cache;
}

export async function getEmprendedor(slug: string): Promise<Emprendedor | null> {
  const todos = await getEmprendedores();
  return todos.find((e) => e.slug === slug) ?? null;
}
