# Plan de mejoras — traspaso a otro agente

Documento para quien continúe este proyecto. Está escrito para ahorrarte las
horas que costó descubrir ciertas cosas: **lee la sección de trampas antes de
tocar nada de animación**, porque casi todos los bugs de esta base han sido la
misma clase de error.

Contexto del producto, datos y despliegue: ver [README.md](README.md).

---

## 0. Estado al momento del traspaso

Funciona y está verificado en navegador:

- Listado de 14 emprendedores, 1 por fila en móvil y 2 en desktop.
- Blob orgánico animado por emprendedor, fluido y reactivo al ratón en desktop.
- Un único blob de color que recorre el listado: nace ocupando la caja del
  texto del hero y visita a cada emprendedor tomando su color de categoría.
- Vídeo: entra al pasar el puntero en el listado, automático en la ficha.
- Filtros con GSAP Flip, sin fugas de layout.
- Anclaje de filas con `lenis/snap` en modo `proximity`.
- `astro check` limpio, build de 9 páginas en ~0.7s, `dist` de 2.5 MB.

**Bloqueantes de contenido siguen abiertos** (ver README): 11 fotos prestadas,
autorización de imagen, logo y manual de marca, 6 fichas sin datos.

---

## 1. Trampas de esta base de código

Estas cinco explican la mayoría de bugs que aparecieron. Si algo se comporta
raro, empieza por aquí.

### 1.1 GSAP se apropia del `transform` completo

Cuando GSAP anima `x`, `y` o `scale` de un elemento, toma el control de todo su
`transform` y **borra cualquier `translate`/`scale`/`rotate` que el CSS tuviera
en ese mismo nodo**.

Por eso la anidación de este proyecto es estricta, **un efecto por nivel**:

```
.celda        -> Flip (filtros)
  .flota      -> parallax de columna
    .tarjeta  -> animación de entrada
      .marco  -> rotación y escala base del CSS
        .respaldo   -> GSAP (viaje desde el hero)
          svg       -> CSS (corrimiento fijo del respaldo)
        .blob       -> el retrato
```

Antes de añadir una animación, pregúntate de quién es ese nodo. Si ya tiene
dueño, envuelve.

### 1.2 `gsap.ticker` se duerme

GSAP duerme su ticker cuando no hay tweens activos. Cualquier bucle continuo
(el morph de los blobs) **debe ir en su propio `requestAnimationFrame`**, no en
`gsap.ticker.add`. Ya pasó dos veces: el síntoma es que nada anima y no hay
ningún error en consola.

### 1.3 Perseguir posiciones durante el scroll es una trampa

Hubo dos intentos de tener blobs en una capa `fixed` que decidían en cada frame
a qué emprendedor acompañaban, según cercanía al centro de pantalla. Al hacer
scroll ese orden cambia sin parar: las piezas se reasignan, cruzan la pantalla
y persiguen objetivos en movimiento.

**Regla:** si algo tiene que acompañar a un elemento del documento, ponlo dentro
de ese elemento y deja que el scroll lo mueva. Si tiene que viajar, que sea un
tween con **dueño fijo y extremos conocidos**, atado a `ScrollTrigger` con
`scrub`. Nunca una asignación recalculada por frame.

### 1.4 El dev server sirve bundles obsoletos

Pasó varias veces, incluido un `504 (Outdated Optimize Dep)` al añadir un import
nuevo. El síntoma es que el navegador no refleja un cambio que está claramente
en el archivo, o que un script entero deja de ejecutarse.

```bash
npx astro dev stop && rm -rf node_modules/.vite .astro && npx astro dev --background
```

Reinicia antes de depurar un comportamiento raro.

### 1.5 Las capturas mienten

Con imágenes `lazy`, una captura tomada justo tras hacer scroll puede mostrar
tarjetas como manchas de color sin foto. No es un bug: es el panel capturando
antes de pintar. Confirma midiendo en el DOM (`img.complete`, `naturalWidth`)
antes de "arreglar" nada.

---

## 2. Mejoras pendientes, por prioridad

### P1 — Ajuste fino de la silueta *(lo más pedido y aún no cerrado)*

`src/lib/blob.ts` ya normaliza cada silueta a una caja cuadrada
(`calcularEncaje`) para que el recorte 1:1 de la foto sea parejo, y los
parámetros actuales son `lados: 8, irregularidad: 0.12`.

Queda por hacer:

- **Revisar las 14 siluetas a la vez** y detectar las que sigan saliendo
  desagradables. Lo más rápido es una página de prueba que las pinte en grilla,
  sin fotos, para juzgar solo la forma.
