import type { CollectionConfig } from 'payload'
import path from 'path'

import { DATOS_DIR } from '../rutas'

/**
 * Fotos, vídeos y logos. Se suben desde la ficha de cada emprendedor o
 * desde los textos del sitio; esta lista solo hace falta para borrar lo que
 * ya no se usa.
 *
 * El "punto focal" de cada foto es el rostro: el sitio centra el retrato ahí
 * (campo `rostro` del adaptador, `src/lib/directorio.ts`).
 */
export const Medios: CollectionConfig = {
  slug: 'medios',
  labels: { singular: 'Archivo', plural: 'Fotos, vídeos y logos' },
  admin: {
    group: 'Ajustes',
    description: 'Todo lo que se ha subido. Las fotos y vídeos se añaden desde la ficha de cada emprendedor.',
  },
  access: {
    // El sitio necesita descargar los archivos sin iniciar sesión.
    read: () => true,
  },
  upload: {
    staticDir: path.resolve(DATOS_DIR, 'medios'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
    // Las fotos llegan del móvil o de la cámara en 4-6 MB: se guardan ya
    // acotadas. El sitio genera después sus propios tamaños.
    resizeOptions: { width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true },
    focalPoint: true,
    crop: true,
    adminThumbnail: ({ doc }) =>
      typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/') ? (doc.url as string) : null,
  },
  fields: [],
}
