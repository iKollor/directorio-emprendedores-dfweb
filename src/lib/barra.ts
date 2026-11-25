/**
 * LA BARRA: el logo de la escuela se queda pegado arriba, como una barra de
 * navegación, con los logos de Diseña Futuro e Intervalores, que llevan a
 * sus webs.
 *
 * EN LA PORTADA, EL LOGO GRANDE SE CONVIERTE EN LA BARRA. Al bajar, el logo
 * del hero se va encogiendo con el propio desplazamiento hasta caber en el
 * hueco de la barra; cuando llega, la barra (una píldora de vidrio, el
 * material de los mandos del reproductor) termina de aparecer a su alrededor
 * y el logo se queda ahí. Al subir, hace el camino de vuelta. Va atado al
 * desplazamiento, no a un reloj: no hay nada que interrumpir, se para donde
 * se pare la persona.
 *
 * Mientras se encoge, el logo sube algo más despacio que la página y se
 * posa en la barra con una curva que frena al final, para que nunca pise lo
 * que viene debajo (el titular en el escritorio, el retrato en el teléfono).
 *
 * EN LAS DEMÁS PÁGINAS no hay logo grande: la barra entra (bajando un poco y
 * apareciendo, con la curva del sitio) al pasar la cabecera, y sale al
 * volver a ella. Con movimiento reducido pasa lo mismo en la portada, sin el
 * encogido: la barra aparece cuando el logo grande sale de la pantalla.
 *
 * Una sola imagen en cada momento: o el logo del hero (transformado) o el de
 * la barra, nunca los dos a la vez.
 */
import { gsap } from "gsap";
import { sinMovimiento } from "./scroll";

/** Lo mínimo que hay que desplazarse para que el logo llegue a la barra (px). */
const RECORRIDO_MINIMO = 200;
/** En qué punto del recorrido llega el logo a la barra; el resto es para que aparezca el vidrio. */
const LLEGADA = 0.8;
/** Donde empieza a encogerse un logo que está más abajo (fracción del alto de la ventana). */
const ARRANQUE = 0.42;

let soltar: (() => void) | null = null;

const entre = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Dónde está un elemento en la página según su maquetación, sin contar
 * transformaciones: el logo hace su entrada subiendo un poco, y medido con
 * getBoundingClientRect a media entrada salía desplazado.
 */
function enLaPagina(el: HTMLElement): { arriba: number; izquierda: number } {
  let arriba = 0;
  let izquierda = 0;
  let nodo: HTMLElement | null = el;
  while (nodo) {
    arriba += nodo.offsetTop;
    izquierda += nodo.offsetLeft;
    nodo = nodo.offsetParent as HTMLElement | null;
  }
  return { arriba, izquierda };
}

