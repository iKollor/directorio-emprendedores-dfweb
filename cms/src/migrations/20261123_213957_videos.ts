import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
import fs from 'fs'
import path from 'path'

import { raizSemilla, subirVideo } from '../semilla'

/**
 * LOS VÍDEOS DE PRESENTACIÓN QUE LLEGARON DESPUÉS DEL PRIMER ARRANQUE.
 *
 * No cambia ninguna tabla. En un panel que ya estaba en marcha, sube los
 * vídeos de `src/assets/videos/<slug>.mp4` a la ficha de cada persona que
 * todavía no tenga vídeo. Con la base recién creada no hace nada: los carga
 * la semilla (`semilla.ts`).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  try {
    await subirVideosNuevos({ db, payload, req })
  } catch (error) {
    // Sin los vídeos el panel funciona igual y se pueden subir a mano desde
    // cada ficha: que un archivo que falte no impida arrancar.
    payload.logger.error({ err: error }, 'No se pudieron cargar los vídeos nuevos; súbelos desde cada ficha.')
  }
}

async function subirVideosNuevos({ db, payload, req }: MigrateUpArgs) {
  const raiz = raizSemilla()
  const carpeta = path.join(raiz, 'assets', 'videos')
  if (!fs.existsSync(carpeta)) return

  const cargados: string[] = []
  for (const archivo of fs.readdirSync(carpeta).sort()) {
    const slug = /^(.+)\.(mp4|webm)$/.exec(archivo)?.[1]
    if (!slug) continue

    // Solo quien tiene ficha y sigue sin vídeo: si ya le subieron uno, se respeta.
    const { rows } = await db.run(
      sql`SELECT id FROM emprendedores WHERE slug = ${slug} AND video_id IS NULL AND (ficha_pendiente IS NULL OR ficha_pendiente = 0)`,
    )
    const id = rows[0]?.id as number | undefined
    if (!id) continue

    const video = await subirVideo(payload, raiz, slug, req)
    if (!video) continue

    // En lo publicado y en las versiones guardadas: así el borrador que el
    // cliente tenga a medias no se publica solo, ni quita el vídeo al publicarlo.
    await db.run(sql`UPDATE emprendedores SET video_id = ${video} WHERE id = ${id}`)
    await db.run(
      sql`UPDATE _emprendedores_v SET version_video_id = ${video} WHERE parent_id = ${id} AND version_video_id IS NULL`,
    )
    cargados.push(slug)
  }

  if (cargados.length > 0) payload.logger.info(`Vídeos nuevos cargados: ${cargados.join(', ')}.`)
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Los vídeos subidos se quedan: se quitan desde cada ficha.
}
