import type { Field, GlobalConfig } from 'payload'

import { puedeVerBorradores, TAMANOS_VISTA_PREVIA, urlVistaPrevia } from '../acceso'
import { avisarPublicacion } from '../avisar'

/**
 * TODO LO QUE EL SITIO DICE Y NO ES UNA FICHA: titulares, textos, botones,
 * el mensaje de WhatsApp, los logos de las organizaciones y el de la escuela.
 *
 * Los textos de partida están en `src/data/sitio.json` del sitio, con la
 * misma forma que estos campos: el panel los carga en su primer arranque, y
 * el sitio vuelve a ellos si aquí se deja un campo vacío.
 */
const NEGRITA = 'Lo que pongas entre asteriscos sale destacado: "Conoce a nuestros *emprendedores*".'

const texto = (name: string, label: string, description?: string): Field => ({
  name,
  type: 'text',
  label,
  admin: description ? { description } : undefined,
})

const parrafo = (name: string, label: string, description?: string): Field => ({
  name,
  type: 'textarea',
  label,
  admin: { rows: 3, ...(description ? { description } : {}) },
})

export const Sitio: GlobalConfig = {
  slug: 'sitio',
  label: 'Textos y logos',
  admin: {
    description:
      'Lo que el sitio dice fuera de las fichas. Si dejas un campo vacío, vuelve el texto original.',
    livePreview: {
      url: () => urlVistaPrevia('portada'),
      breakpoints: TAMANOS_VISTA_PREVIA,
    },
  },
  versions: { drafts: { autosave: { interval: 800 } }, max: 20 },
  access: {
    // Lo publicado lo lee cualquiera; el borrador, solo el panel y la vista previa.
    read: ({ req }) => puedeVerBorradores(req) || req.query?.draft !== 'true',
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        if (doc?._status === 'published') avisarPublicacion()
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'portada',
          label: 'Portada',
          fields: [
            texto('titular', 'Titular', NEGRITA),
            parrafo('intro', 'Presentación', NEGRITA),
            texto('boton', 'Botón'),
            // La frase de cierre y el lema ya no salen en la portada: se pidió
            // dejarla limpia, con el titular, la presentación y el botón. Los
            // campos se quedan, escondidos, para no perder lo que hubiera escrito.
            { name: 'cierre', type: 'text', label: 'Frase de cierre', admin: { hidden: true } },
            { name: 'lema', type: 'text', label: 'Lema', admin: { hidden: true } },
            {
              name: 'palabras',
              type: 'text',
              hasMany: true,
              label: 'Palabras de la cinta',
              admin: { description: 'Las palabras grandes que cruzan la página al bajar. Escribe una y pulsa Intro.' },
            },
          ],
        },
        {
          name: 'organizaciones',
          label: 'Organizaciones y logos',
          fields: [
            {
              name: 'logoEscuela',
              type: 'upload',
              relationTo: 'medios',
              label: 'Logo de la Escuela de Emprendimiento',
              filterOptions: { mimeType: { contains: 'image' } },
              admin: {
                description:
                  'Sale en la portada, sobre el titular, y en el pie. PNG o WebP con fondo transparente, en su versión para fondo azul. Si lo quitas, vuelve el logo original.',
              },
            },
            {
              name: 'lista',
              type: 'array',
              label: 'Organizaciones',
              labels: { singular: 'Organización', plural: 'Organizaciones' },
              admin: {
                description:
                  'Salen en la cabecera y en el pie, en este orden. El logo de la primera lleva al inicio del sitio.',
              },
              fields: [
                { name: 'nombre', type: 'text', label: 'Nombre', required: true },
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'medios',
                  label: 'Logo',
                  filterOptions: { mimeType: { contains: 'image' } },
                  admin: {
                    description:
                      'PNG o WebP con fondo transparente, en su versión clara: va sobre el azul del sitio. Sin logo se muestra el nombre en texto.',
                  },
                },
                {
                  name: 'url',
                  type: 'text',
                  label: 'Sitio web',
                  admin: { placeholder: 'https://', description: 'Aparece en "Conoce más", en el pie. Opcional.' },
                  validate: (valor: unknown) =>
                    !valor || /^https?:\/\/\S+$/.test(String(valor)) ? true : 'Escribe la dirección completa, con https://',
                },
              ],
            },
          ],
        },
        {
          name: 'listado',
          label: 'Listado',
          fields: [
            texto('titular', 'Titular', NEGRITA),
            parrafo('bajada', 'Frase bajo el titular', 'Cada línea que escribas es una línea en el sitio.'),
            texto(
              'conocelo',
              'Llamada de cada tarjeta',
              'Sale en todas las fichas: escríbela sin género ("¡Conoce su negocio!"), no "¡Conócelo!" ni "¡Conócela!".',
            ),
            texto('proximamente', 'Etiqueta de quien aún no tiene ficha'),
            texto('notaProximamente', 'Nota de quien aún no tiene ficha'),
            texto('vacioTitulo', 'Sin resultados: titular'),
            texto('vacioTexto', 'Sin resultados: texto'),
            texto('vacioBoton', 'Sin resultados: botón'),
          ],
        },
        {
          name: 'ficha',
          label: 'Ficha',
          description: 'Los textos comunes a todas las fichas.',
          fields: [
            parrafo(
              'mensajeWhatsapp',
              'Mensaje de WhatsApp',
              'El mensaje que ya va escrito cuando alguien pulsa para contactar. {nombre} se cambia por el nombre de cada persona.',
            ),
            texto('sinNumero', 'Si no hay teléfono: aviso', '{nombre} se cambia por el nombre de cada persona.'),
            texto('sinNumeroBoton', 'Si no hay teléfono: botón'),
            texto('sinNumeroUrl', 'Si no hay teléfono: a dónde lleva el botón'),
            texto('tituloGaleria', 'Titular de las fotos de su trabajo'),
            texto('siguiente', 'Presentación de la siguiente persona'),
            texto('volver', 'Enlace para volver al listado'),
          ],
        },
        {
          name: 'pie',
          label: 'Pie de página',
          fields: [
            texto('lema', 'Lema', NEGRITA),
            parrafo('textoEscuela', 'Texto sobre la escuela'),
            texto('tituloEnlaces', 'Título de los enlaces'),
            texto('derechos', 'Línea final', 'Va después de "©" y el año.'),
          ],
        },
        {
          name: 'reproductor',
          label: 'Reproductor de vídeo',
          description:
            'El vídeo que se abre al pulsar un retrato. Casi todo son nombres que no se ven: los leen los lectores de pantalla.',
          fields: [
            texto('abrir', 'Botón del retrato', 'Escribe {nombre} donde va el nombre de la persona.'),
            texto('titulo', 'Nombre de la ventana', 'Escribe {nombre} donde va el nombre de la persona.'),
            {
              type: 'row',
              fields: [texto('reproducir', 'Reproducir'), texto('pausar', 'Pausar'), texto('cerrar', 'Cerrar')],
            },
            {
              type: 'row',
              fields: [texto('sonido', 'Activar el sonido'), texto('silenciar', 'Silenciar'), texto('volumen', 'Volumen')],
            },
            {
              type: 'row',
              fields: [
                texto('avance', 'Barra de avance'),
                texto('calidad', 'Calidad'),
                texto('auto', 'Calidad automática', 'Este sí se ve: es la primera opción de la lista de calidades.'),
              ],
            },
            {
              type: 'row',
              fields: [texto('completa', 'Pantalla completa'), texto('salirCompleta', 'Salir de pantalla completa')],
            },
          ],
        },
        {
          name: 'general',
          label: 'General',
          fields: [
            texto('tituloSitio', 'Título del sitio', 'El que se ve en la pestaña del navegador y al compartir.'),
            parrafo('descripcion', 'Descripción', 'La que muestran Google y las redes al compartir el sitio.'),
            {
              type: 'row',
              fields: [
                texto(
                  'escuelaLinea1',
                  'Nombre de la escuela, línea 1',
                  'El nombre es lo que lee un lector de pantalla en lugar del logo de la escuela.',
                ),
                texto('escuelaLinea2', 'Nombre de la escuela, línea 2'),
              ],
            },
            {
              type: 'row',
              fields: [texto('menuEmprendedores', 'Menú: listado'), texto('menuEscuela', 'Menú: la escuela')],
            },
          ],
        },
      ],
    },
  ],
}