export function montarBarra(): void {
  soltar?.();
  soltar = null;
  const barra = document.querySelector<HTMLElement>("[data-barra]");
  const logoBarra = barra?.querySelector<HTMLImageElement>("[data-barra-logo] img") ?? null;
  if (!barra || !logoBarra) return;
  const logoHero = document.querySelector<HTMLImageElement>(".hero .con-logo img");
  const cabecera = document.querySelector<HTMLElement>(".cabecera");

  let activa: boolean | null = null;
  const poner = (q: number) => {
    barra.style.setProperty("--barra", q.toFixed(3));
    const ahora = q > 0.5;
    if (ahora === activa) return;
    activa = ahora;
    barra.toggleAttribute("data-activa", ahora);
    // Escondida no se puede enfocar ni pulsar: sus enlaces repiten los de la página.
    barra.inert = !ahora;
  };

  // ---- Sin logo grande que encoger: la barra entra y sale ----------------
  if (!logoHero || sinMovimiento()) {
    const estado = { q: 0 };
    let dentro = false;
    let umbral = 0;
    const medir = () => {
      umbral = logoHero
        ? enLaPagina(logoHero).arriba + logoHero.offsetHeight - barra.getBoundingClientRect().bottom
        : (cabecera?.getBoundingClientRect().bottom ?? 0) + window.scrollY;
    };
    const mirar = () => {
      const ahora = window.scrollY > umbral;
      if (ahora === dentro) return;
      dentro = ahora;
      gsap.killTweensOf(estado);
      if (sinMovimiento()) {
        estado.q = ahora ? 1 : 0;
        poner(estado.q);
      } else {
        gsap.to(estado, {
          q: ahora ? 1 : 0,
          duration: ahora ? 0.6 : 0.3,
          ease: ahora ? "expo.out" : "sine.in",
          onUpdate: () => poner(estado.q),
        });
      }
    };
    logoBarra.style.opacity = "";
    poner(0);
    medir();
    mirar();
    window.addEventListener("scroll", mirar, { passive: true });
    window.addEventListener("resize", medir);
    soltar = () => {
      gsap.killTweensOf(estado);
      window.removeEventListener("scroll", mirar);
      window.removeEventListener("resize", medir);
    };
    return;
  }

  // ---- En la portada: el logo grande se encoge hasta la barra ------------
  let m = { arriba: 0, izquierda: 0, alto: 1, hueco: { arriba: 0, izquierda: 0, alto: 1 }, ventana: 1 };
  let ultimo = -1;
  let sucio = true;

  const medir = () => {
    const r = enLaPagina(logoHero);
    const h = logoBarra.getBoundingClientRect();
    m = {
      arriba: r.arriba,
      izquierda: r.izquierda - window.scrollX,
      alto: logoHero.offsetHeight || 1,
      hueco: { arriba: h.top, izquierda: h.left, alto: h.height || 1 },
      ventana: window.innerHeight,
    };
    sucio = true;
  };

  const paso = () => {
    const s = window.scrollY;
    if (s === ultimo && !sucio) return;
    ultimo = s;
    sucio = false;
    const { arriba, izquierda, alto, hueco, ventana } = m;
    // Empieza a encogerse donde está o, si está más abajo, al llegar a ese punto.
    const inicio = Math.max(hueco.arriba, Math.min(arriba, ventana * ARRANQUE));
    const desde = arriba - inicio;
    const recorrido = Math.max(inicio - hueco.arriba, RECORRIDO_MINIMO) / LLEGADA;
    const avance = entre((s - desde) / recorrido);
    // El logo llega al 90 % del recorrido; en el último tramo ya está en la
    // barra y aparece el vidrio a su alrededor. Si el vidrio apareciera
    // mientras el logo grande aún viaja, lo taparía: la barra va por encima.
    const p = entre(avance / LLEGADA);
    // El sitio frena al final (se posa); el tamaño baja parejo.
    const llega = 1 - (1 - p) * (1 - p);
    const y = inicio + (hueco.arriba - inicio) * llega - (arriba - s);
    const x = (hueco.izquierda - izquierda) * llega;
    const k = 1 + (hueco.alto / alto - 1) * p;

    if (p >= 1) {
      logoHero.style.visibility = "hidden";
      logoHero.style.transform = "";
      logoBarra.style.opacity = "1";
    } else {
      logoHero.style.visibility = "";
      logoHero.style.transform = p > 0 ? `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${k.toFixed(4)})` : "";
      logoBarra.style.opacity = "0";
    }
    // La píldora aparece alrededor del logo cuando ya ha llegado.
    poner(entre((avance - LLEGADA) / (1 - LLEGADA)));
  };

  medir();
  paso();
  gsap.ticker.add(paso);
  const remedir = () => {
    medir();
    paso();
  };
  window.addEventListener("resize", remedir);
  // Si el logo aún no tenía medida al montar, se vuelve a medir al cargar.
  if (!logoHero.complete) logoHero.addEventListener("load", remedir, { once: true });
  document.fonts?.ready.then(remedir, () => {});

  soltar = () => {
    gsap.ticker.remove(paso);
    window.removeEventListener("resize", remedir);
    logoHero.style.transform = "";
    logoHero.style.visibility = "";
    logoBarra.style.opacity = "";
  };
}

export function soltarBarra(): void {
  soltar?.();
  soltar = null;
}
