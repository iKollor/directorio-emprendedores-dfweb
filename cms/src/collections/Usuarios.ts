import type { CollectionConfig } from 'payload'

/** Quién puede entrar al panel. Cada persona, con su correo y su contraseña. */
export const Usuarios: CollectionConfig = {
  slug: 'usuarios',
  labels: { singular: 'Usuario', plural: 'Usuarios' },
  admin: {
    useAsTitle: 'email',
    group: 'Ajustes',
    description: 'Personas que pueden entrar a este panel.',
  },
  auth: true,
  fields: [{ name: 'nombre', type: 'text', label: 'Nombre' }],
}
