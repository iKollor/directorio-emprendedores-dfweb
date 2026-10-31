/**
 * Una sola curva de movimiento para todo el sitio.
 *
 * Es la misma que `--ease-suave` en tokens.css: arranca decidida y llega
 * despacio, sin pasarse del destino. Hubo rebotes (`back.out`) y giros en las
 * entradas; se sentían de juguete. El criterio ahora es el de las interfaces
 * de Apple: fundidos con desplazamientos cortos, escalas casi imperceptibles
 * y ningún rebote.
 */
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

export const SUAVE = CustomEase.create("suave", "0.22,1,0.36,1");

/** Lo que se va acelera al salir y no se queda a mirar. */
export const SALIDA = "power2.in";
