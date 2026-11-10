/**
 * Motor de siluetas orgánicas.
 *
 * La versión anterior interpolaba entre 3 formas fijas y se notaba mecánica:
 * el blob "latía" siempre igual, ida y vuelta. Aquí cada vértice lleva sus
 * propios osciladores con frecuencias, amplitudes y fases distintas, y el
 * radio se evalúa en cada frame. Como las frecuencias no son múltiplos entre
 * sí, el ciclo no se repite de forma perceptible: se lee como líquido.
 *
 * Dos requisitos que mandan sobre el resto:
 *
 * 1. DETERMINISTA. La semilla es el slug, así que la silueta de una persona
 *    es idéntica en cada build y entre servidor y cliente. Sin esto, la forma
 *    saltaría al arrancar el JavaScript.
 *
 * 2. UNA SOLA FUNCIÓN DE PATH. `construirPath()` la usan igual el render del
 *    servidor (en t=0) y el bucle del navegador. No hay dos implementaciones
 *    que puedan divergir.
 */

const VIEWBOX = 100;
const CENTRO = VIEWBOX / 2;
const TAU = Math.PI * 2;

/** PRNG pequeño y estable. No hay Math.random en ningún punto de este módulo. */
function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Oscilador = { amp: number; vel: number; fase: number };
export type Vertice = { angulo: number; radio: number; osc: Oscilador[] };

/**
 * Ajuste afín que cuadra la silueta dentro del viewBox.
 *
 * Sin esto, una forma sembrada al azar puede salir alta y estrecha: recorta la
 * foto cuadrada de forma desigual y, con catorce blobs, unos rostros quedan
 * bien encuadrados y otros cortados. Con el encaje, todas las siluetas ocupan
 * la misma caja cuadrada, así que el recorte 1:1 es consistente.
 */
export type Encaje = { sx: number; sy: number; cx: number; cy: number };

export type SemillaBlob = {
  vertices: Vertice[];
  encaje: Encaje;
  /** Rotación base en grados. Ningún blob comparte ángulo con su vecino. */
  rotacion: number;
  /** Escala base 0.9–1. Rompe la regularidad de la grilla. */
  escala: number;
  viewBox: string;
};

/** Empuje del cursor, en el espacio local 0-100 del viewBox. */
export type Deformacion = {
  x: number;
  y: number;
  /** Cuánto se abulta la silueta hacia el cursor, en unidades de viewBox. */
  fuerza: number;
  /** Radio de influencia: más alto, deformación más ancha y suave. */
  alcance: number;
};

const redondear = (v: number) => Math.round(v * 100) / 100;

/**
 * Catmull-Rom cerrado convertido a curvas cúbicas.
 * Con tensión 1 los bordes quedan suaves y sin esquinas, que es lo que
 * distingue un blob de un polígono redondeado.
 */
function curvar(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  const en = (i: number) => pts[((i % n) + n) % n]!;

  let d = `M${redondear(en(0).x)},${redondear(en(0).y)}`;

  for (let i = 0; i < n; i++) {
    const p0 = en(i - 1);
    const p1 = en(i);
    const p2 = en(i + 1);
    const p3 = en(i + 2);

    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };

    d +=
      `C${redondear(c1.x)},${redondear(c1.y)} ` +
      `${redondear(c2.x)},${redondear(c2.y)} ` +
      `${redondear(p2.x)},${redondear(p2.y)}`;
  }

  return `${d}Z`;
}

/**
 * Silueta en el instante `t` (segundos), opcionalmente empujada por el cursor.
 *
 * El empuje se aplica sobre el radio de cada vértice con una caída gaussiana
 * según su distancia al cursor: los vértices cercanos salen hacia fuera y los
 * lejanos no se enteran. Como cada vértice se mueve por su propia dirección
 * radial, el resultado es un abultamiento hacia el puntero, no un
 * desplazamiento rígido de toda la forma.
 */
const ENCAJE_NEUTRO: Encaje = { sx: 1, sy: 1, cx: 0, cy: 0 };

