/**
 * Comunidades y categorías del directorio.
 *
 * El color no es decorativo: es el código con el que se lee el listado. Cada
 * categoría toma un color de la paleta de Diseña Futuro y lo mantiene en el
 * aro del blob, en la píldora de la ficha y en el filtro activo.
 */

/**
 * Los colores de la marca con los que se puede pintar una categoría. Cada
 * uno lleva su variante honda (para el blob viajero, que pasa por detrás de
 * texto) y el color de texto que pasa contraste encima: sobre amarillo, verde,
 * rosa y cian el blanco no llega, va tinta.
 *
 * En el panel se elige uno de estos por su nombre (`cms/.../Categorias.ts`).
 */
export const COLORES = {
  amarillo: { color: "var(--df-yellow)", colorHondo: "var(--df-yellow-hondo)", colorTexto: "var(--df-ink)" },
  verde: { color: "var(--df-green)", colorHondo: "var(--df-green-hondo)", colorTexto: "var(--df-ink)" },
  rosa: { color: "var(--df-pink)", colorHondo: "var(--df-pink-hondo)", colorTexto: "var(--df-ink)" },
  cian: { color: "var(--df-cyan)", colorHondo: "var(--df-cyan-hondo)", colorTexto: "var(--df-ink)" },
  azul: { color: "var(--df-blue-deep)", colorHondo: "var(--df-blue-deep)", colorTexto: "var(--df-bone)" },
} as const;

export type ClaveColor = keyof typeof COLORES;
export type Categoria = { etiqueta: string; color: string; colorHondo: string; colorTexto: string };
export type ClaveCategoria = string;

export const CATEGORIA_PENDIENTE: ClaveCategoria = "pendiente";

/**
 * Para quienes ya están en el programa pero aún no entregaron los datos de
 * su negocio. No es una categoría real: es un estado. Se muestra apagada y
 * no lleva filtro.
 */
const PENDIENTE: Categoria = {
  etiqueta: "Próximamente",
  color: "var(--df-bone)",
  colorHondo: "var(--df-blue-deep)",
  colorTexto: "var(--df-ink)",
};

/**
 * Las categorías de partida, las del JSON. Con el panel en marcha las
 * sustituyen las suyas: `registrarCategorias()`, desde lib/directorio.ts.
 */
let categorias = new Map<ClaveCategoria, Categoria>([
  ["construccion", { etiqueta: "Construcción y maquinaria", ...COLORES.amarillo }],
  ["confeccion", { etiqueta: "Confección y textil", ...COLORES.verde }],
  ["belleza", { etiqueta: "Belleza", ...COLORES.rosa }],
  ["comercio", { etiqueta: "Comercio y servicios", ...COLORES.cian }],
  ["agropecuario", { etiqueta: "Agropecuario", ...COLORES.azul }],
]);

let etiquetaPendiente = PENDIENTE.etiqueta;

/** El orden en que llegan es el orden de los filtros. */
export function registrarCategorias(lista: { clave: ClaveCategoria; etiqueta: string; color: string }[], sustituir = true) {
  if (sustituir) categorias = new Map();
  for (const c of lista) {
    categorias.set(c.clave, { etiqueta: c.etiqueta, ...(COLORES[c.color as ClaveColor] ?? COLORES.amarillo) });
  }
}

/** El texto de la etiqueta "Próximamente" se edita con los demás (lib/sitio.ts). */
export const nombrarPendiente = (etiqueta: string) => {
  etiquetaPendiente = etiqueta;
};

export const COMUNIDADES = ["Sabanilla", "Los Lojas"] as const;

/**
 * La comunidad de cada emprendedor NO se publica por ahora: dar la ubicación
 * los expone a extorsión ("vacunas"). El dato se conserva y la lógica de
 * filtros sigue intacta; para volver a mostrarla basta con poner `true`.
 * Con `false` no sale ni en el HTML: ni píldoras, ni filtros, ni atributos,
 * ni datos estructurados.
 */
export const MOSTRAR_COMUNIDAD = false;
export type Comunidad = (typeof COMUNIDADES)[number];

export const esClaveCategoria = (v: unknown): v is ClaveCategoria =>
  typeof v === "string" && (v === CATEGORIA_PENDIENTE || categorias.has(v));

export const esComunidad = (v: unknown): v is Comunidad =>
  typeof v === "string" && (COMUNIDADES as readonly string[]).includes(v);

export const categoria = (clave: ClaveCategoria): Categoria =>
  categorias.get(clave) ?? { ...PENDIENTE, etiqueta: etiquetaPendiente };

/** Categorías reales de negocio, sin el estado "pendiente", en su orden. */
export const clavesCategoriaReales = (): ClaveCategoria[] => [...categorias.keys()];
