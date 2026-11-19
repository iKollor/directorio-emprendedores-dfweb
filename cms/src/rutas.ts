import path from 'path'

/** Carpeta con la base de datos y los archivos subidos (un solo volumen). */
export const DATOS_DIR = path.resolve(process.env.DATOS_DIR || './datos')
