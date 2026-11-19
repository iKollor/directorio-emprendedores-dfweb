import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { es } from '@payloadcms/translations/languages/es'
import fs from 'fs'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Emprendedores } from './collections/Emprendedores'
import { Medios } from './collections/Medios'
import { Usuarios } from './collections/Usuarios'
import { migrations } from './migrations'
import { DATOS_DIR } from './rutas'
import { sembrar } from './semilla'

const dirname = path.dirname(fileURLToPath(import.meta.url))

fs.mkdirSync(DATOS_DIR, { recursive: true })

const SITIO = process.env.SITIO_URL || 'http://localhost:4321'
const PANEL = process.env.CMS_URL_PUBLICA || 'http://localhost:3000'

export default buildConfig({
  admin: {
    user: Usuarios.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Directorio de Emprendedores' },
    dateFormat: 'd MMM yyyy, HH:mm',
  },
  // El panel, solo en español.
  i18n: { supportedLanguages: { es }, fallbackLanguage: 'es' },
  collections: [Emprendedores, Medios, Usuarios],
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.CMS_URL_PUBLICA || undefined,
  cors: [SITIO, PANEL],
  csrf: [SITIO, PANEL],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // SQLite: la base es un archivo. No hay servidor de base de datos que
  // mantener ni que ocupe memoria en la VM.
  db: sqliteAdapter({
    client: { url: `file:${path.join(DATOS_DIR, 'cms.db')}` },
    // En el servidor las tablas se crean y se actualizan al arrancar, con
    // las migraciones de `src/migrations`. Tras cambiar un campo hay que
    // generar la suya: `npm run payload migrate:create`.
    prodMigrations: migrations,
  }),
  sharp,
  graphQL: { disable: true },
  telemetry: false,
  onInit: sembrar,
})
