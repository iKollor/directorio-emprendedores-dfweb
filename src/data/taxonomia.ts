/**
 * Comunidades y categorías del directorio.
 *
 * El color no es decorativo: es el código con el que se lee el listado. Cada
 * categoría toma un color de la paleta de Diseña Futuro y lo mantiene en el
 * aro del blob, en la píldora de la ficha y en el filtro activo.
 */

export const CATEGORIAS = {
  construccion: {
    /* Variante para el blob viajero, que pasa por detrás de texto. */
    colorHondo: "var(--df-yellow-hondo)",
    etiqueta: "Construcción y maquinaria",
    color: "var(--df-yellow)",
    // Sobre amarillo y cyan el texto blanco no pasa contraste: va tinta.
    colorTexto: "var(--df-ink)",
  },
  confeccion: {
    /* Variante para el blob viajero, que pasa por detrás de texto. */
    colorHondo: "var(--df-green-hondo)",
    etiqueta: "Confección y textil",
    color: "var(--df-green)",
    colorTexto: "var(--df-ink)",
  },
  belleza: {
    /* Variante para el blob viajero, que pasa por detrás de texto. */
    colorHondo: "var(--df-pink-hondo)",
    etiqueta: "Belleza",
    color: "var(--df-pink)",
    colorTexto: "var(--df-ink)",
  },
  comercio: {
    /* Variante para el blob viajero, que pasa por detrás de texto. */
    colorHondo: "var(--df-cyan-hondo)",
    etiqueta: "Comercio y servicios",
    color: "var(--df-cyan)",
    colorTexto: "var(--df-ink)",
  },
  agropecuario: {
    /* Variante para el blob viajero, que pasa por detrás de texto. */
    colorHondo: "var(--df-blue-deep)",
    etiqueta: "Agropecuario",
    color: "var(--df-blue-deep)",
    colorTexto: "var(--df-bone)",
  },
  /**
   * Para quienes ya están en el programa pero aún no entregaron los datos de
   * su negocio. No es una categoría real: es un estado. Se muestra apagada y
   * queda al final de los filtros.
   */
  pendiente: {
    /* Variante para el blob viajero, que pasa por detrás de texto. */
    colorHondo: "var(--df-blue-deep)",
    etiqueta: "Ficha en preparación",
    color: "var(--df-bone)",
    colorTexto: "var(--df-ink)",
  },
} as const;

export type ClaveCategoria = keyof typeof CATEGORIAS;

export const COMUNIDADES = ["Sabanilla", "Los Lojas"] as const;
export type Comunidad = (typeof COMUNIDADES)[number];

export const esClaveCategoria = (v: unknown): v is ClaveCategoria =>
  typeof v === "string" && v in CATEGORIAS;

export const esComunidad = (v: unknown): v is Comunidad =>
  typeof v === "string" && (COMUNIDADES as readonly string[]).includes(v);

export const categoria = (clave: ClaveCategoria) => CATEGORIAS[clave];

export const CATEGORIA_PENDIENTE: ClaveCategoria = "pendiente";

/** Orden estable de los filtros, independiente del orden de los datos. */
export const CLAVES_CATEGORIA = Object.keys(CATEGORIAS) as ClaveCategoria[];

/** Categorías reales de negocio, sin el estado "pendiente". */
export const CLAVES_CATEGORIA_REALES = CLAVES_CATEGORIA.filter(
  (c) => c !== CATEGORIA_PENDIENTE,
);