/** Los puntos de control de la silueta en el instante `t`, en el viewBox 0-100. */
function puntosDe(
  vertices: Vertice[],
  t: number,
  deformacion: Deformacion | null | undefined,
  encaje: Encaje,
): { x: number; y: number }[] {
  return vertices.map((v) => {
    let radio = v.radio;

    for (const o of v.osc) radio += o.amp * Math.sin(o.vel * t + o.fase);

    const cos = Math.cos(v.angulo);
    const sen = Math.sin(v.angulo);

    if (deformacion && deformacion.fuerza !== 0) {
      const px = CENTRO + cos * radio;
      const py = CENTRO + sen * radio;
      const dx = px - deformacion.x;
      const dy = py - deformacion.y;
      const caida = (dx * dx + dy * dy) / (deformacion.alcance * deformacion.alcance);
      radio += deformacion.fuerza * Math.exp(-caida);
    }

    // El encaje se aplica al final, sobre el punto ya oscilado y deformado,
    // para que la silueta siga cuadrada en todo momento del ciclo.
    return {
      x: CENTRO + (cos * radio + encaje.cx) * encaje.sx,
      y: CENTRO + (sen * radio + encaje.cy) * encaje.sy,
    };
  });
}

export function construirPath(
  vertices: Vertice[],
  t: number,
  deformacion?: Deformacion | null,
  encaje: Encaje = ENCAJE_NEUTRO,
): string {
  return curvar(puntosDe(vertices, t, deformacion, encaje));
}

/**
 * EL CONTORNO, EN NÚMEROS, PARA EL SHADER.
 *
 * El material de los retratos (lib/tinta.ts) necesita saber a qué distancia
 * del borde está cada píxel para dibujar el volumen de la gota: refracción,
 * brillo y sombra nacen en el borde. El recorte de verdad lo sigue haciendo
 * el `clip-path` del SVG; esto es la misma silueta descrita como "radio en
 * cada dirección" desde el centro, que es lo que un shader consulta barato.
 *
 * Se recorre la misma curva que dibuja `construirPath` y se anota el radio en
 * `MUESTRAS` direcciones repartidas por igual. Vale porque estas siluetas son
 * casi convexas: desde el centro, cada dirección corta el borde una sola vez.
 *
 * Los radios van en unidades de la caja (0.5 = medio ancho) y la dirección 0
 * apunta a la izquierda (ángulo -π), avanzando en el sentido de `atan2`.
 */
export const MUESTRAS_CONTORNO = 64;

/** Contorno vigente de cada blob, escrito por blobRuntime en cada fotograma. */
export const CONTORNOS = new WeakMap<Element, Float32Array>();

const PASOS_POR_TRAMO = 7;
let angulos = new Float32Array(0);
let radios = new Float32Array(0);

export function muestrearContorno(
  vertices: Vertice[],
  t: number,
  encaje: Encaje,
  destino: Float32Array,
): void {
  const pts = puntosDe(vertices, t, null, encaje);
  const n = pts.length;
  const total = n * PASOS_POR_TRAMO;
  if (angulos.length !== total) {
    angulos = new Float32Array(total);
    radios = new Float32Array(total);
  }

  // La misma curva que `curvar`: Catmull-Rom cerrado, tramo a tramo.
  let k = 0;
  let menor = 0;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    for (let j = 0; j < PASOS_POR_TRAMO; j++) {
      const u = j / PASOS_POR_TRAMO;
      const v = 1 - u;
      const x = v * v * v * p1.x + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * p2.x - CENTRO;
      const y = v * v * v * p1.y + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * p2.y - CENTRO;
      angulos[k] = Math.atan2(y, x);
      radios[k] = Math.hypot(x, y) / VIEWBOX;
      if (angulos[k]! < angulos[menor]!) menor = k;
      k++;
    }
  }

  // Se recorre desde el ángulo más bajo, interpolando el radio entre las dos
  // muestras de la curva que rodean cada dirección pedida.
  const m = destino.length;
  let a = menor;
  let b = (menor + 1) % total;
  let angA = angulos[a]!;
  let angB = angulos[b]! > angA ? angulos[b]! : angulos[b]! + TAU;
  let vueltas = 0;
  // Se empieza por la primera dirección que queda después de esa muestra y
  // se da la vuelta completa: así los ángulos pedidos siempre crecen, igual
  // que los de la curva, y no hay que retroceder.
  const primera = Math.ceil(((angA + Math.PI) / TAU) * m - 0.5);
  for (let paso = primera; paso < primera + m; paso++) {
    const j = ((paso % m) + m) % m;
    const objetivo = -Math.PI + ((paso + 0.5) / m) * TAU;
    while (objetivo > angB && vueltas < total) {
      a = b;
      b = (b + 1) % total;
      angA = angB;
      let siguiente = angulos[b]!;
      while (siguiente < angA) siguiente += TAU;
      angB = siguiente;
      vueltas++;
    }
    const tramo = angB - angA;
    const f = tramo > 1e-6 ? Math.min(1, Math.max(0, (objetivo - angA) / tramo)) : 0;
    destino[j] = radios[a]! + (radios[b]! - radios[a]!) * f;
  }
}

