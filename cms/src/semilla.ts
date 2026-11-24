import fs from 'fs'
import path from 'path'
import type { Payload, PayloadRequest } from 'payload'

/**
 * PRIMER ARRANQUE. Con la base vacía, carga los emprendedores que ya estaban
 * en el JSON del sitio (`src/data/emprendedores.json`), sus fotos y sus
 * vídeos. Solo ocurre una vez: en cuanto hay un emprendedor, no vuelve a
 * hacer nada.
 */
type Crudo = {
  slug: string
  nombre: string
  nombrePublico?: string
  comunidad?: string
  categoria?: string
  emprendimiento?: string | null
  oficio?: string
  parrafos?: string[]
  resumen?: string
  foto?: string | null
  telefono?: string | null
  publicado?: boolean
  fichaPendiente?: boolean
  rostro?: { x: number; y: number }
}

/** Las categorías de partida: las claves del JSON, con su nombre y su color. */
const CATEGORIAS: Record<string, { nombre: string; color: string }> = {
  construccion: { nombre: 'Construcción y maquinaria', color: 'amarillo' },
  confeccion: { nombre: 'Confección y textil', color: 'verde' },
  belleza: { nombre: 'Belleza', color: 'rosa' },
  comercio: { nombre: 'Comercio y servicios', color: 'cian' },
  agropecuario: { nombre: 'Agropecuario', color: 'azul' },
}

type SitioJson = Record<string, unknown> & {
  organizaciones?: { nombre: string; url?: string; logoArchivo?: string | null }[]
  escuela?: { logoArchivo?: string | null }
}

/**
 * Sube al panel un logo de `public/brand`. En local los logos están en esa
 * carpeta; en el servidor, dentro de la imagen (`SEMILLA_DIR/brand`).
 * Desde una migración se pasa su `req`, para escribir en su transacción.
 */
export async function subirLogo(
  payload: Payload,
  raiz: string,
  nombre?: string | null,
  req?: PayloadRequest,
): Promise<number | undefined> {
  const archivo = nombre
    ? [path.join(raiz, 'brand', nombre), path.join(raiz, '..', 'public', 'brand', nombre)].find((ruta) =>
        fs.existsSync(ruta),
      )
    : undefined
  if (!archivo) return undefined
  return (await payload.create({ collection: 'medios', data: {}, filePath: archivo, req })).id as number
}

/**
 * Sube al panel el vídeo de presentación de una persona, si lo hay:
 * `assets/videos/<slug>.mp4` (o `.webm`), la misma convención del sitio.
 */
export async function subirVideo(
  payload: Payload,
  raiz: string,
  slug: string,
  req?: PayloadRequest,
): Promise<number | undefined> {
  const archivo = ['mp4', 'webm']
    .map((extension) => path.join(raiz, 'assets', 'videos', `${slug}.${extension}`))
    .find((ruta) => fs.existsSync(ruta))
  if (!archivo) return undefined
  return (await payload.create({ collection: 'medios', data: {}, filePath: archivo, req })).id as number
}

/**
 * Sube las versiones con sonido del vídeo de una persona, si las hay:
 * `assets/videos/sonido/<slug>-<alto>.mp4`, una por calidad.
 */
export async function subirVideosConSonido(
  payload: Payload,
  raiz: string,
  slug: string,
  req?: PayloadRequest,
): Promise<number[]> {
  const carpeta = path.join(raiz, 'assets', 'videos', 'sonido')
  if (!fs.existsSync(carpeta)) return []
  const ids: number[] = []
  for (const archivo of fs.readdirSync(carpeta).sort()) {
    const partes = /^(.+)-(\d{3,4})p?\.(mp4|webm)$/.exec(archivo)
    if (partes?.[1] !== slug) continue
    ids.push((await payload.create({ collection: 'medios', data: {}, filePath: path.join(carpeta, archivo), req })).id as number)
  }
  return ids
}

