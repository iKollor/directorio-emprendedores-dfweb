import type { CollectionConfig } from 'payload'

import { puedeVerBorradores, TAMANOS_VISTA_PREVIA, urlVistaPrevia } from '../acceso'
import { avisarPublicacion } from '../avisar'

const COMUNIDADES = ['Sabanilla', 'Los Lojas'].map((c) => ({ label: c, value: c }))

/** "Kerly Verónica Huacón" -> "kerly-veronica-huacon" */
export const aSlug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const soloFotos = { mimeType: { contains: 'image' } }
const soloVideos = { mimeType: { contains: 'video' } }

/** Lo que no aplica mientras la persona está en "Próximamente". */
const conFicha = (datos: Record<string, unknown>) => !datos?.fichaPendiente

export const Emprendedores: CollectionConfig = {
  slug: 'emprendedores',
  labels: { singular: 'Emprendedor', plural: 'Emprendedores' },
  // El orden de esta lista (se arrastra) es el orden en el sitio.
  orderable: true,
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'oficio', 'categoria', '_status'],
    description:
      'Cada persona del directorio. Arrastra las filas para cambiar el orden en que aparecen en el sitio.',
    livePreview: {
      url: ({ data }) => urlVistaPrevia(String(data.id)),
      breakpoints: TAMANOS_VISTA_PREVIA,
    },
  },
  versions: {
    // "Guardar borrador" no toca el sitio; "Publicar" sí. Se guarda solo
    // mientras se escribe, y así la vista previa va al día.
    drafts: { autosave: { interval: 800 } },
    maxPerDoc: 20,
  },
  access: {
    read: ({ req }) => (puedeVerBorradores(req) ? true : { _status: { equals: 'published' } }),
  },
  hooks: {
    afterChange: [
      ({ doc, previousDoc }) => {
        // Avisa al sitio solo si cambia lo que está publicado.
        if (doc?._status === 'published' || previousDoc?._status === 'published') avisarPublicacion()
      },
    ],
    afterDelete: [() => avisarPublicacion()],
  },
  fields: [
    {
      name: 'nombre',
      type: 'text',
      label: 'Nombre completo',
      required: true,
      admin: {
        description:
          'Por privacidad, en el sitio solo se muestra un nombre y un apellido. Con cuatro palabras se toman la primera y la tercera.',
      },
    },
    {
      name: 'nombrePublico',
      type: 'text',
      label: 'Nombre que se muestra',
      admin: {
        description: 'Solo si el nombre corto que sale en la vista previa no es el correcto. Ejemplo: "Kerly Huacón".',
      },
    },
    {
      name: 'fichaPendiente',
      type: 'checkbox',
      label: 'Próximamente',
      defaultValue: false,
      admin: {
        description:
          'Márcalo si la persona todavía no ha entregado los datos de su negocio. Aparece en el listado como "Próximamente", sin ficha ni contacto.',
      },
    },
    {
      name: 'categoria',
      type: 'relationship',
      relationTo: 'categorias',
      label: 'Categoría',
      admin: {
        condition: conFicha,
        description: 'Decide el color de su retrato y el filtro en el que aparece. Se pueden crear más en "Categorías".',
      },
      validate: (valor: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        valor || siblingData?.fichaPendiente ? true : 'Elige una categoría.',
    },
    {
      name: 'oficio',
      type: 'text',
      label: 'Oficio o negocio',
      admin: { condition: conFicha, description: 'Una línea corta. Ejemplo: "Construcción y remodelación".' },
      validate: (valor: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        valor || siblingData?.fichaPendiente ? true : 'Escribe a qué se dedica.',
    },
    {
      name: 'descripcion',
      type: 'textarea',
      label: 'Descripción',
      admin: {
        condition: conFicha,
        rows: 6,
        description: 'Qué ofrece, en dos o tres frases. Deja una línea en blanco para separar párrafos.',
      },
    },
    {
      name: 'telefono',
      type: 'text',
      label: 'Teléfono (WhatsApp)',
      admin: {
        condition: conFicha,
        placeholder: '+593 99 123 4567',
        description:
          'Con el código del país. El botón de WhatsApp de la ficha escribe a este número. Sin teléfono, la ficha invita a contactar con Diseña Futuro.',
      },
      validate: (valor: unknown) => {
        if (!valor) return true
        const cifras = String(valor).replace(/\D/g, '')
        return cifras.length >= 10 && cifras.length <= 15
          ? true
          : 'Escribe el número completo con el código del país, por ejemplo +593 99 123 4567.'
      },
    },
    {
      // El mensaje general se edita en "Textos y logos" > Ficha. Este es solo
      // para quien necesite otro (por ejemplo, para nombrar su negocio).
      name: 'mensajeWhatsapp',
      type: 'textarea',
      label: 'Mensaje de WhatsApp',
      admin: {
        condition: conFicha,
        rows: 3,
        placeholder: 'Vacío: el mensaje general',
        description:
          'Lo que ya va escrito cuando alguien pulsa para escribirle. Déjalo vacío para usar el mensaje general, que se cambia para todas las fichas en "Textos y logos" > Ficha. {nombre} se cambia por su nombre.',
      },
    },
    {
      name: 'foto',
      type: 'upload',
      relationTo: 'medios',
      label: 'Retrato',
      filterOptions: soloFotos,
      admin: {
        description:
          'Una foto donde se le vea bien la cara. Después de subirla, ábrela con "Editar imagen" y arrastra el punto hasta su rostro: el retrato se centra ahí. No subas fotos donde aparezcan menores de edad. Sin foto se muestran sus iniciales.',
      },
    },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'medios',
      label: 'Vídeo de presentación',
      filterOptions: soloVideos,
      admin: {
        condition: conFicha,
        description:
          'Opcional. El que se ve en su retrato, en silencio y en bucle. Vertical o cuadrado, MP4 y de menos de 8 MB. Que no se vean menores ni nada que permita ubicar el negocio o la vivienda (fachadas, letreros con dirección, placas).',
      },
    },
    {
      name: 'videoSonido',
      type: 'upload',
      relationTo: 'medios',
      hasMany: true,
      label: 'Vídeo con sonido (primer plano)',
      filterOptions: soloVideos,
      admin: {
        condition: conFicha,
        description:
          'Opcional. El mismo vídeo, entero y con sonido: es lo que se oye al pasar el puntero por el retrato y lo que se ve al pulsarlo. Debe durar lo mismo que el de arriba, para que el sonido vaya a la par. Puedes subirlo en varias calidades y el sitio deja elegir: termina cada nombre con su alto, por ejemplo "maria-1080.mp4", "maria-720.mp4" y "maria-480.mp4". Escucha el audio antes de subirlo: que no se digan direcciones ni teléfonos.',
      },
    },
    {
      name: 'galeria',
      type: 'upload',
      relationTo: 'medios',
      hasMany: true,
      label: 'Fotos de su trabajo',
      filterOptions: soloFotos,
      admin: {
        condition: conFicha,
        description:
          'Opcional. Productos o servicios, en el orden en que quieres que se vean. Que no se vean menores ni nada que permita ubicar el negocio o la vivienda.',
      },
    },
    {
      name: 'comunidad',
      type: 'select',
      label: 'Comunidad',
      options: COMUNIDADES,
      admin: {
        position: 'sidebar',
        description: 'Dato interno: por seguridad no se publica en el sitio.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Dirección de su ficha',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Se rellena sola a partir del nombre. Cambiarla rompe los enlaces que ya se hayan compartido.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim()) return aSlug(value)
            const base = (data?.nombrePublico as string) || (data?.nombre as string) || ''
            const partes = base.trim().split(/\s+/)
            // Igual que el nombre público: nombre y primer apellido.
            const corto = partes.length >= 4 ? `${partes[0]} ${partes[2]}` : partes.slice(0, 2).join(' ')
            return aSlug(corto) || undefined
          },
        ],
      },
    },
  ],
}
