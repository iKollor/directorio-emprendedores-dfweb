import type { CollectionConfig } from 'payload'

import { avisarPublicacion } from '../avisar'

/**
 * Los colores son los de la marca Diseña Futuro. Cada uno tiene en el sitio
 * su variante oscura y su color de texto (`COLORES` en
 * `src/data/taxonomia.ts`): por eso se elige de una lista y no se escribe.
 */
export const COLORES = [
  { label: 'Amarillo', value: 'amarillo' },
  { label: 'Verde', value: 'verde' },
  { label: 'Rosa', value: 'rosa' },
  { label: 'Celeste', value: 'cian' },
  { label: 'Azul oscuro', value: 'azul' },
]

export const Categorias: CollectionConfig = {
  slug: 'categorias',
  labels: { singular: 'Categoría', plural: 'Categorías' },
  // El orden de la lista es el orden de los filtros del sitio.
  orderable: true,
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'color'],
    description:
      'Los tipos de negocio. Cada categoría es un filtro del listado y da su color al retrato. Arrastra las filas para ordenar los filtros.',
  },
  access: { read: () => true },
  hooks: {
    afterChange: [() => avisarPublicacion()],
    afterDelete: [() => avisarPublicacion()],
  },
  fields: [
    { name: 'nombre', type: 'text', label: 'Nombre', required: true },
    {
      name: 'color',
      type: 'select',
      label: 'Color',
      required: true,
      defaultValue: 'amarillo',
      options: COLORES,
      admin: { description: 'Uno de los colores de la marca.' },
    },
  ],
}