/** La carpeta de la semilla: `src` del sitio en local, `/semilla` en el servidor. */
export const raizSemilla = () => path.resolve(process.env.SEMILLA_DIR || '../src')

/** Los textos y logos de partida, desde `src/data/sitio.json`. */
async function sembrarSitio(payload: Payload, raiz: string) {
  const json = path.join(raiz, 'data', 'sitio.json')
  if (!fs.existsSync(json)) return
  const actual = await payload.findGlobal({ slug: 'sitio', draft: true })
  if (actual?.portada?.titular) return

  const { organizaciones = [], escuela, ...textos } = JSON.parse(fs.readFileSync(json, 'utf8')) as SitioJson
  const lista = []
  for (const org of organizaciones) {
    lista.push({ nombre: org.nombre, url: org.url, logo: await subirLogo(payload, raiz, org.logoArchivo) })
  }
  const logoEscuela = await subirLogo(payload, raiz, escuela?.logoArchivo)

  await payload.updateGlobal({
    slug: 'sitio',
    data: { ...textos, organizaciones: { logoEscuela, lista }, _status: 'published' } as never,
  })
  payload.logger.info('Primer arranque: textos y logos cargados.')
}

export async function sembrar(payload: Payload) {
  const raiz = raizSemilla()
  await sembrarSitio(payload, raiz)

  const { totalDocs } = await payload.count({ collection: 'emprendedores' })
  if (totalDocs > 0) return

  const categorias: Record<string, number> = {}
  if ((await payload.count({ collection: 'categorias' })).totalDocs === 0) {
    for (const [clave, datos] of Object.entries(CATEGORIAS)) {
      categorias[clave] = (await payload.create({ collection: 'categorias', data: datos as never })).id as number
    }
  }
  const json = path.join(raiz, 'data', 'emprendedores.json')
  if (!fs.existsSync(json)) return

  const crudos = JSON.parse(fs.readFileSync(json, 'utf8')) as Crudo[]
  payload.logger.info(`Primer arranque: cargando ${crudos.length} emprendedores desde ${json}`)

  for (const crudo of crudos) {
    let foto: number | undefined
    const archivo = crudo.foto ? path.join(raiz, 'assets', 'emprendedores', crudo.foto) : null
    if (archivo && fs.existsSync(archivo)) {
      const medio = await payload.create({
        collection: 'medios',
        data: {},
        filePath: archivo,
      })
      // El rostro del JSON (0 a 1) pasa a ser el punto focal (0 a 100).
      // Sin él, una cara en el tercio superior, que es lo habitual.
      await payload.update({
        collection: 'medios',
        id: medio.id,
        data: {
          focalX: Math.round((crudo.rostro?.x ?? 0.5) * 100),
          focalY: Math.round((crudo.rostro?.y ?? 0.34) * 100),
        },
      })
      foto = medio.id as number
    }

    const pendiente = Boolean(crudo.fichaPendiente)
    await payload.create({
      collection: 'emprendedores',
      draft: !crudo.publicado,
      data: {
        nombre: crudo.nombre,
        nombrePublico: crudo.nombrePublico,
        slug: crudo.slug,
        fichaPendiente: pendiente,
        comunidad: crudo.comunidad as never,
        categoria: pendiente ? undefined : categorias[crudo.categoria ?? ''],
        oficio: pendiente ? undefined : (crudo.oficio ?? crudo.emprendimiento ?? undefined),
        descripcion: pendiente ? undefined : (crudo.resumen ?? (crudo.parrafos ?? []).join('\n\n')),
        telefono: crudo.telefono ?? undefined,
        foto,
        video: pendiente ? undefined : await subirVideo(payload, raiz, crudo.slug),
        videoSonido: pendiente ? undefined : await subirVideosConSonido(payload, raiz, crudo.slug),
        _status: crudo.publicado ? 'published' : 'draft',
      },
    })
  }
  payload.logger.info('Primer arranque: emprendedores cargados.')
}
