/**
 * Bucle de animación de los blobs, en el navegador.
 *
 * Decisiones que importan para el rendimiento:
 *
 * - UN SOLO requestAnimationFrame para todos los blobs. Un rAF por blob
 *   multiplicaría el coste y desincronizaría los relojes entre sí.
 *   No se usa el ticker de GSAP a propósito: GSAP duerme el suyo cuando no hay
 *   tweens activos, y este bucle tiene que correr aunque no haya ninguno.
 *
 * - SOLO LOS VISIBLES. Un IntersectionObserver marca cuáles están en pantalla;
 *   el resto ni se evalúa. Con la grilla de 1-2 columnas eso son 1 o 2 blobs
 *   animándose a la vez, aunque haya catorce en la página.
 *
 * - UNA ESCRITURA POR BLOB Y FRAME: el `d` del recorte. Nada de estilos. La
 *   única lectura de layout es la caja del blob, y solo mientras el puntero
 *   está en la página (hace falta para saber dónde cae sobre él).
 */

import {
  AGITADOS,
  CONTORNOS,
  MUESTRAS_CONTORNO,
  construirPath,
  muestrearContorno,
  situarVertices,
  type Encaje,
  type Vertice,
} from "./blob";

/*
 * LA GOTA Y EL PUNTERO.
 *
 * La silueta se comporta como una gota de líquido cuando el puntero se le
 * acerca. Solo se mueve el BORDE: la foto de dentro no se deforma.
 *
 *   - TENSIÓN: el tramo de borde más cercano se estira hacia el puntero, por
 *     fuera o por dentro, como la superficie de una gota al tocarla. En el
 *     centro del retrato el puntero queda lejos de todo el borde: no pasa nada.
 *   - VOLUMEN: lo que el borde gana por un lado lo cede por los demás, así
 *     que la gota se desplaza y se aplasta, no se infla.
 *   - INERCIA: cruzarla deprisa la empuja en esa dirección.
 *   - GELATINA: cada vértice es un muelle poco amortiguado; al soltarla,
 *     tiembla un par de veces y se queda quieta.
 *
 * Historia, para quien lo toque: hubo un abultamiento hacia el cursor que
 * Diseña Futuro pidió quitar en octubre de 2026 ("la mancha que sigue al
 * puntero"). En noviembre se pidió de nuevo una deformación del blob con el
 * puntero, con la condición de no deformar la imagen. Esto es eso. Se apaga
 * entero con `GOTA_INTERACTIVA = false`.
 */
export const GOTA_INTERACTIVA = true;

/** Hasta dónde llega la influencia del puntero, en unidades del viewBox (0-100). */
const ALCANCE = 21;
/** Cuánto puede estirarse el borde hacia el puntero. */
const TOPE = 9;
const FUERZA = 0.62;
/** Parte del estirón que se compensa en el resto del borde (1 = todo). */
const VOLUMEN = 0.75;
/** Cuánto empuja el movimiento del puntero. */
const IMPULSO = 2.6;
/** Muelle: rigidez y freno. Con estos valores oscila un par de veces. */
const RIGIDEZ = 150;
const FRENO = 10.5;
/** Desplazamiento máximo de un vértice, para que nunca salga un pico. */
const LIMITE = 7.5;

type Forma = { angulos: number[]; radios: number[]; encaje: Encaje };

type BlobVivo = {
  elemento: HTMLElement;
  vertices: Vertice[];
  encaje: Encaje;
  paths: SVGPathElement[];
  /** Desfase temporal para que dos vecinos nunca respiren a la vez. */
  desfase: number;
  visible: boolean;
  /** Cambio de forma en curso (evento `blob:forma`), o null. */
  morfo: { desde: Forma; hacia: Forma; inicio: number } | null;
  /** Física de la gota: desplazamiento y velocidad radial de cada vértice. */
  empujes: Float32Array;
  velocidades: Float32Array;
  /** Posición actual de cada vértice (x, y) en el viewBox. */
  posiciones: Float32Array;
  agitado: boolean;
};

/**
 * CAMBIO DE FORMA. Un componente puede pedirle a un blob otra silueta:
 *
 *   elemento.dispatchEvent(new CustomEvent("blob:forma", { detail: { vertices, encaje } }))
 *
 * La nueva forma debe tener el mismo número de vértices. Se cambian ángulo y
 * radio de cada vértice y el encaje; los osciladores se conservan, así la
 * respiración sigue sin saltos. El paso de una forma a otra es un resorte:
 * se pasa un poco y vuelve, como gelatina.
 */
export type DetalleForma = { vertices: Pick<Vertice, "angulo" | "radio">[]; encaje: Encaje };

const DURACION_MORFO = 1.3;
/** Resorte amortiguado: llega a 1 pasándose un par de veces cada vez menos. */
const resorte = (t: number) => 1 - Math.exp(-6 * t) * Math.cos(11 * t);
const mezclar = (a: number, b: number, t: number) => a + (b - a) * t;

