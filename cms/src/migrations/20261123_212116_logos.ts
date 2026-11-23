import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'
import fs from 'fs'
import path from 'path'

import { raizSemilla, subirLogo } from '../semilla'

/**
 * EL LOGO DE LA ESCUELA Y EL DE INTERVALORES.
 *
 * Añade el campo "Logo de la Escuela de Emprendimiento" y, en un panel que
 * ya estaba en marcha, sube los dos logos que llegaron después de su primer
 * arranque: el de la escuela y el de Intervalores, que hasta ahora salía con
 * su nombre en texto. Con la base recién creada no hace falta: los carga la
 * semilla (`semilla.ts`).
 *
 * El `ON DELETE set null` está puesto a mano: el generador lo omite al
 * añadir una columna, y sin él no se podría borrar el logo de la lista de
 * archivos mientras estuviera en uso.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`sitio\` ADD \`organizaciones_logo_escuela_id\` integer REFERENCES medios(id) ON UPDATE no action ON DELETE set null;`)
  await db.run(sql`CREATE INDEX \`sitio_organizaciones_organizaciones_logo_escuela_idx\` ON \`sitio\` (\`organizaciones_logo_escuela_id\`);`)
  await db.run(sql`ALTER TABLE \`_sitio_v\` ADD \`version_organizaciones_logo_escuela_id\` integer REFERENCES medios(id) ON UPDATE no action ON DELETE set null;`)
  await db.run(sql`CREATE INDEX \`_sitio_v_version_organizaciones_version_organizaciones_l_idx\` ON \`_sitio_v\` (\`version_organizaciones_logo_escuela_id\`);`)

  try {
    await subirLogosNuevos({ db, payload, req })
  } catch (error) {
    // Sin los logos el panel funciona igual y se pueden subir a mano: que un
    // archivo que falte no impida arrancar.
    payload.logger.error({ err: error }, 'No se pudieron cargar los logos nuevos; súbelos desde "Textos y logos".')
  }
}

/** La organización que no tenía logo en el primer arranque. */
const SIN_LOGO_HASTA_AHORA = 'Intervalores'

