/**
 * El sitio público es estático: lo publicado no se ve hasta que se vuelve a
 * construir. Al publicar, se avisa al servidor de despliegue para que lo haga.
 * Varias ediciones seguidas dan un solo aviso.
 */
let espera: ReturnType<typeof setTimeout> | null = null

export function avisarPublicacion() {
  const url = process.env.AVISO_PUBLICAR_URL
  if (!url) return
  if (espera) clearTimeout(espera)
  espera = setTimeout(async () => {
    espera = null
    try {
      const autorizacion = process.env.AVISO_PUBLICAR_AUTORIZACION
      const respuesta = await fetch(url, {
        method: process.env.AVISO_PUBLICAR_METODO || 'POST',
        headers: autorizacion ? { Authorization: autorizacion } : undefined,
      })
      if (!respuesta.ok) console.error(`[cms] El aviso de publicación respondió ${respuesta.status}`)
    } catch (error) {
      console.error('[cms] No se pudo avisar de la publicación:', error)
    }
  }, 15_000)
}
