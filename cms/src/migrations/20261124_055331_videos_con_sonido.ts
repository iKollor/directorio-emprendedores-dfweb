import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
import fs from 'fs'
import path from 'path'

import { raizSemilla, subirVideosConSonido } from '../semilla'

/**
 * EL REPRODUCTOR Y LOS VÍDEOS CON SONIDO.
 *
 * Añade a "Textos y logos" la pestaña del reproductor (columnas nuevas, vacías:
 * el sitio usa los textos de partida hasta que se escriban otros).
 *
 * El campo "Vídeo con sonido" de cada ficha no necesita tabla: usa la de
 * relaciones que ya tenía la galería. En un panel que ya estaba en marcha,
 * sube las versiones de `src/assets/videos/sonido/<slug>-<alto>.mp4` a la
 * ficha de cada persona que todavía no tenga ninguna. Con la base recién
 * creada no hace nada: las carga la semilla (`semilla.ts`).
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_abrir\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_titulo\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_reproducir\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_pausar\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_cerrar\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_sonido\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_silenciar\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_volumen\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_avance\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_calidad\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_auto\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_abrir\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_titulo\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_reproducir\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_pausar\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_cerrar\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_sonido\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_silenciar\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_volumen\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_avance\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_calidad\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_auto\` text;`)

  try {
    await subirVideosNuevos({ db, payload, req })
  } catch (error) {
    // Sin ellos el panel funciona igual y se pueden subir a mano desde cada
    // ficha: que un archivo que falte no impida arrancar.
    payload.logger.error({ err: error }, 'No se pudieron cargar los vídeos con sonido; súbelos desde cada ficha.')
  }
}

async function subirVideosNuevos({ db, payload, req }: MigrateUpArgs) {
  const raiz = raizSemilla()
  const carpeta = path.join(raiz, 'assets', 'videos', 'sonido')
  if (!fs.existsSync(carpeta)) return

  const slugs = new Set<string>()
  for (const archivo of fs.readdirSync(carpeta)) {
    const slug = /^(.+)-(\d{3,4})p?\.(mp4|webm)$/.exec(archivo)?.[1]
    if (slug) slugs.add(slug)
  }

  const cargados: string[] = []
  for (const slug of [...slugs].sort()) {
    // Solo quien tiene ficha y sigue sin vídeo con sonido: si ya le subieron
    // alguno, se respeta.
    const { rows } = await db.run(
      sql`SELECT id FROM emprendedores WHERE slug = ${slug} AND (ficha_pendiente IS NULL OR ficha_pendiente = 0)
          AND NOT EXISTS (SELECT 1 FROM emprendedores_rels r WHERE r.parent_id = emprendedores.id AND r.path = 'videoSonido')`,
    )
    const id = rows[0]?.id as number | undefined
    if (!id) continue

    const videos = await subirVideosConSonido(payload, raiz, slug, req)
    if (videos.length === 0) continue

    // En lo publicado y en las versiones guardadas: así el borrador que el
    // cliente tenga a medias no se publica solo, ni los quita al publicarlo.
    const versiones = await db.run(
      sql`SELECT id FROM _emprendedores_v v WHERE v.parent_id = ${id}
          AND NOT EXISTS (SELECT 1 FROM _emprendedores_v_rels r WHERE r.parent_id = v.id AND r.path = 'version.videoSonido')`,
    )
    for (const [orden, video] of videos.entries()) {
      await db.run(
        sql`INSERT INTO emprendedores_rels ("order", parent_id, path, medios_id) VALUES (${orden + 1}, ${id}, 'videoSonido', ${video})`,
      )
      for (const version of versiones.rows) {
        await db.run(
          sql`INSERT INTO _emprendedores_v_rels ("order", parent_id, path, medios_id) VALUES (${orden + 1}, ${version.id as number}, 'version.videoSonido', ${video})`,
        )
      }
    }
    cargados.push(slug)
  }

  if (cargados.length > 0) payload.logger.info(`Vídeos con sonido cargados: ${cargados.join(', ')}.`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_abrir\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_titulo\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_reproducir\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_pausar\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_cerrar\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_sonido\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_silenciar\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_volumen\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_avance\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_calidad\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_auto\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_abrir\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_titulo\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_reproducir\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_pausar\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_cerrar\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_sonido\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_silenciar\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_volumen\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_avance\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_calidad\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_auto\`;`)
}
