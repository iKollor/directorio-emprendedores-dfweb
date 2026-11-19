import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`emprendedores\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_order\` text,
  	\`nombre\` text,
  	\`nombre_publico\` text,
  	\`ficha_pendiente\` integer DEFAULT false,
  	\`categoria_id\` integer,
  	\`oficio\` text,
  	\`descripcion\` text,
  	\`telefono\` text,
  	\`foto_id\` integer,
  	\`video_id\` integer,
  	\`comunidad\` text,
  	\`slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`categoria_id\`) REFERENCES \`categorias\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`foto_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`video_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`emprendedores__order_idx\` ON \`emprendedores\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_categoria_idx\` ON \`emprendedores\` (\`categoria_id\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_foto_idx\` ON \`emprendedores\` (\`foto_id\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_video_idx\` ON \`emprendedores\` (\`video_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`emprendedores_slug_idx\` ON \`emprendedores\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_updated_at_idx\` ON \`emprendedores\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_created_at_idx\` ON \`emprendedores\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores__status_idx\` ON \`emprendedores\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`emprendedores_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`medios_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`emprendedores\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`medios_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`emprendedores_rels_order_idx\` ON \`emprendedores_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_rels_parent_idx\` ON \`emprendedores_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_rels_path_idx\` ON \`emprendedores_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`emprendedores_rels_medios_id_idx\` ON \`emprendedores_rels\` (\`medios_id\`);`)
  await db.run(sql`CREATE TABLE \`_emprendedores_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version__order\` text,
  	\`version_nombre\` text,
  	\`version_nombre_publico\` text,
  	\`version_ficha_pendiente\` integer DEFAULT false,
  	\`version_categoria_id\` integer,
  	\`version_oficio\` text,
  	\`version_descripcion\` text,
  	\`version_telefono\` text,
  	\`version_foto_id\` integer,
  	\`version_video_id\` integer,
  	\`version_comunidad\` text,
  	\`version_slug\` text,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`emprendedores\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_categoria_id\`) REFERENCES \`categorias\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_foto_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_video_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_parent_idx\` ON \`_emprendedores_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version__order_idx\` ON \`_emprendedores_v\` (\`version__order\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version_categoria_idx\` ON \`_emprendedores_v\` (\`version_categoria_id\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version_foto_idx\` ON \`_emprendedores_v\` (\`version_foto_id\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version_video_idx\` ON \`_emprendedores_v\` (\`version_video_id\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version_slug_idx\` ON \`_emprendedores_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version_updated_at_idx\` ON \`_emprendedores_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version_created_at_idx\` ON \`_emprendedores_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_version_version__status_idx\` ON \`_emprendedores_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_created_at_idx\` ON \`_emprendedores_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_updated_at_idx\` ON \`_emprendedores_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_latest_idx\` ON \`_emprendedores_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_autosave_idx\` ON \`_emprendedores_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_emprendedores_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`medios_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_emprendedores_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`medios_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_rels_order_idx\` ON \`_emprendedores_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_rels_parent_idx\` ON \`_emprendedores_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_rels_path_idx\` ON \`_emprendedores_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_emprendedores_v_rels_medios_id_idx\` ON \`_emprendedores_v_rels\` (\`medios_id\`);`)
  await db.run(sql`CREATE TABLE \`categorias\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_order\` text,
  	\`nombre\` text NOT NULL,
  	\`color\` text DEFAULT 'amarillo' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`categorias__order_idx\` ON \`categorias\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`categorias_updated_at_idx\` ON \`categorias\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`categorias_created_at_idx\` ON \`categorias\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`medios\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric
  );
  `)
  await db.run(sql`CREATE INDEX \`medios_updated_at_idx\` ON \`medios\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`medios_created_at_idx\` ON \`medios\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`medios_filename_idx\` ON \`medios\` (\`filename\`);`)
  await db.run(sql`CREATE TABLE \`usuarios_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`usuarios\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`usuarios_sessions_order_idx\` ON \`usuarios_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`usuarios_sessions_parent_id_idx\` ON \`usuarios_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`usuarios\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`usuarios_updated_at_idx\` ON \`usuarios\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`usuarios_created_at_idx\` ON \`usuarios\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`usuarios_email_idx\` ON \`usuarios\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`emprendedores_id\` integer,
  	\`categorias_id\` integer,
  	\`medios_id\` integer,
  	\`usuarios_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`emprendedores_id\`) REFERENCES \`emprendedores\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categorias_id\`) REFERENCES \`categorias\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`medios_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`usuarios_id\`) REFERENCES \`usuarios\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_emprendedores_id_idx\` ON \`payload_locked_documents_rels\` (\`emprendedores_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categorias_id_idx\` ON \`payload_locked_documents_rels\` (\`categorias_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_medios_id_idx\` ON \`payload_locked_documents_rels\` (\`medios_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_usuarios_id_idx\` ON \`payload_locked_documents_rels\` (\`usuarios_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`usuarios_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`usuarios_id\`) REFERENCES \`usuarios\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_usuarios_id_idx\` ON \`payload_preferences_rels\` (\`usuarios_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`sitio_organizaciones_lista\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`nombre\` text,
  	\`logo_id\` integer,
  	\`url\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`sitio\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sitio_organizaciones_lista_order_idx\` ON \`sitio_organizaciones_lista\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`sitio_organizaciones_lista_parent_id_idx\` ON \`sitio_organizaciones_lista\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`sitio_organizaciones_lista_logo_idx\` ON \`sitio_organizaciones_lista\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`sitio\` (
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
  await db.run(sql`CREATE INDEX \`sitio__status_idx\` ON \`sitio\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`sitio_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`sitio\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sitio_texts_order_parent\` ON \`sitio_texts\` (\`order\`,\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_sitio_v_version_organizaciones_lista\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text,
  	\`logo_id\` integer,
  	\`url\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`medios\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_sitio_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_sitio_v_version_organizaciones_lista_order_idx\` ON \`_sitio_v_version_organizaciones_lista\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_version_organizaciones_lista_parent_id_idx\` ON \`_sitio_v_version_organizaciones_lista\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_version_organizaciones_lista_logo_idx\` ON \`_sitio_v_version_organizaciones_lista\` (\`logo_id\`);`)
  await db.run(sql`CREATE TABLE \`_sitio_v\` (
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
  await db.run(sql`CREATE INDEX \`_sitio_v_version_version__status_idx\` ON \`_sitio_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_created_at_idx\` ON \`_sitio_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_updated_at_idx\` ON \`_sitio_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_latest_idx\` ON \`_sitio_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_sitio_v_autosave_idx\` ON \`_sitio_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`_sitio_v_texts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`text\` text,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_sitio_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_sitio_v_texts_order_parent\` ON \`_sitio_v_texts\` (\`order\`,\`parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`emprendedores\`;`)
  await db.run(sql`DROP TABLE \`emprendedores_rels\`;`)
  await db.run(sql`DROP TABLE \`_emprendedores_v\`;`)
  await db.run(sql`DROP TABLE \`_emprendedores_v_rels\`;`)
  await db.run(sql`DROP TABLE \`categorias\`;`)
  await db.run(sql`DROP TABLE \`medios\`;`)
  await db.run(sql`DROP TABLE \`usuarios_sessions\`;`)
  await db.run(sql`DROP TABLE \`usuarios\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`sitio_organizaciones_lista\`;`)
  await db.run(sql`DROP TABLE \`sitio\`;`)
  await db.run(sql`DROP TABLE \`sitio_texts\`;`)
  await db.run(sql`DROP TABLE \`_sitio_v_version_organizaciones_lista\`;`)
  await db.run(sql`DROP TABLE \`_sitio_v\`;`)
  await db.run(sql`DROP TABLE \`_sitio_v_texts\`;`)
}
