/**
 * ADAPTADOR DE DATOS — la única puerta a los emprendedores.
 *
 * Ningún componente debe leer el JSON ni hacer fetch por su cuenta. Todo pasa
 * por getEmprendedores() / getEmprendedor().
 *
 * Hay dos fuentes y las dos dan la misma forma, el tipo `Emprendedor`:
 *
 *   - EL PANEL (Payload, carpeta `cms/`), si existe la variable `CMS_URL`.
 *     Es la fuente real: lo que el cliente publica ahí es lo que se construye.
 *   - EL JSON `src/data/emprendedores.json`, si no la hay. Sirve para trabajar
 *     en el diseño sin levantar el panel, y es lo que el panel carga la
 *     primera vez que arranca.
 *
 * `getBorrador()` es la vista previa: lo que hay guardado en el panel aunque
 * no esté publicado. Solo la usa `src/pages/vista-previa/`.
 */

import type { ImageMetadata } from "astro";
import crudos from "../data/emprendedores.json";
import fotoNeutra from "../assets/marca/foto-pendiente.jpg";
import {
  CATEGORIA_PENDIENTE,
  esClaveCategoria,
  esComunidad,
  registrarCategorias,
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
  /** Dato interno (no se publica); desde el panel puede venir vacío. */
  comunidad: Comunidad | null;
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
  foto: Foto;
  telefono: string | null;
  whatsapp: string | null;
  /**
   * Dónde está el rostro en la foto y cuánto acercarse a él (ver `ROSTRO`).
   * Sirve para que quede en el centro del retrato y no en el borde.
   */
  rostro: Rostro;
  /** Vídeo de presentación propio, o null si todavía no lo hay. */
  video: string | null;
  /**
   * El mismo vídeo con sonido y a su proporción real, en una o varias
   * calidades (de mayor a menor). Es lo que suena al pasar el puntero y lo
   * que reproduce el primer plano. Vacío: se usa `video` tal cual.
   */
  videoSonido: VideoSonido[];
  /** Fotos de sus productos o servicios, en el orden elegido. */
  galeria: Foto[];
};

/**
 * Una foto del repositorio (importada, `ImageMetadata`) o una subida al panel
 * (su dirección y su tamaño). Las dos tienen `src`, `width` y `height`; para
 * pintarlas con `<Image>` se usa `paraImage()`, que Astro optimiza igual.
 */
export type FotoRemota = { src: string; width: number; height: number };
export type Foto = ImageMetadata | FotoRemota;

export function paraImage(foto: Foto) {
  const local = "format" in foto;
  return { src: local ? foto : foto.src, width: foto.width, height: foto.height } as
    | { src: ImageMetadata; width: number; height: number }
    | { src: string; width: number; height: number };
}

/**
 * EL ROSTRO, AL CENTRO. Las fotos de origen son apaisadas y de clase, no
 * retratos: la cara suele quedar en el tercio superior. Recortadas al centro,
 * caía en el borde de la gota, que es justo donde el vidrio curva la imagen.
 *
 * `x` e `y` van de 0 a 1 sobre el archivo de la foto tal como está en el
 * repositorio (x=0 izquierda, y=0 arriba). `zoom` es cuánto se acerca el
 * encuadre para poder llevar esa cara al centro. Se fija por persona con el
 * campo `rostro` del JSON; sin él vale este valor, pensado para una cara en
 * el tercio superior.
 */
export type Rostro = { x: number; y: number; zoom: number };
const ROSTRO: Rostro = { x: 0.5, y: 0.34, zoom: 1.35 };

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

