import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * EL BOTÓN DE VOLVER AL INICIO DEL REPRODUCTOR: su nombre (lo oyen los
 * lectores de pantalla), en Textos y logos > Reproductor de vídeo. Vacío, va
 * el de partida ("Volver al inicio").
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_reiniciar\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_reiniciar\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_reiniciar\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_reiniciar\`;`)
}
