import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_completa\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`reproductor_salir_completa\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_completa\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_reproductor_salir_completa\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_completa\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`reproductor_salir_completa\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_completa\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_reproductor_salir_completa\`;`)
}