/**
 * Calcula el encaje muestreando el ciclo completo de oscilación: hay que medir
 * la caja que la forma llega a ocupar en cualquier instante, no solo en t=0.
 */
function calcularEncaje(vertices: Vertice[], objetivo: number): Encaje {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let paso = 0; paso < 24; paso++) {
    const t = (paso / 24) * 30;
    for (const v of vertices) {
      let radio = v.radio;
      for (const o of v.osc) radio += o.amp * Math.sin(o.vel * t + o.fase);
      const x = Math.cos(v.angulo) * radio;
      const y = Math.sin(v.angulo) * radio;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return {
    // Centrar primero, escalar después: así la forma queda dentro del cuadrado
    // sin desplazarse hacia una esquina.
    cx: -(minX + maxX) / 2,
    cy: -(minY + maxY) / 2,
    sx: objetivo / (maxX - minX),
    sy: objetivo / (maxY - minY),
  };
}

export function generarBlob(
  semilla: string,
  // 8 lados con irregularidad contenida: lóbulos reconocibles pero sin picos.
  // Por encima de ~0.15 las siluetas empiezan a salir angulosas y desiguales;
  // por debajo de ~0.08 se vuelven óvalos y se pierde el concepto.
  // `lado` es el ancho final de la caja cuadrada dentro del viewBox 0-100.
  { lados = 8, irregularidad = 0.12, radio = 36, lado = 84 } = {},
): SemillaBlob {
  const rand = mulberry32(hash(semilla));
  const paso = TAU / lados;

  const vertices: Vertice[] = Array.from({ length: lados }, (_, i) => ({
    // Jitter angular además del radial: sin él los blobs parecen engranajes.
    // Contenido a 0.25 del paso para que no se junten dos vértices y salga
    // una punta.
    angulo: i * paso + (rand() - 0.5) * paso * 0.25,
    radio: radio * (1 + (rand() - 0.5) * 2 * irregularidad),
    // Dos ondas por vértice. La lenta y ancha da el vaivén general; la rápida
    // y pequeña, el detalle. Velocidades deliberadamente no proporcionales
    // entre sí para que el bucle no se perciba.
    osc: [
      { amp: radio * (0.035 + rand() * 0.03), vel: 0.19 + rand() * 0.13, fase: rand() * TAU },
      { amp: radio * (0.012 + rand() * 0.018), vel: 0.47 + rand() * 0.33, fase: rand() * TAU },
    ],
  }));

  // Toda la oscilación en reposo queda entre 0.8R y 1.2R: max/min <= 1.5.
  // Se conserva la semilla y se atenúan solo las ondas que saldrían del rango.
  for (const v of vertices) {
    v.radio = Math.min(radio * 1.2, Math.max(radio * .8, v.radio));
    const margen = Math.max(0, radio * .2 - Math.abs(v.radio - radio));
    const amplitud = v.osc.reduce((total, o) => total + o.amp, 0);
    if (amplitud > margen) for (const o of v.osc) o.amp *= margen / amplitud;
  }

  return {
    vertices,
    encaje: calcularEncaje(vertices, lado),
    rotacion: (rand() - 0.5) * 14,
    escala: 0.9 + rand() * 0.1,
    viewBox: `0 0 ${VIEWBOX} ${VIEWBOX}`,
  };
}
