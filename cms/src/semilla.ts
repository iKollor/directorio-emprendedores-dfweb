import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

/**
 * PRIMER ARRANQUE. Con la base vacía, carga los emprendedores que ya estaban
 * en el JSON del sitio (`src/data/emprendedores.json`) y sus fotos. Solo
 * ocurre una vez: en cuanto hay un emprendedor, no vuelve a hacer nada.
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

export async function sembrar(payload: Payload) {
  const { totalDocs } = await payload.count({ collection: 'emprendedores' })
  if (totalDocs > 0) return

  const raiz = path.resolve(process.env.SEMILLA_DIR || '../src')
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
        categoria: (pendiente ? undefined : crudo.categoria) as never,
        oficio: pendiente ? undefined : (crudo.oficio ?? crudo.emprendimiento ?? undefined),
        descripcion: pendiente ? undefined : (crudo.resumen ?? (crudo.parrafos ?? []).join('\n\n')),
        telefono: crudo.telefono ?? undefined,
        foto,
        _status: crudo.publicado ? 'published' : 'draft',
      },
    })
  }
  payload.logger.info('Primer arranque: emprendedores cargados.')
}
