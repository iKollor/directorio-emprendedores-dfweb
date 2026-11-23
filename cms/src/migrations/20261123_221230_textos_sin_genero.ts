import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * TEXTOS SIN GÉNERO. Dos textos de partida hablaban de una persona en
 * masculino y salían también en las fichas de mujeres. Cambiaron en
 * `src/data/sitio.json`; aquí se cambian en un panel que ya estaba en marcha.
 *
 * Solo se toca el texto que sigue siendo el de partida, en lo publicado y en
 * las versiones guardadas: si el cliente ya lo había reescrito, se respeta.
 */
const CAMBIOS = [
  { columna: 'listado_conocelo', antes: '¡Conócelo!', ahora: '¡Conoce su negocio!' },
  { columna: 'videos_bajada', antes: 'Conoce a cada emprendedor en video.', ahora: 'Conoce cada historia en video.' },
]

async function cambiar({ db }: MigrateUpArgs | MigrateDownArgs, de: 'antes' | 'ahora', a: 'antes' | 'ahora') {
  for (const cambio of CAMBIOS) {
    await db.run(
      sql`UPDATE sitio SET ${sql.identifier(cambio.columna)} = ${cambio[a]} WHERE ${sql.identifier(cambio.columna)} = ${cambio[de]}`,
    )
    await db.run(
      sql`UPDATE _sitio_v SET ${sql.identifier(`version_${cambio.columna}`)} = ${cambio[a]} WHERE ${sql.identifier(`version_${cambio.columna}`)} = ${cambio[de]}`,
    )
  }
}

export async function up(args: MigrateUpArgs): Promise<void> {
  await cambiar(args, 'antes', 'ahora')
}

export async function down(args: MigrateDownArgs): Promise<void> {
  await cambiar(args, 'ahora', 'antes')
}