function formaDe(vivo: BlobVivo): Forma {
  return {
    angulos: vivo.vertices.map((v) => v.angulo),
    radios: vivo.vertices.map((v) => v.radio),
    encaje: { ...vivo.encaje },
  };
}

export type ControlBlobs = { destruir: () => void };

export function animarBlobs(raiz: ParentNode = document): ControlBlobs {
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

  const nodos = [...raiz.querySelectorAll<HTMLElement>("[data-blob]")];
  const vivos: BlobVivo[] = [];

  for (const elemento of nodos) {
    const crudo = elemento.dataset.vertices;
    if (!crudo) continue;

    let vertices: Vertice[];
    let encaje: Encaje;
    try {
      vertices = JSON.parse(crudo);
      encaje = JSON.parse(elemento.dataset.encaje ?? "null");
    } catch {
      continue;
    }
    if (!encaje) continue;

    const paths = [
      ...elemento.querySelectorAll<SVGPathElement>("[data-path]"),
    ];
    if (paths.length === 0) continue;

    vivos.push({
      elemento,
      vertices,
      encaje,
      paths,
      desfase: Number(elemento.dataset.desfase ?? 0),
      visible: false,
      morfo: null,
      empujes: new Float32Array(vertices.length),
      velocidades: new Float32Array(vertices.length),
      posiciones: new Float32Array(vertices.length * 2),
      agitado: false,
    });
  }

  if (vivos.length === 0) return { destruir: () => {} };

  // --- Visibilidad ------------------------------------------------------
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        const vivo = vivos.find((v) => v.elemento === entrada.target);
        if (vivo) vivo.visible = entrada.isIntersecting;
      }
    },
    // Margen generoso: que empiece a moverse antes de asomar, para no
    // sorprender al usuario con un blob que arranca a mitad de pantalla.
    { rootMargin: "20% 0px" },
  );
  for (const v of vivos) observador.observe(v.elemento);

  // --- Cambio de forma ---------------------------------------------------
  const eventos = new AbortController();
  for (const vivo of vivos) {
    vivo.elemento.addEventListener(
      "blob:forma",
      (e) => {
        const { vertices, encaje } = (e as CustomEvent<DetalleForma>).detail;
        if (sinMovimiento.matches || vertices.length !== vivo.vertices.length) return;
        vivo.morfo = {
          desde: formaDe(vivo),
          hacia: { angulos: vertices.map((v) => v.angulo), radios: vertices.map((v) => v.radio), encaje },
          inicio: performance.now() / 1000,
        };
      },
      { signal: eventos.signal },
    );
  }

  function avanzarMorfo(vivo: BlobVivo, tiempo: number) {
    const m = vivo.morfo!;
    const p = Math.min(1, Math.max(0, (tiempo - m.inicio) / DURACION_MORFO));
    const t = p >= 1 ? 1 : resorte(p);
    vivo.vertices.forEach((v, i) => {
      v.angulo = mezclar(m.desde.angulos[i]!, m.hacia.angulos[i]!, t);
      v.radio = mezclar(m.desde.radios[i]!, m.hacia.radios[i]!, t);
    });
    vivo.encaje = {
      sx: mezclar(m.desde.encaje.sx, m.hacia.encaje.sx, t),
      sy: mezclar(m.desde.encaje.sy, m.hacia.encaje.sy, t),
      cx: mezclar(m.desde.encaje.cx, m.hacia.encaje.cx, t),
      cy: mezclar(m.desde.encaje.cy, m.hacia.encaje.cy, t),
    };
    if (p >= 1) vivo.morfo = null;
  }

  // --- La gota y el puntero ------------------------------------------------
  // Solo ratón: en táctil, mover el dedo es hacer scroll.
  const puntero = { x: 0, y: 0, vx: 0, vy: 0, dentro: false, cuando: 0 };

  if (GOTA_INTERACTIVA && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener(
      "pointermove",
      (evento) => {
        if (evento.pointerType !== "mouse") return;
        const ahora = performance.now();
        const dt = Math.max(1, ahora - puntero.cuando) / 1000;
        if (puntero.dentro && dt < 0.2) {
          // Velocidad suavizada: un solo evento brusco no debe dar un latigazo.
          puntero.vx += ((evento.clientX - puntero.x) / dt - puntero.vx) * 0.35;
          puntero.vy += ((evento.clientY - puntero.y) / dt - puntero.vy) * 0.35;
        } else {
          puntero.vx = puntero.vy = 0;
        }
        puntero.x = evento.clientX;
        puntero.y = evento.clientY;
        puntero.cuando = ahora;
        puntero.dentro = true;
      },
      { passive: true, signal: eventos.signal },
    );
    document.documentElement.addEventListener("pointerleave", () => (puntero.dentro = false), {
      signal: eventos.signal,
    });
  }

  function avanzarGota(vivo: BlobVivo, tiempo: number, dt: number) {
    const n = vivo.vertices.length;
    const { empujes, velocidades, posiciones } = vivo;
    let hayPuntero = false;
    let px = 0;
    let py = 0;
    let pvx = 0;
    let pvy = 0;

    if (puntero.dentro) {
      const caja = vivo.elemento.getBoundingClientRect();
      if (caja.width > 0) {
        px = ((puntero.x - caja.left) / caja.width) * 100;
        py = ((puntero.y - caja.top) / caja.height) * 100;
        // Lejos del blob no hay nada que calcular.
        hayPuntero = px > -45 && px < 145 && py > -45 && py < 145;
        // El puntero quieto deja de empujar enseguida.
        const reciente = performance.now() - puntero.cuando < 90 ? 1 : 0;
        pvx = (puntero.vx / caja.width) * 100 * reciente;
        pvy = (puntero.vy / caja.height) * 100 * reciente;
      }
    }

    if (!hayPuntero && !vivo.agitado) return;

    situarVertices(vivo.vertices, tiempo, vivo.encaje, empujes, posiciones);

    let media = 0;
    const objetivos = new Float32Array(n);
    if (hayPuntero) {
      for (let i = 0; i < n; i++) {
        const vx = posiciones[i * 2]!;
        const vy = posiciones[i * 2 + 1]!;
        // Dirección "hacia fuera" de este vértice.
        const ox = vx - 50;
        const oy = vy - 50;
        const largo = Math.hypot(ox, oy) || 1;
        const dx = px - vx;
        const dy = py - vy;
        const cerca = Math.exp(-(dx * dx + dy * dy) / (ALCANCE * ALCANCE));
        // TENSIÓN: el borde va hacia el puntero, por fuera o por dentro.
        const haciaPuntero = (dx * ox + dy * oy) / largo;
        objetivos[i] = Math.max(-TOPE, Math.min(TOPE, haciaPuntero)) * cerca * FUERZA;
        media += objetivos[i]!;
        // INERCIA: el movimiento del puntero empuja en su dirección.
        velocidades[i]! += ((pvx * ox + pvy * oy) / largo) * cerca * IMPULSO * dt;
      }
      media /= n;
    }

    let energia = 0;
    for (let i = 0; i < n; i++) {
      // VOLUMEN: lo que se estira por un lado se cede por los demás.
      const objetivo = objetivos[i]! - media * VOLUMEN;
      // GELATINA: muelle amortiguado hacia el objetivo.
      velocidades[i]! += (-RIGIDEZ * (empujes[i]! - objetivo) - FRENO * velocidades[i]!) * dt;
      empujes[i] = Math.max(-LIMITE, Math.min(LIMITE, empujes[i]! + velocidades[i]! * dt));
      energia = Math.max(energia, Math.abs(empujes[i]!), Math.abs(velocidades[i]!) * 0.06);
    }

    const agitado = energia > 0.03;
    if (!agitado && !hayPuntero) {
      empujes.fill(0);
      velocidades.fill(0);
    }
    if (agitado !== vivo.agitado) {
      vivo.agitado = agitado;
      if (agitado) AGITADOS.add(vivo.elemento);
      else AGITADOS.delete(vivo.elemento);
    }
  }

  // --- Bucle ------------------------------------------------------------
  let previo = 0;
  const pintar = (tiempo: number) => {
    const dt = Math.min(1 / 30, previo ? tiempo - previo : 1 / 60);
    previo = tiempo;

    for (const vivo of vivos) {
      if (!vivo.visible) continue;
      if (vivo.morfo) avanzarMorfo(vivo, tiempo);
      if (GOTA_INTERACTIVA) avanzarGota(vivo, tiempo + vivo.desfase, dt);

      const d = construirPath(vivo.vertices, tiempo + vivo.desfase, null, vivo.encaje, vivo.empujes);

      for (const p of vivo.paths) p.setAttribute("d", d);

      // La misma silueta, en números, para el material de los retratos.
      let contorno = CONTORNOS.get(vivo.elemento);
      if (!contorno) {
        contorno = new Float32Array(MUESTRAS_CONTORNO);
        CONTORNOS.set(vivo.elemento, contorno);
      }
      muestrearContorno(vivo.vertices, tiempo + vivo.desfase, vivo.encaje, contorno, vivo.empujes);
    }
  };

  let cuadro = 0;
  let activo = !sinMovimiento.matches;

  const bucle = (ms: number) => {
    if (!activo) return;
    // El reloj va en segundos porque es lo que esperan los osciladores.
    pintar(ms / 1000);
    cuadro = requestAnimationFrame(bucle);
  };

  if (activo) cuadro = requestAnimationFrame(bucle);

  return {
    destruir() {
      activo = false;
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      eventos.abort();
    },
  };
}
