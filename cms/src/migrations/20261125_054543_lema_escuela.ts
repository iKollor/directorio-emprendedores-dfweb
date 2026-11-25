import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * EL LEMA DE LA ESCUELA, AL PIE. "Ideas locales. Nuevas oportunidades." iba
 * al pie de la portada (Portada > Lema) y se quitó de allí al limpiarla.
 * Vuelve en el pie de página, bajo el logo de la escuela, con su propio campo
 * (Pie de página > Lema de la escuela).
 *
 * Se lleva lo que hubiera en el campo viejo, en lo publicado y en las
 * versiones guardadas: si el cliente lo había reescrito, se respeta.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`pie_lema_escuela\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_pie_lema_escuela\` text;`)
  await db.run(sql`UPDATE \`sitio\` SET \`pie_lema_escuela\` = \`portada_lema\` WHERE \`portada_lema\` IS NOT NULL`)
  await db.run(
    sql`UPDATE \`_sitio_v\` SET \`version_pie_lema_escuela\` = \`version_portada_lema\` WHERE \`version_portada_lema\` IS NOT NULL`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`pie_lema_escuela\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_pie_lema_escuela\`;`)
}
