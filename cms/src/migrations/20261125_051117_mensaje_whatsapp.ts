import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * EL MENSAJE DE WHATSAPP.
 *
 * 1. Cada persona puede llevar su propio mensaje (`mensajeWhatsapp` en su
 *    ficha). Vacío, va el general de "Textos y logos" > Ficha.
 *
 * 2. El mensaje general decía "la plataforma de Diseña Futuro" y se pidió
 *    "la plataforma de la Escuela de Emprendimiento". Cambió en
 *    `src/data/sitio.json`; aquí se cambia en un panel que ya estaba en
 *    marcha. Solo se toca el texto que sigue siendo el de partida, en lo
 *    publicado y en las versiones guardadas: si el cliente ya lo había
 *    reescrito, se respeta.
 */
const ANTES = '¡Hola {nombre}! Vi tu emprendimiento en la plataforma de Diseña Futuro y me gustaría saber más.'
const AHORA =
  '¡Hola {nombre}! Vi tu emprendimiento en la plataforma de la Escuela de Emprendimiento y me gustaría saber más.'

async function cambiarTexto({ db }: MigrateUpArgs | MigrateDownArgs, de: string, a: string) {
  await db.run(sql`UPDATE \`sitio\` SET \`ficha_mensaje_whatsapp\` = ${a} WHERE \`ficha_mensaje_whatsapp\` = ${de}`)
  await db.run(
    sql`UPDATE \`_sitio_v\` SET \`version_ficha_mensaje_whatsapp\` = ${a} WHERE \`version_ficha_mensaje_whatsapp\` = ${de}`,
  )
}

export async function up(args: MigrateUpArgs): Promise<void> {
  const { db } = args
  await db.run(sql`ALTER TABLE \`emprendedores\` ADD \`mensaje_whatsapp\` text;`)
  await db.run(sql`ALTER TABLE \`_emprendedores_v\` ADD \`version_mensaje_whatsapp\` text;`)
  await cambiarTexto(args, ANTES, AHORA)
}

export async function down(args: MigrateDownArgs): Promise<void> {
  const { db } = args
  await cambiarTexto(args, AHORA, ANTES)
  await db.run(sql`ALTER TABLE \`emprendedores\` DROP COLUMN \`mensaje_whatsapp\`;`)
  await db.run(sql`ALTER TABLE \`_emprendedores_v\` DROP COLUMN \`version_mensaje_whatsapp\`;`)
}
