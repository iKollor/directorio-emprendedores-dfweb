/**
 * UNA COSA CADA VEZ al cambiar de página: primero vuelan el retrato y el
 * nombre (lib/viaje.ts) y, cuando han aterrizado, entra lo demás.
 *
 * Antes todo arrancaba a la vez, en mitad del vuelo: los textos subían
 * mientras la página se encendía y el retrato viajaba, y el conjunto se veía
 * a saltos. Además, las posiciones de scroll de las entradas se calculaban
 * con la página a medio montar, y alguna se quedaba sin disparar (un
 * titular escondido para siempre).
 *
 * Base.astro llama a `despegar()` con la transición en curso, y a
 * `sinVuelo()` si en la página nueva no aterriza nada; quien tenga entradas
 * las pide con `trasAterrizar()`. En la primera carga no hay vuelo y se
 * ejecutan en el acto.
 */

let vuelo: Promise<void> | null = null;

export function despegar(transicion: ViewTransition): void {
  const este: Promise<void> = transicion.finished.then(
    () => {
      if (vuelo === este) vuelo = null;
    },
    () => {
      if (vuelo === este) vuelo = null;
    },
  );
  vuelo = este;
}

/**
 * No hay nada que aterrice (al volver al inicio, la persona de la que se
 * viene puede no estar en el hero): lo demás entra ya. Esperar al final de
 * la transición dejaba la página en blanco casi un segundo.
 */
export function sinVuelo(): void {
  vuelo = null;
}

export function trasAterrizar(accion: () => void): void {
  if (!vuelo) {
    accion();
    return;
  }
  void vuelo.then(accion);
}