async function subirLogosNuevos({ db, payload, req }: MigrateUpArgs) {
  const { rows: sembrado } = await db.run(sql`SELECT id FROM sitio LIMIT 1`)
  if (sembrado.length === 0) return

  const raiz = raizSemilla()
  const json = path.join(raiz, 'data', 'sitio.json')
  if (!fs.existsSync(json)) return
  const { organizaciones = [], escuela } = JSON.parse(fs.readFileSync(json, 'utf8')) as {
    organizaciones?: { nombre: string; logoArchivo?: string | null }[]
    escuela?: { logoArchivo?: string | null }
  }

  // Se escribe en lo publicado y en todas las versiones guardadas: así el
  // borrador que el cliente tenga a medias no se publica solo, ni borra el
  // logo cuando lo publique.
  const logoEscuela = await subirLogo(payload, raiz, escuela?.logoArchivo, req)
  if (logoEscuela) {
    await db.run(sql`UPDATE sitio SET organizaciones_logo_escuela_id = ${logoEscuela}`)
    await db.run(sql`UPDATE _sitio_v SET version_organizaciones_logo_escuela_id = ${logoEscuela}`)
  }

  // Solo si sigue sin logo: si ya le subieron uno, se respeta.
  const { rows: faltan } = await db.run(
    sql`SELECT id FROM sitio_organizaciones_lista WHERE nombre = ${SIN_LOGO_HASTA_AHORA} AND logo_id IS NULL`,
  )
  const archivo = organizaciones.find((o) => o.nombre === SIN_LOGO_HASTA_AHORA)?.logoArchivo
  const logo = faltan.length > 0 ? await subirLogo(payload, raiz, archivo, req) : undefined
  if (logo) {
    await db.run(
      sql`UPDATE sitio_organizaciones_lista SET logo_id = ${logo} WHERE nombre = ${SIN_LOGO_HASTA_AHORA} AND logo_id IS NULL`,
    )
    await db.run(
      sql`UPDATE _sitio_v_version_organizaciones_lista SET logo_id = ${logo} WHERE nombre = ${SIN_LOGO_HASTA_AHORA} AND logo_id IS NULL`,
    )
  }

  payload.logger.info(`Logos nuevos cargados: ${[logoEscuela && 'la escuela', logo && SIN_LOGO_HASTA_AHORA].filter(Boolean).join(' e ') || 'ninguno'}.`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_sitio\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`portada_titular\` text,
  	\`portada_intro\` text,
  	\`portada_cierre\` text,
  	\`portada_boton\` text,
  	\`portada_lema\` text,
  	\`listado_titular\` text,
  	\`listado_bajada\` text,
  	\`listado_conocelo\` text,
  	\`listado_proximamente\` text,
  	\`listado_nota_proximamente\` text,
  	\`listado_vacio_titulo\` text,
  	\`listado_vacio_texto\` text,
  	\`listado_vacio_boton\` text,
  	\`videos_titular\` text,
  	\`videos_bajada\` text,
  	\`ficha_mensaje_whatsapp\` text,
  	\`ficha_sin_numero\` text,
  	\`ficha_sin_numero_boton\` text,
  	\`ficha_sin_numero_url\` text,
  	\`ficha_titulo_galeria\` text,
  	\`ficha_siguiente\` text,
  	\`ficha_volver\` text,
  	\`pie_lema\` text,
  	\`pie_texto_escuela\` text,
  	\`pie_titulo_enlaces\` text,
  	\`pie_derechos\` text,
  	\`general_titulo_sitio\` text,
  	\`general_descripcion\` text,
  	\`general_escuela_linea1\` text,
  	\`general_escuela_linea2\` text,
  	\`general_menu_emprendedores\` text,
  	\`general_menu_escuela\` text,
  	\`_status\` text DEFAULT 'draft',
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_sitio\`("id", "portada_titular", "portada_intro", "portada_cierre", "portada_boton", "portada_lema", "listado_titular", "listado_bajada", "listado_conocelo", "listado_proximamente", "listado_nota_proximamente", "listado_vacio_titulo", "listado_vacio_texto", "listado_vacio_boton", "videos_titular", "videos_bajada", "ficha_mensaje_whatsapp", "ficha_sin_numero", "ficha_sin_numero_boton", "ficha_sin_numero_url", "ficha_titulo_galeria", "ficha_siguiente", "ficha_volver", "pie_lema", "pie_texto_escuela", "pie_titulo_enlaces", "pie_derechos", "general_titulo_sitio", "general_descripcion", "general_escuela_linea1", "general_escuela_linea2", "general_menu_emprendedores", "general_menu_escuela", "_status", "updated_at", "created_at") SELECT "id", "portada_titular", "portada_intro", "portada_cierre", "portada_boton", "portada_lema", "listado_titular", "listado_bajada", "listado_conocelo", "listado_proximamente", "listado_nota_proximamente", "listado_vacio_titulo", "listado_vacio_texto", "listado_vacio_boton", "videos_titular", "videos_bajada", "ficha_mensaje_whatsapp", "ficha_sin_numero", "ficha_sin_numero_boton", "ficha_sin_numero_url", "ficha_titulo_galeria", "ficha_siguiente", "ficha_volver", "pie_lema", "pie_texto_escuela", "pie_titulo_enlaces", "pie_derechos", "general_titulo_sitio", "general_descripcion", "general_escuela_linea1", "general_escuela_linea2", "general_menu_emprendedores", "general_menu_escuela", "_status", "updated_at", "created_at" FROM \`sitio\`;`)
  await db.run(sql`DROP TABLE \`sitio\`;`)
  await db.run(sql`ALTER TABLE \`__new_sitio\` RENAME TO \`sitio\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`sitio__status_idx\` ON \`sitio\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__sitio_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`version_portada_titular\` text,
  	\`version_portada_intro\` text,
  	\`version_portada_cierre\` text,
  	\`version_portada_boton\` text,
  	\`version_portada_lema\` text,
  	\`version_listado_titular\` text,
  	\`version_listado_bajada\` text,
  	\`version_listado_conocelo\` text,
  	\`version_listado_proximamente\` text,
  	\`version_listado_nota_proximamente\` text,
  	\`version_listado_vacio_titulo\` text,
  	\`version_listado_vacio_texto\` text,
  	\`version_listado_vacio_boton\` text,
  	\`version_videos_titular\` text,
  	\`version_videos_bajada\` text,
  	\`version_ficha_mensaje_whatsapp\` text,
  	\`version_ficha_sin_numero\` text,
  	\`version_ficha_sin_numero_boton\` text,
  	\`version_ficha_sin_numero_url\` text,
  	\`version_ficha_titulo_galeria\` text,
  	\`version_ficha_siguiente\` text,
  	\`version_ficha_volver\` text,
  	\`version_pie_lema\` text,
  	\`version_pie_texto_escuela\` text,
  	\`version_pie_titulo_enlaces\` text,
  	\`version_pie_derechos\` text,
  	\`version_general_titulo_sitio\` text,
  	\`version_general_descripcion\` text,
  	\`version_general_escuela_linea1\` text,
  	\`version_general_escuela_linea2\` text,
  	\`version_general_menu_emprendedores\` text,
  	\`version_general_menu_escuela\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer
  );
  `)
  await db.run(sql`INSERT INTO \`__new__sitio_v\`("id", "version_portada_titular", "version_portada_intro", "version_portada_cierre", "version_portada_boton", "version_portada_lema", "version_listado_titular", "version_listado_bajada", "version_listado_conocelo", "version_listado_proximamente", "version_listado_nota_proximamente", "version_listado_vacio_titulo", "version_listado_vacio_texto", "version_listado_vacio_boton", "version_videos_titular", "version_videos_bajada", "version_ficha_mensaje_whatsapp", "version_ficha_sin_numero", "version_ficha_sin_numero_boton", "version_ficha_sin_numero_url", "version_ficha_titulo_galeria", "version_ficha_siguiente", "version_ficha_volver", "version_pie_lema", "version_pie_texto_escuela", "version_pie_titulo_enlaces", "version_pie_derechos", "version_general_titulo_sitio", "version_general_descripcion", "version_general_escuela_linea1", "version_general_escuela_linea2", "version_general_menu_emprendedores", "version_general_menu_escuela", "version__status", "version_updated_at", "version_created_at", "created_at", "updated_at", "latest", "autosave") SELECT "id", "version_portada_titular", "version_portada_intro", "version_portada_cierre", "version_portada_boton", "version_portada_lema", "version_listado_titular", "version_listado_bajada", "version_listado_conocelo", "version_listado_proximamente", "version_listado_nota_proximamente", "version_listado_vacio_titulo", "version_listado_vacio_texto", "version_listado_vacio_boton", "version_videos_titular", "version_videos_bajada", "version_ficha_mensaje_whatsapp", "version_ficha_sin_numero", "version_ficha_sin_numero_boton", "version_ficha_sin_numero_url", "version_ficha_titulo_galeria", "version_ficha_siguiente", "version_ficha_volver", "version_pie_lema", "version_pie_texto_escuela", "version_pie_titulo_enlaces", "version_pie_derechos", "version_general_titulo_sitio", "version_general_descripcion", "version_general_escuela_linea1", "version_general_escuela_linea2", "version_general_menu_emprendedores", "version_general_menu_escuela", "version__status", "version_updated_at", "version_created_at", "created_at", "updated_at", "latest", "autosave" FROM \`_sitio_v\`;`)
  await db.run(sql`DROP TABLE \`_sitio_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__sitio_v\` RENAME TO \`_sitio_v\`;`)
  await db.run(sql`CREATE INDEX \`_sitio_v_version_version__status_idx\` ON \`_sitio_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_created_at_idx\` ON \`_sitio_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_updated_at_idx\` ON \`_sitio_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_latest_idx\` ON \`_sitio_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_autosave_idx\` ON \`_sitio_v\` (\`autosave\`);`)
}