- **Acotar la relación entre radio mínimo y máximo** por silueta. Hoy la
  irregularidad es uniforme y un blob puede tener dos lóbulos muy marcados
  juntos. Un rechazo por semilla (si `maxR/minR > 1.5`, resembrar) daría
  consistencia sin perder variedad.
- **Verificar el encuadre de los rostros** con la silueta ya normalizada. Si
  alguno corta mal, el punto focal se ajusta en `scripts/recortes.json` y se
  corre `npm run fotos:recortar`, sin tocar código.

### P2 — Pulir el recorrido del blob

`montarViajero` en `ListaEmprendedores.astro`. Funciona; falta afinarlo:

- Los tramos usan `ease: "none"`. Un easing por tramo haría que el blob
  **frene al llegar** a cada emprendedor y arranque al salir, en vez de
  desplazarse a velocidad constante. Es lo que más cambiaría la sensación.
- Valorar que **rote** ligeramente durante el viaje, para que se lea como una
  pieza que se acomoda y no como una que se desliza.
- El desplazamiento respecto al retrato es fijo (-8% / +7%). Alternar el lado
  según la columna en desktop evitaría que siempre asome por el mismo sitio.
- En desktop el recorrido zigzaguea entre columnas. Comprobar que a 1440px la
  diagonal no se sienta demasiado larga entre filas.

### P3 — Enriquecer el movimiento *(pedido explícito: "sigue muy simple")*

Por orden de impacto frente a esfuerzo:

1. **Revelado del nombre por líneas.** `SplitText` es gratis desde GSAP 3.13 y
   ya está en el paquete. Un stagger por línea al entrar la tarjeta da mucho
   por muy poco.
2. **Parallax entre retrato y respaldo.** Hoy van solidarios. Si el respaldo se
   mueve un 10-15% más lento que la foto al hacer scroll, aparece profundidad
   real. Ojo con 1.1: el respaldo ya tiene dueño (GSAP, para el viaje), así que
   el parallax va en otro nivel o se compone dentro del mismo tween.
3. **Estado de hover más rico.** Al pasar el puntero, separar más el respaldo
   del retrato y subir ligeramente la tarjeta: refuerza la metáfora de sticker
   que ya usan los titulares.
4. **Transición de vista compartida más ambiciosa.** Hoy el retrato viaja al
   abrir la ficha. Podría viajar también el respaldo, y el nombre escalar desde
   el tamaño del listado al de la ficha.
5. **Cursor personalizado en desktop** sobre las tarjetas ("ver ficha"), que es
   lenguaje habitual en sitios de este nivel.

### P4 — Accesibilidad y rendimiento *(sin verificar todavía)*

- **`prefers-reduced-motion` no se ha probado en ejecución.** El código lo
  contempla en todos los módulos, pero hay que confirmarlo en DevTools >
  Rendering. Es la verificación pendiente más importante.
- **Lighthouse nunca se ha corrido.** Objetivo del plan original: ≥90 en
  Performance y 100 en Accesibilidad en móvil.
- Medir el coste real del `filter: blur` durante el viaje del hero en un móvil
  de gama media. Si pesa, sustituirlo por opacidad y escala.
- Autohospedar los `woff2` de General Sans: hoy vienen de `api.fontshare.com` y
  están en el camino crítico del render.

### P5 — Fase 2: Strapi en Coolify

Sin cambios respecto al plan original. Se reescribe **solo**
`src/lib/directorio.ts`; ningún componente lee datos por su cuenta. El tipo
`Emprendedor` es el contrato que debe cumplir el content-type.

Al migrar, ten en cuenta que `video` y `videoPendiente` ya existen en el tipo:
cada emprendedor subirá el suyo y el placeholder de stock desaparece.

---

## 3. Cómo verificar que no has roto nada

No hay tests automatizados. La comprobación es en navegador, y estas son las
que han cazado regresiones de verdad:

| Qué | Cómo | Esperado |
|---|---|---|
| Filtros | Clic en una categoría, medir celdas durante ~25 frames | Ninguna celda fuera de los límites de `.grid` |
| Blob viajero | Medir posición y `fill` a distintas alturas de scroll | Se desplaza y cambia de color; sin saltos |
| Morph | Muestrear el `d` de un path ~10 veces cada 250ms | Valores distintos |
| Ratón | Disparar `pointermove` sobre un blob | El `d` cambia respecto a reposo |
| Vídeo hover | `pointerenter` en `[data-tarjeta]` | `.blob` con `data-video-activo`, opacidad 1 |
| Móvil 375px | Emular viewport | 1 columna, `scrollWidth === innerWidth` |

Espera siempre más de lo que crees: el morph tiene desfases de hasta 5s por
blob, y el panel del navegador ralentiza `requestAnimationFrame` cuando no está
al frente. Una medición corta da falsos negativos, y ya provocó dos
diagnósticos equivocados.
