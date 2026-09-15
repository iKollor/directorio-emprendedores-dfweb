# Directorio de Emprendedores · Diseña Futuro

Plataforma pública donde los graduados de la **Escuela de Emprendimiento (EDE)**
de [Diseña Futuro](https://disenafuturo.com) muestran sus negocios y reciben
contacto directo por WhatsApp.

Emprendedores de las comunidades de **Sabanilla** y **Los Lojas**, cantón Daule
(Guayas, Ecuador).

No es un catálogo con carrito: es un puente de contacto. El éxito se mide en
clics a WhatsApp.

---

## Stack

| Paquete | Versión | Rol |
|---|---|---|
| `astro` | 7.3.2 | Framework, salida estática |
| `gsap` | 3.15.0 | ScrollTrigger, Flip (todos los plugins son gratis desde 3.13) |
| `lenis` | 1.3.26 | Smooth scroll |

Sin frameworks de UI: todo es `.astro` más scripts vanilla. Cero islas.

```bash
npm run dev       # servidor de desarrollo
npm run build     # sitio estático en dist/
npm run check     # tipos
```

---

## Estado actual: FASE 1

Solo el frontend. Los datos salen de `src/data/emprendedores.json`, generado
desde el Excel del cliente.

**La Fase 2 conecta Strapi 5 self-hosted en Coolify.** Cuando llegue, se
reescribe **únicamente** `src/lib/directorio.ts`: ningún componente lee datos
por su cuenta, así que la UI no se toca. Ver "Adaptador" abajo.

### ⚠️ Pendientes bloqueantes antes de desplegar

1. **11 de 14 fichas muestran la foto de otra persona.** Es un estado de
   maqueta (ver "Fotos"). El build avisa mientras quede alguna. **No desplegar
   así**: son personas reales identificadas con nombre y apellido.
2. **Confirmar autorización de uso de imagen** de los emprendedores con Diseña
   Futuro.
3. **Pedir el logo en SVG y el manual de marca.** Ya se usa el logo oficial en WebP y el favicon del sitio; falta el original vectorial. El
   rosa (`--df-pink`) está deducido de una captura y la tipografía es un
   sustituto (ver "Marca").
4. **6 emprendedores sin datos de negocio** aparecen como "Ficha en
   preparación". Hay que pedir su información.
5. Definir el dominio (propuesto: `emprendedores.disenafuturo.com`) y fijarlo
   en `site` dentro de `astro.config.mjs`.

---

## Los datos

### Pipeline

```bash
python scripts/importar_excel.py "ruta/Info de emprendedores - Plataforma.xlsx"
npm run fotos          # descarga de Drive + recorte cuadrado
npm run placeholders   # SOLO maqueta: rellena huecos (ver abajo)
```

**`scripts/importar_excel.py`** (requiere `pip install openpyxl`) lee el Excel y
produce `src/data/emprendedores.json`. Normaliza nombres, deriva el slug
(nombre + primer apellido), clasifica la categoría a partir del texto libre de
`EMPRENDIMIENTO`, y convierte teléfonos al formato `wa.me`.

De 14 filas, 8 traen ficha completa.

### Casos borde reales (no inventados)

- **Celia Morán** tenía teléfono pero no enlace de WhatsApp: el script deriva la
  URL desde el número.
- **Linda Romero** no tiene ni teléfono ni WhatsApp. Su ficha ofrece un CTA
  alternativo hacia Diseña Futuro en vez de un botón muerto.
- 6 personas solo tienen nombre y comunidad. Se listan en estado "Ficha en
  preparación", sin enlace ni contacto. **No se les inventa el negocio.**

---

## Fotos

Las fotos originales están en Google Drive, enlazadas desde el Excel.

**`npm run fotos`** las descarga a `src/assets/emprendedores/` y las prepara.
Quedan versionadas en el repo para no depender de que el Drive siga compartido,
y son las mismas que en la Fase 2 se suben al Media Library de Strapi.

Google limita las descargas anónimas por ráfaga y responde `200` con una página
HTML de login en vez del archivo. El script lo detecta, reintenta con espera
creciente y falla claro. **Si quedan fotos sin bajar, espera y vuelve a correr
`npm run fotos`** — es idempotente y solo baja lo que falta.

### No son retratos

Son fotos de clase de 6000px: gente escribiendo en un pupitre, de cuerpo entero
junto a un banner, a veces con más de una persona en cuadro. Un
`object-position` fijo en CSS recorta bien a unos y mal a otros.

`scripts/normalizar-fotos.mjs` recorta cada foto a cuadrado usando la estrategia
de **saliencia de sharp**, que encuentra al sujeto, y la acota a 1800px. Acierta
en la mayoría de los casos.

Cuando se equivoque, **no hay que tocar código**: se fija el punto focal en
[`scripts/recortes.json`](scripts/recortes.json) y se corre:

```bash
npm run fotos:recortar
```

### El estado de maqueta

`npm run placeholders` presta fotos existentes a quien aún no tiene la suya,
para poder maquetar con los 14. Marca esos registros con `fotoPendiente`, y el
sitio los muestra con una insignia **"⚠ Foto pendiente"** visible. El build
imprime un aviso mientras quede alguno.

Es temporal. En cuanto `npm run fotos` traiga la foto real, el placeholder se
borra solo en la siguiente corrida.

---

## Marca

Paleta **medida en vivo** sobre disenafuturo.com, no estimada
(`src/styles/tokens.css`):

| Token | Valor | Uso |
|---|---|---|
| `--df-blue` | `#4141F9` | fondo principal |
| `--df-blue-deep` | `#0731A5` | acento agropecuario |
| `--df-cyan` | `#52DBE2` | elipse de fondo, comercio |
| `--df-green` | `#70D985` | confección |
| `--df-yellow` | `#F9C52C` | CTA, construcción |
| `--df-pink` | `#F472D0` | ⚠️ **deducido de captura, confirmar** |
| `--df-ink` | `#282828` | su negro real, no `#000` |
| `--df-bone` | `#EFEEED` | su blanco roto |

Gramática heredada de su sitio: elipses gigantes sangradas fuera del canvas,
botones píldora amarilla con texto azul, titulares que mezclan light y bold en
la misma frase, y CTAs con exclamación de apertura ("¡Conócele!").

**Tipografía:** su sitio sirve fuentes ofuscadas y sin nombre, así que no se
pueden reutilizar. Se usa **General Sans** (Fontshare) como sustituto del mismo
género. Confirmar con el manual de marca.

Desde el 14 de septiembre de 2026, los WOFF2 se sirven localmente desde
`public/fonts/`. El encabezado y el footer comparten `Marca.astro` y el footer
incluye Instagram y LinkedIn verificados en el sitio oficial. Procedencia de
los recursos en `public/brand/FUENTES.md` y `public/fonts/FUENTES.md`.

Revisión de diseño y pruebas recientes: [MEJORAS-APLICADAS.md](MEJORAS-APLICADAS.md).

---

## Arquitectura

### El adaptador

`src/lib/directorio.ts` es la **única** puerta a los datos:

```ts
getEmprendedores(): Promise<Emprendedor[]>
getEmprendedor(slug): Promise<Emprendedor | null>
```

Ningún componente lee el JSON ni hace `fetch`. En la Fase 2 se sustituye la
carga por la API de Strapi y nada más cambia. El tipo `Emprendedor` es el
contrato que el content-type de Strapi debe poder satisfacer.

### Los blobs

`src/lib/blob.ts` genera las siluetas y `src/lib/blobRuntime.ts` las anima.

Cada vértice lleva **sus propios osciladores** con frecuencias, amplitudes y
fases distintas, y el radio se evalúa en cada frame. Como las frecuencias no
son múltiplos entre sí, el ciclo no se repite de forma perceptible: se lee como
líquido. (La primera versión interpolaba entre tres formas fijas y se notaba
mecánica, siempre el mismo latido de ida y vuelta.)

En desktop **reaccionan al ratón**: los vértices cercanos al puntero salen
hacia fuera con una caída gaussiana, así que la silueta se abulta hacia el
cursor en vez de desplazarse entera. El empuje persigue a su objetivo con
inercia, que es lo que lo hace sentir líquido y no pegado al ratón.

Dos reglas mandan sobre el generador:

1. **Determinista**: la semilla es el slug, así que el blob de cada persona es
   idéntico en cada build y entre servidor y cliente. Sin esto, la forma
   saltaría al arrancar el JavaScript.
2. **Una sola función de path**: `construirPath()` la usan igual el render del
   servidor (en t=0) y el bucle del navegador. No hay dos implementaciones que
   puedan divergir.

El recorte se hace con `clip-path: url(#...)` sobre `<img>` y `<video>` reales,
no con `<image>` dentro del SVG, para que Astro siga generando AVIF/WebP y
`srcset` y el vídeo conserve sus propios controles de carga.

**No usar `gsap.ticker` para estos bucles.** GSAP duerme su ticker cuando no hay
tweens activos, y estas animaciones tienen que correr también con la página
quieta. Van sobre `requestAnimationFrame` propio, uno solo para todos los blobs,
y solo se evalúan los que un IntersectionObserver marca como visibles.

### Un solo blob de color recorre el listado

Detrás de las tarjetas viaja **una única forma de color**. Nace ocupando
exactamente la caja del texto del hero y, al bajar, va visitando a cada
emprendedor y tomando su color de categoría. Un respaldo por tarjeta llenaba la
pantalla de formas; uno que viaja cuenta el recorrido.

**Vive dentro de `.grid`, en coordenadas del documento.** Ese es el detalle que
lo hace estable: sus destinos se miden una vez por refresh y no cambian al
hacer scroll, así que una sola línea de tiempo con `scrub` los interpola y no
hay nada que perseguir.

Hubo dos intentos previos con blobs en una capa `fixed` que decidían en cada
frame a quién acompañaban según la distancia al centro de la pantalla. Al hacer
scroll ese orden cambiaba sin parar: las piezas se reasignaban, cruzaban la
pantalla y perseguían objetivos en movimiento. **Si algo tiene que acompañar a
un elemento del documento, ponlo en el documento.**

Las duraciones de cada tramo son proporcionales a la distancia real entre
paradas, que es lo que hace que el blob llegue a cada emprendedor justo cuando
esa tarjeta cruza el centro de la pantalla. Al filtrar, el recorrido se
reconstruye con las paradas que quedan.

### El vídeo

Cada emprendedor tendrá el suyo. Hoy todos comparten un placeholder de stock
(Big Buck Bunny, Blender Foundation, CC-BY) recortado a cuadrado y sin audio,
en `public/video/`. Es deliberadamente obvio que no es material real, igual que
las fotos prestadas, y la ficha lo avisa.

- **En el listado**: entra al pasar el puntero o al enfocar con teclado. Con
  `preload="none"` el archivo no se pide hasta ese momento. En móvil no se
  activa: sin hover no hay intención, y catorce vídeos reproduciéndose solos en
  una conexión lenta sería un abuso.
- **En la ficha**: manda desde el principio, en bucle y sin sonido.

Al ser un único archivo compartido, se descarga una vez y vale para los catorce.

### Contraste en el hero

El blob viajero arranca detrás del titular, así que su opacidad ahí baja a 0.32:
el texto blanco tiene que mantener el contraste contra el azul. En cuanto pasa a
hacer de respaldo de un retrato sube a 1.

### El listado

1 blob por fila a todo el ancho en móvil, 2 por fila desde 768px. No se lee
como tabla porque la columna derecha arranca desfasada `12vh`, cada blob trae
rotación y escala propias sembradas por su slug, y las columnas avanzan con
parallax a velocidades distintas.

Los filtros reflowan con **GSAP Flip**, sin recarga ni salto de scroll.

Las filas tienen **anclaje de scroll** (`lenis/snap`), en modo `proximity` y no
`mandatory`: acomoda la fila cuando el usuario se detiene cerca, pero nunca le
arrebata el scroll a medio camino. En desktop ancla solo la columna izquierda,
porque anclar las dos celdas de una fila daría dos paradas casi iguales.

**Un nivel por dueño.** La anidación `.celda > .flota > .tarjeta` no es
decorativa: Flip mueve la celda, el parallax mueve la flota y la animación de
entrada mueve la tarjeta. Cuando dos de esos efectos compartían nodo se pisaban
el transform y las tarjetas se descolocaban al filtrar. Lo mismo en el fondo
(`.orbita` la mueve el JS, `.pieza` solo pinta): **GSAP toma el control del
`transform` completo del elemento que anima**, así que cualquier `scale` o
`translate` de CSS en ese mismo nodo se pierde.

`.grid` lleva `position: relative` y eso **no es cosmético**: Flip pasa las
celdas a `position:absolute` mientras las anima, y sin un ancestro posicionado
se colocaban respecto al viewport y salían disparadas hacia el hero.

### Cuidado con el movimiento y las transiciones

Los scripts empaquetados **no se reejecutan** tras una transición de vista. Todo
GSAP vive dentro de un `gsap.context()` que se revierte en cada
`astro:page-load`. Sin eso, cada navegación acumula tweens sobre los mismos
elementos y los `from` acaban dejando las tarjetas en `opacity: 0`.

Por el mismo motivo, la animación de entrada va sobre la tarjeta y el parallax
sobre la celda: si ambos animaran `y` del mismo nodo, se pisarían.

`prefers-reduced-motion` desactiva Lenis, el morph y el parallax. Los blobs ya
traen siluetas distintas entre sí, así que quietos siguen leyéndose como algo
deliberado. **Pendiente de verificar a mano** en DevTools > Rendering.

---

## Verificado

- `npm run build` y `npm run check`: sin errores. 9 páginas, `dist/` de 2 MB.
- Filtro por comunidad: 11 resultados, todos de Los Lojas, contador correcto.
- WhatsApp de Celia (derivado del teléfono) abre con mensaje prellenado.
- Linda, sin contacto: CTA alternativo, ningún enlace `wa.me`.
- Móvil 375px: 1 columna de 335px, sin scroll horizontal.
- Desktop 1440px: 2 columnas de 601px con la derecha desfasada ~100px.
- Morph de blobs activo y reactivo al ratón en desktop.
- Filtros: ninguna tarjeta se sale de la grilla durante la animación de Flip.
- Vídeo: entra en hover, se pausa al salir; en la ficha arranca solo.
- El blob viajero recorre el listado cambiando de color, sin deriva.