const ARCHIVOS_SONIDO = import.meta.glob<string>("../assets/videos/sonido/*.{mp4,webm}", {
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

/** Una calidad del vídeo con sonido: su dirección y su alto en píxeles. */
export type VideoSonido = { src: string; alto: number };

/**
 * El alto va en el nombre del archivo: `kelly-cedillo-720.mp4`. Sin número se
 * toma por 720, que es lo que suele salir de un teléfono.
 */
const CALIDAD = /-(\d{3,4})p?\.(mp4|webm)$/i;
const altoDe = (nombre: string) => Number(CALIDAD.exec(nombre)?.[1] ?? 720);
const ordenar = (lista: VideoSonido[]) => lista.sort((a, b) => b.alto - a.alto);

function buscarSonido(slug: string): VideoSonido[] {
  return ordenar(
    Object.keys(ARCHIVOS_SONIDO)
      .filter((ruta) => ruta.split("/").pop()!.replace(CALIDAD, "") === slug)
      .map((ruta) => ({ src: ARCHIVOS_SONIDO[ruta]!, alto: altoDe(ruta) })),
  );
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
function nombrePublico(crudo: { nombre: string; nombrePublico?: string }): string {
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
    rostro: { ...ROSTRO, ...("rostro" in crudo && crudo.rostro ? crudo.rostro : {}) },
    // Sin ficha no se ofrece contacto: no se manda gente a un negocio sin describir.
    telefono: fichaPendiente ? null : crudo.telefono,
    whatsapp: fichaPendiente ? null : crudo.whatsapp,
    video: fichaPendiente ? null : buscarVideo(crudo.slug),
    videoSonido: fichaPendiente ? [] : buscarSonido(crudo.slug),
    galeria: fichaPendiente ? [] : buscarGaleria(crudo.slug),
  };
}

/* ------------------------------------------------------------------ */
/* El panel                                                            */
/* ------------------------------------------------------------------ */

/**
 * Dirección del panel vista desde el servidor del sitio (en la VM, la de la
 * red interna). El navegador nunca habla con el panel: las fotos pasan por
 * el optimizador de Astro y los vídeos por `/medios/` (src/pages/medios/).
 */
export const CMS_URL = String(process.env.CMS_URL ?? import.meta.env.CMS_URL ?? "").replace(/\/+$/, "");

type MedioCms = {
  filename?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
};

type CategoriaCms = { id: number | string; nombre: string; color: string };

const claveCategoria = (c: CategoriaCms) => `cat-${c.id}`;

type DocCms = {
  id: number | string;
  slug?: string | null;
  nombre: string;
  nombrePublico?: string | null;
  fichaPendiente?: boolean | null;
  categoria?: CategoriaCms | number | null;
  comunidad?: string | null;
  oficio?: string | null;
  descripcion?: string | null;
  telefono?: string | null;
  foto?: MedioCms | number | null;
  video?: MedioCms | number | null;
  videoSonido?: (MedioCms | number)[] | null;
  galeria?: (MedioCms | number)[] | null;
};

const esMedio = (m: unknown): m is MedioCms & { filename: string } =>
  typeof m === "object" && m !== null && typeof (m as MedioCms).filename === "string";

function fotoDeCms(m: unknown): FotoRemota | null {
  if (!esMedio(m) || !m.mimeType?.startsWith("image/") || !m.width || !m.height) return null;
  return {
    src: `${CMS_URL}/api/medios/file/${encodeURIComponent(m.filename)}`,
    width: m.width,
    height: m.height,
  };
}

/** `+593 99 538 2184` -> `https://wa.me/593995382184` */
function whatsappDe(telefono: string | null): string | null {
  const cifras = (telefono ?? "").replace(/\D/g, "");
  return cifras.length >= 10 ? `https://wa.me/${cifras}` : null;
}

function deCms(doc: DocCms): Emprendedor | null {
  if (!doc.slug || !doc.nombre?.trim()) return null;

  const fichaPendiente = Boolean(doc.fichaPendiente);
  // Sin categoría válida no hay color ni filtro: se trata como pendiente
  // en vez de pintar una ficha a medias.
  const cat = typeof doc.categoria === "object" && doc.categoria ? doc.categoria : null;
  const pendiente = fichaPendiente || !cat || !doc.oficio?.trim();

  const propia = fotoDeCms(doc.foto);
  // El punto focal que se marca en el panel (0 a 100) es el rostro.
  const medioFoto = esMedio(doc.foto) ? doc.foto : null;
  const rostro: Rostro = {
    ...ROSTRO,
    ...(medioFoto && typeof medioFoto.focalX === "number" && typeof medioFoto.focalY === "number"
      ? { x: medioFoto.focalX / 100, y: medioFoto.focalY / 100 }
      : {}),
  };

  const telefono = doc.telefono?.trim() || null;
  const video = esMedio(doc.video) && doc.video.mimeType?.startsWith("video/") ? doc.video.filename : null;

  return {
    slug: doc.slug,
    nombre: nombrePublico({ nombre: doc.nombre, ...(doc.nombrePublico?.trim() ? { nombrePublico: doc.nombrePublico.trim() } : {}) }),
    comunidad: esComunidad(doc.comunidad) ? doc.comunidad : null,
    categoria: pendiente ? CATEGORIA_PENDIENTE : claveCategoria(cat!),
    emprendimiento: pendiente ? null : doc.oficio!.trim(),
    parrafos: pendiente
      ? []
      : (doc.descripcion ?? "")
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
    fichaPendiente: pendiente,
    fotoPendiente: !propia,
    foto: propia ?? fotoNeutra,
    rostro,
    telefono: pendiente ? null : telefono,
    whatsapp: pendiente ? null : whatsappDe(telefono),
    video: pendiente || !video ? null : `/medios/${encodeURIComponent(video)}`,
    videoSonido: pendiente
      ? []
      : ordenar(
          (doc.videoSonido ?? [])
            .filter((m): m is MedioCms & { filename: string } => esMedio(m) && Boolean(m.mimeType?.startsWith("video/")))
            .map((m) => ({ src: `/medios/${encodeURIComponent(m.filename)}`, alto: altoDe(m.filename) })),
        ),
    galeria: pendiente ? [] : (doc.galeria ?? []).map(fotoDeCms).filter((f): f is FotoRemota => f !== null),
  };
}

async function pedirAlCms<T>(ruta: string, cabeceras?: Record<string, string>): Promise<T> {
  const respuesta = await fetch(`${CMS_URL}${ruta}`, { headers: cabeceras });
  if (!respuesta.ok) throw new Error(`El panel respondió ${respuesta.status} a ${ruta}`);
  return (await respuesta.json()) as T;
}

async function cargarCategorias() {
  const { docs } = await pedirAlCms<{ docs: CategoriaCms[] }>("/api/categorias?limit=200&depth=0&sort=_order");
  registrarCategorias(docs.map((c) => ({ clave: claveCategoria(c), etiqueta: c.nombre, color: c.color })));
}

async function cargarDelCms(): Promise<Emprendedor[]> {
  await cargarCategorias();
  // Sin sesión, el panel solo entrega lo publicado. `_order` es el orden en
  // que el cliente ha dejado la lista.
  const { docs } = await pedirAlCms<{ docs: DocCms[] }>(
    "/api/emprendedores?limit=1000&depth=1&sort=_order&where[_status][equals]=published",
  );
  return docs.map(deCms).filter((e): e is Emprendedor => e !== null);
}

/**
 * VISTA PREVIA: la ficha tal como está guardada en el panel, publicada o no.
 * Devuelve null si la clave no vale o la ficha no existe.
 */
export async function getBorrador(id: string, clave: string): Promise<Emprendedor | null> {
  if (!CMS_URL || !clave || !/^[\w-]+$/.test(id)) return null;
  try {
    const doc = await pedirAlCms<DocCms>(`/api/emprendedores/${id}?depth=1&draft=true`, {
      "x-clave-vista-previa": clave,
    });
    // La categoría puede ser nueva y no estar aún en lo publicado.
    if (typeof doc.categoria === "object" && doc.categoria) {
      const c = doc.categoria;
      registrarCategorias([{ clave: claveCategoria(c), etiqueta: c.nombre, color: c.color }], false);
    }
    // A medio escribir puede faltar la dirección: la vista previa no la necesita.
    return deCms({ ...doc, slug: doc.slug || `borrador-${doc.id}` });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */

let cache: { lista: Emprendedor[]; hasta: number } | null = null;

export async function getEmprendedores(): Promise<Emprendedor[]> {
  // Durante el build se pide una sola vez. En el servidor (vista previa) se
  // renueva cada minuto, para que "la siguiente persona" no se quede vieja.
  if (cache && cache.hasta > Date.now()) return cache.lista;

  const origen = CMS_URL
    ? await cargarDelCms()
    : (crudos as Crudo[]).map(normalizar).filter((e): e is Emprendedor => e !== null);

  const lista = origen
    // Las fichas completas primero; las que están en preparación cierran.
    .sort((a, b) => Number(a.fichaPendiente) - Number(b.fichaPendiente));

  if (!cache) {
    const sinFoto = lista.filter((e) => e.fotoPendiente);
    console.info(
      `\nℹ️  Emprendedores: ${lista.length} desde ${CMS_URL ? `el panel (${CMS_URL})` : "el JSON del repositorio"}; ` +
        `${sinFoto.length} sin foto propia (se muestra un monograma).\n`,
    );
  }

  cache = { lista, hasta: Date.now() + 60_000 };
  return lista;
}

/**
 * Iniciales para el monograma de quien todavía no tiene foto propia, o null
 * si ya la tiene. Salen del nombre público (un nombre y un apellido), así que
 * no revelan nada que no esté ya en pantalla.
 */
export function inicialesSinFoto(e: Emprendedor): string | null {
  if (!e.fotoPendiente) return null;
  return e.nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toLocaleUpperCase("es"))
    .join("");
}

export async function getEmprendedor(slug: string): Promise<Emprendedor | null> {
  const todos = await getEmprendedores();
  return todos.find((e) => e.slug === slug) ?? null;
}
