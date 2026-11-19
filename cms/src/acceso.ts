import type { PayloadRequest } from 'payload'

/** El sitio pide borradores con esta clave; el panel, con la sesión. */
export const puedeVerBorradores = (req: PayloadRequest) => {
  if (req.user) return true
  const clave = process.env.CLAVE_VISTA_PREVIA
  return Boolean(clave) && req.headers.get('x-clave-vista-previa') === clave
}

const SITIO = () => process.env.SITIO_URL || 'http://localhost:4321'

/** Dirección de una página de vista previa del sitio. */
export const urlVistaPrevia = (ruta: string) =>
  `${SITIO()}/vista-previa/${ruta}/?clave=${encodeURIComponent(process.env.CLAVE_VISTA_PREVIA || '')}`

export const TAMANOS_VISTA_PREVIA = [
  { name: 'movil', label: 'Móvil', width: 390, height: 844 },
  { name: 'ordenador', label: 'Ordenador', width: 1440, height: 900 },
]
