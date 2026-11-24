import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * FUERA LA PESTAÑA "VÍDEOS" DE LOS TEXTOS. La franja "En sus propias
 * palabras" se quitó de la portada: el carrusel es ahora el del hero, con
 * las gotas girando alrededor del retrato grande, y su titular y su frase ya
 * no se usan en ningún sitio. Los vídeos de cada persona no se tocan: siguen
 * en su ficha.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`videos_titular\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`videos_bajada\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_videos_titular\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_videos_bajada\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`videos_titular\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`videos_bajada\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_videos_titular\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_videos_bajada\` text;`)
}
