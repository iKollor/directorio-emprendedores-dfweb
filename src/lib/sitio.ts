/**
 * TODO LO QUE EL SITIO DICE Y NO ES UNA FICHA: titulares, botones, el mensaje
 * de WhatsApp, las organizaciones con sus logos y el logo de la escuela. Es
 * el hermano de `directorio.ts`: ningún componente escribe estos textos por
 * su cuenta.
 *
 * Los de partida están en `src/data/sitio.json`. Con el panel en marcha
 * (`CMS_URL`) manda lo que el cliente haya escrito en "Textos y logos"; un
 * campo que deje vacío vuelve al de partida, así nunca queda un hueco.
 *
 * Los logos de partida son los archivos de `public/brand/` que nombra ese
 * JSON, con su medida. Con el panel mandan los subidos allí: una
 * organización sin logo sale con su nombre en texto, y si se quita el de la
 * escuela vuelve el de partida, como cualquier otro campo.
 */
import base from "../data/sitio.json";
import { nombrarPendiente } from "../data/taxonomia";
import { CMS_URL } from "./directorio";

type Base = typeof base;
type Textos = Omit<Base, "organizaciones" | "escuela">;

export type Logo = { src: string; width: number; height: number; remoto: boolean };
export type Organizacion = { nombre: string; url: string | null; logo: Logo | null };
export type Sitio = Textos & { organizaciones: Organizacion[]; logoEscuela: Logo | null };

/** Lo que entrega el panel: la misma forma, con cualquier campo quizá vacío. */
type MedioCms = { filename?: string | null; mimeType?: string | null; width?: number | null; height?: number | null };
type SitioCms = {
  [K in keyof Textos]?: Partial<Record<keyof Textos[K], unknown>> | null;
} & {
  organizaciones?: {
    logoEscuela?: MedioCms | number | null;
    lista?: { nombre?: string | null; url?: string | null; logo?: MedioCms | number | null }[] | null;
  } | null;
};

const lleno = (v: unknown) => (Array.isArray(v) ? v.some((x) => String(x).trim()) : typeof v === "string" && v.trim() !== "");

function mezclar(cms: SitioCms): Textos {
  const { organizaciones: _, escuela: __, ...textos } = base;
  const salida = structuredClone(textos) as Textos;
  for (const grupo of Object.keys(salida) as (keyof Textos)[]) {
    const propio = (cms[grupo] ?? {}) as Record<string, unknown>;
    const destino = salida[grupo] as Record<string, unknown>;
    for (const campo of Object.keys(destino)) {
      const valor = propio[campo];
      if (lleno(valor)) destino[campo] = Array.isArray(valor) ? valor.map((x) => String(x).trim()).filter(Boolean) : String(valor).trim();
    }
  }
  return salida;
}

/** Un logo subido al panel. Sin medida no se puede pintar sin que salte la página. */
function logoDelCms(medio: MedioCms | number | null | undefined): Logo | null {
  const m = typeof medio === "object" && medio ? medio : null;
  return m?.filename && m.mimeType?.startsWith("image/") && m.width && m.height
    ? { src: `${CMS_URL}/api/medios/file/${encodeURIComponent(m.filename)}`, width: m.width, height: m.height, remoto: true }
    : null;
}

/** Un logo de `public/brand/`, con la medida que le pone el JSON. */
function logoLocal(o: { logoArchivo: string | null; logoAncho?: number; logoAlto?: number }): Logo | null {
  return o.logoArchivo && o.logoAncho && o.logoAlto
    ? { src: `/brand/${o.logoArchivo}`, width: o.logoAncho, height: o.logoAlto, remoto: false }
    : null;
}

function organizacionesDelCms(cms: SitioCms): Organizacion[] {
  return (cms.organizaciones?.lista ?? [])
    .filter((o) => o.nombre?.trim())
    .map((o) => ({ nombre: o.nombre!.trim(), url: o.url?.trim() || null, logo: logoDelCms(o.logo) }));
}

function componer(cms: SitioCms | null): Sitio {
  const textos = cms ? mezclar(cms) : mezclar({});
  const propias = cms ? organizacionesDelCms(cms) : [];
  const sitio = {
    ...textos,
    organizaciones:
      propias.length > 0 ? propias : base.organizaciones.map((o) => ({ nombre: o.nombre, url: o.url, logo: logoLocal(o) })),
    logoEscuela: (cms && logoDelCms(cms.organizaciones?.logoEscuela)) || logoLocal(base.escuela),
  };
  nombrarPendiente(sitio.listado.proximamente);
  return sitio;
}

async function pedir(borrador: boolean, clave = ""): Promise<SitioCms> {
  const respuesta = await fetch(`${CMS_URL}/api/globals/sitio?depth=1${borrador ? "&draft=true" : ""}`, {
    headers: clave ? { "x-clave-vista-previa": clave } : undefined,
  });
  if (!respuesta.ok) throw new Error(`El panel respondió ${respuesta.status} al pedir los textos del sitio`);
  return (await respuesta.json()) as SitioCms;
}

let cache: { sitio: Sitio; hasta: number } | null = null;

/**
 * Los componentes pasan `Astro.locals`: en la vista previa lleva los textos
 * en borrador y se usan esos; en el resto, los publicados.
 */
export async function getSitio(locals?: App.Locals): Promise<Sitio> {
  if (locals?.sitio) return locals.sitio;
  if (cache && cache.hasta > Date.now()) return cache.sitio;
  const sitio = componer(CMS_URL ? await pedir(false) : null);
  cache = { sitio, hasta: Date.now() + 60_000 };
  return sitio;
}

/** VISTA PREVIA: los textos tal como están guardados en el panel. */
export async function getSitioBorrador(clave: string): Promise<Sitio | null> {
  if (!CMS_URL || !clave) return null;
  try {
    return componer(await pedir(true, clave));
  } catch {
    return null;
  }
}

/**
 * `Conoce a nuestros *emprendedores*` -> la parte entre asteriscos, destacada.
 * Es la manera de escribir en el panel el fino + grueso de los titulares.
 * Devuelve los trozos para que cada componente los pinte con su etiqueta
 * (así conservan sus estilos, que con HTML inyectado se perderían).
 */
export function trozos(texto: string): { texto: string; destacado: boolean }[] {
  return texto
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((t) => (/^\*[^*]+\*$/.test(t) ? { texto: t.slice(1, -1), destacado: true } : { texto: t, destacado: false }));
}

/** Cada línea escrita en el panel es una línea en el sitio. */
export const lineas = (texto: string) => texto.split(/\n+/).map((l) => l.trim()).filter(Boolean);

/** Cambia `{nombre}` por el nombre de la persona. */
export const conNombre = (texto: string, nombre: string) => texto.replaceAll("{nombre}", nombre);
