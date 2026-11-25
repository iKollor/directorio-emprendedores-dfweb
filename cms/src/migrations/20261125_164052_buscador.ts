import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * EL BUSCADOR DEL LISTADO.
 *
 * 1. Dos textos nuevos en Textos y logos > Listado: el de ayuda del campo de
 *    búsqueda y el nombre del botón de borrar (solo para lectores de pantalla).
 *
 * 2. El aviso de "sin resultados" decía "Prueba otra categoría para conocer
 *    más negocios."; ahora que también se busca por palabras, dice "Prueba
 *    con otra palabra o categoría.". Solo se toca si sigue siendo el texto de
 *    partida, en lo publicado y en las versiones guardadas: si el cliente lo
 *    había reescrito, se respeta.
 */
const ANTES = 'Prueba otra categoría para conocer más negocios.'
const AHORA = 'Prueba con otra palabra o categoría.'

async function cambiarAviso({ db }: MigrateUpArgs | MigrateDownArgs, de: string, a: string) {
  await db.run(sql`UPDATE \`sitio\` SET \`listado_vacio_texto\` = ${a} WHERE \`listado_vacio_texto\` = ${de}`)
  await db.run(
    sql`UPDATE \`_sitio_v\` SET \`version_listado_vacio_texto\` = ${a} WHERE \`version_listado_vacio_texto\` = ${de}`,
  )
}

export async function up(args: MigrateUpArgs): Promise<void> {
  const { db } = args
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`listado_buscar\` text;`)
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`listado_borrar_busqueda\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_listado_buscar\` text;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_listado_borrar_busqueda\` text;`)
  await cambiarAviso(args, ANTES, AHORA)
}

export async function down(args: MigrateDownArgs): Promise<void> {
  const { db } = args
  await cambiarAviso(args, AHORA, ANTES)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`listado_buscar\`;`)
  await db.run(sql`ALTER TABLE \`sitio\` DROP COLUMN \`listado_borrar_busqueda\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_listado_buscar\`;`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` DROP COLUMN \`version_listado_borrar_busqueda\`;`)
}
