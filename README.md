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
| `astro` | 7.3.2 | Framework: páginas estáticas, servidas con `@astrojs/node` |
| `payload` | 3.94.0 | Panel de contenido, en `cms/` (SQLite) |
| `gsap` | 3.15.0 | ScrollTrigger, Flip (todos los plugins son gratis desde 3.13) |
| `lenis` | 1.3.26 | Smooth scroll |

Sin frameworks de UI: todo es `.astro` más scripts vanilla. Cero islas.

```bash
npm run dev       # servidor de desarrollo
npm run build     # sitio estático en dist/
npm run check     # tipos
```

---

## El panel de contenido

El contenido se edita en un panel propio, en la carpeta [`cms/`](cms/):
**Payload** (código abierto, MIT) con **SQLite**. El cliente entra con su
correo y su contraseña, rellena la ficha y ve al lado la ficha real mientras
escribe. No hay cuentas de GitHub ni servidor de base de datos.

| Qué | Cómo |
|---|---|
| Fichas | Nombre, oficio, descripción, teléfono, retrato, vídeo y fotos de cada persona |
| Categorías | Se crean y se renombran; el color se elige entre los de la marca |
| Textos y logos | Titulares, botones, mensaje de WhatsApp, pie, el logo de la escuela, y las organizaciones con su logo y su web |
| Borradores | "Guardar borrador" no toca el sitio; "Publicar" sí |
| Vista previa | La ficha o la portada reales (`Ficha.astro`, `Portada.astro`), en un marco junto al formulario |
| Rostro | El punto focal de la foto en el panel es el campo `rostro` |
| Orden | Se arrastran las filas de la lista |
| Publicar | El panel avisa y el sitio se reconstruye solo (unos 20 segundos) |

Guía para quien edita: [`cms/GUIA-DEL-PANEL.md`](cms/GUIA-DEL-PANEL.md).

### En local

```bash
cd cms && cp .env.example .env    # poner PAYLOAD_SECRET y CLAVE_VISTA_PREVIA
npm install && npm run dev        # panel en http://localhost:3000/admin
```

```bash
cp .env.example .env              # la misma CLAVE_VISTA_PREVIA
npm run dev                       # sitio en http://localhost:4321
```

La primera vez, el panel carga solo los emprendedores de
`src/data/emprendedores.json` y pide crear el primer usuario.

Sin `CMS_URL` el sitio se construye con ese JSON, como antes: sirve para
trabajar en el diseño sin levantar el panel.

### En el servidor

```bash
cp .env.produccion.example .env.produccion    # rellenarlo
docker compose --env-file .env.produccion up -d --build
```

Son dos contenedores: el panel (puerto 3000) y el sitio (4321). Delante va un
proxy con HTTPS (Caddy, Nginx o Coolify) con un dominio para cada uno.

- **Memoria.** Medido: el panel ocupa unos 210 MB en marcha y el sitio unos
  100 MB. Compilar la imagen del panel pide unos 2 GB: en una VM de 1 GB hay
  que añadir swap o compilarla en otra máquina y subirla.
- **Copia de seguridad.** Todo lo que el cliente escribe y sube está en el
  volumen `datos_cms` (la base `cms.db` y la carpeta `medios/`).
- **Contraseña olvidada.** No hay correo configurado: el enlace para
  restablecerla sale en el registro del contenedor del panel
  (`docker compose logs cms`). Para que llegue por correo hay que añadir un
  adaptador de email a `cms/src/payload.config.ts`.
- **Cambiar campos.** Tras tocar una colección: `npm run payload
  migrate:create` dentro de `cms/` y subir la migración que genera.
- **Textos.** Los de partida están en `src/data/sitio.json`; ningún
  componente escribe los suyos, todos pasan por `src/lib/sitio.ts`. Un campo
  vacío en el panel vuelve al de partida. Para que un texto nuevo sea
  editable: se añade al JSON y al global `cms/src/globals/Sitio.ts`.
- **Colores.** El panel deja elegir entre los de la marca (`COLORES` en
  `src/data/taxonomia.ts`), no escribir uno libre: cada color lleva su
  variante oscura y su color de texto para que el contraste se cumpla.
- **Lo que no se edita desde el panel:** el diseño (formas, animaciones,
  tipografía) y los rótulos de la interfaz que solo oyen los lectores de
  pantalla o que son parte de un control ("Todas", "Limpiar filtros").

Los scripts del Excel y de Drive (`scripts/importar_excel.py`, `npm run
fotos`) alimentan solo el JSON: con el panel en marcha ya no son la fuente.

### ⚠️ Pendientes antes de desplegar

Ver también [`COMENTARIOS-OCTUBRE.md`](COMENTARIOS-OCTUBRE.md): estado de los
comentarios de Diseña Futuro de octubre de 2026.

1. **Logo de Intervalores, en blanco.** Los archivos recibidos solo traen la
   versión en tinta y magenta, que no se lee sobre el azul. Se usa el logo
   oficial pasado a una tinta blanca: hay que confirmarlo con Intervalores o
   pedirles su versión en negativo. Ver `public/brand/FUENTES.md`.
2. **Fotos.** 12 de 14 muestran una silueta neutra porque falta su foto. Ya no
   se presta la foto de otra persona. Revisar que en ninguna aparezcan menores
   de edad (la de Alexandra Medina se retiró por eso: `fotoRetirada` en el JSON).
3. **Videos y fotos de productos:** hay video de 4 personas; ver
   `src/assets/videos/LEEME.md` (qué falta y qué hay que confirmar) y
   `src/assets/productos/LEEME.md`. Basta con dejar los archivos con el slug,
   o subirlos desde el panel.
4. **Confirmar autorización de uso de imagen** de los emprendedores con Diseña
   Futuro.
5. **6 emprendedores sin datos de negocio** aparecen como "Próximamente". Hay
   que pedir su información.
6. Definir el dominio (propuesto: `emprendedores.disenafuturo.com`) y fijarlo
   en `site` dentro de `astro.config.mjs`.

**Privacidad:** la comunidad de cada emprendedor no se publica
(`MOSTRAR_COMUNIDAD` en `src/data/taxonomia.ts`) y solo se muestra un nombre y
un apellido (`nombrePublico` en `src/lib/directorio.ts`, con excepción manual
en el JSON). Los resúmenes cortos viven en los campos `resumen` y `oficio` del
JSON; `importar_excel.py` los conserva entre importaciones.

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
y son las que el panel carga en su primer arranque.

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

### Sin foto todavía

Quien no tiene foto propia muestra una **silueta neutra** en colores de marca
(`src/assets/marca/foto-pendiente.jpg`). Lo decide el adaptador en cada build:
en cuanto `npm run fotos` traiga la real, la silueta desaparece sola.

Antes se prestaba la foto de otra persona para maquetar. Se abandonó: ponía la
cara de alguien real junto al nombre de otra persona, y una de esas fotos tenía
a una niña. `npm run placeholders` ya solo marca las fichas sin datos de
negocio y borra las copias que quedaran.

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
la misma frase, y CTAs con exclamación de apertura ("¡Conoce su negocio!").

**Tipografía:** su sitio sirve fuentes ofuscadas y sin nombre, así que no se
pueden reutilizar. Se usa **General Sans** (Fontshare) como sustituto del mismo
género. Confirmar con el manual de marca.

Para los rótulos (la cinta de palabras, la llamada de cada tarjeta, el lema)
se usa **Amatic SC**, una letra a pincel parecida a la del
logo de la Escuela de Emprendimiento. Ver "Criterio de diseño" en `CLAUDE.md`.

Desde el 14 de septiembre de 2026, los WOFF2 se sirven localmente desde
`public/fonts/`. El encabezado y el footer comparten `Marca.astro`, con los
logos de Diseña Futuro e Intervalores. El footer enlaza solo a las webs de
ambas, no a redes sociales. Procedencia de
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

Ningún componente lee el JSON ni hace `fetch`. El adaptador lee del panel
(si hay `CMS_URL`) o del JSON, y entrega siempre el tipo `Emprendedor`.
`getBorrador()` es lo que usa la vista previa.

### Los blobs

`src/lib/blob.ts` genera las siluetas y `src/lib/blobRuntime.ts` las anima.

Cada vértice lleva **sus propios osciladores** con frecuencias, amplitudes y
fases distintas, y el radio se evalúa en cada frame. Como las frecuencias no
son múltiplos entre sí, el ciclo no se repite de forma perceptible: se lee como
líquido. (La primera versión interpolaba entre tres formas fijas y se notaba
mecánica, siempre el mismo latido de ida y vuelta.)

**Ya no reaccionan al ratón.** Hubo un abultamiento hacia el cursor y un blob
de color que recorría el listado con el scroll; Diseña Futuro pidió quitarlos
porque se leían como una mancha que perseguía a quien navegaba.

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

### El escenario del hero

`BlobHero.astro`: un blob grande que va pasando por los emprendedores cada
5.5 s. Muestra el vídeo de cada persona si existe y, si no, su foto con un zoom
lento. Es un solo blob fijo: solo cambia lo que hay dentro. Las personas salen
en orden aleatorio y cada cambio usa una transición con resorte elegida al
azar (zoom, deslizar, giro o burbuja elástica), sin repetir la anterior, y el
contorno del blob pasa a otra forma al azar con un resorte (evento
`blob:forma` de `blobRuntime.ts`). Sin barras de progreso: con orden aleatorio
no hay secuencia que mostrar. (Un blob de color
detrás que giraba, y un rebote al cambiar de escena, se quitaron porque
recordaban a la "mancha" retirada.) Una etiqueta con nombre y oficio lleva a la
ficha.

Solo entra quien tiene foto o vídeo propio (no siluetas), con prioridad para
quien tiene vídeo, hasta 8 personas. Se pausa con el puntero o el foco encima,
fuera de pantalla y con la pestaña oculta. Con movimiento reducido no avanza
solo ni reproduce vídeo.

### Animaciones de texto y entrada

`src/lib/animaciones.ts` lee `data-anim` en el HTML y monta la animación con
GSAP (SplitText + ScrollTrigger, gratis desde 3.13). Son versiones propias de
efectos de React Bits, porque este sitio no usa React:

| `data-anim` | Efecto | Dónde |
|---|---|---|
| `letras` | letras que suben desde su línea | titulares, "escuela de emprendimiento" |
| `lineas` | líneas tras una máscara | oficio en la ficha |
| `desenfoque` | palabras que entran desenfocadas (BlurText) | descripción, pie |
| `lectura` | palabras que se encienden con el scroll (ScrollReveal) | cabecera del listado |
| `subir` / `pop` | bloques que suben o crecen con rebote | intro, filtros, botones |
| `revelar` | hijos que se destapan (clip-path) | galería de productos |
| `subrayado` | el subrayado amarillo se dibuja | "apóyalos" |

`data-anim-retraso` ordena la secuencia del hero y `data-anim-hijos` anima los
hijos en cascada. Además: cinta de palabras que se acelera con la velocidad del
scroll (`CintaPalabras.astro`, el ScrollVelocity de React Bits), contador que
corre hasta el nuevo total al filtrar (CountUp), tarjetas que entran con
rebote y brillo periódico en los botones amarillos.

Reglas: nada sigue al puntero (ver "Los blobs"); los retratos nunca se
transparentan; con movimiento reducido no se anima nada. Lo marcado se esconde
hasta que GSAP fija su estado inicial, y un rescate en CSS lo muestra a los
2.5 s si el JavaScript fallara.

### El vídeo

Cada emprendedor puede tener el suyo en `src/assets/videos/<slug>.mp4`. Sin
archivo no hay vídeo. Ya no hay placeholder de stock.

- **En el hero**: es lo que se ve dentro de la gota grande cuando le toca a
  esa persona. Quien no tiene foto propia entra en la órbita con un fotograma
  de su vídeo.

- **En el listado**: entra al pasar el puntero o al enfocar con teclado. Con
  `preload="none"` el archivo no se pide hasta ese momento. En móvil no se
  activa: sin hover no hay intención, y catorce vídeos reproduciéndose solos en
  una conexión lenta sería un abuso.
- **En la ficha**: manda desde el principio, en bucle y sin sonido.

#### Con sonido y en primer plano

El vídeo del retrato es un recorte cuadrado y mudo. Cada persona puede tener
además el mismo vídeo entero y con sonido, en una o varias calidades:
`src/assets/videos/sonido/<slug>-<alto>.mp4` (por ejemplo `-1080`, `-720` y
`-480`). Con eso, en el hero y en la ficha:

- **Al pasar el puntero** por el retrato, suena, y el carrusel espera. El
  sonido sale de la versión más ligera y se mantiene a la par de la imagen,
  así que las dos versiones tienen que durar lo mismo.
- **Al pulsarlo**, su gota sale de su sitio y crece hasta casi llenar la
  ventana, con un reproductor propio: reproducir y pausar, barra de avance,
  volumen y silencio, y calidad ("Auto" elige según el tamaño en pantalla y
  la conexión, y baja un escalón si el vídeo se queda parado cargando). Se
  cierra con el aspa, con Escape o pulsando fuera.

Sin versión con sonido, se abre el propio vídeo del retrato, sin selector de
calidad. Los navegadores no dejan sonar nada hasta que la persona pulsa o
toca algo de la página: hasta entonces el altavoz del retrato sale tachado.
La lógica está en `src/lib/sonido.ts` y `src/lib/primerPlano.ts`; la pieza y
sus mandos, en `src/components/PrimerPlano.astro`. Los nombres de los mandos
salen de "Reproductor de vídeo" en los textos del sitio.

Las fotos de productos o servicios van en `src/assets/productos/<slug>/` y se
muestran en la ficha bajo "Su trabajo".

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
- Octubre 2026: iPhone 13, Pixel 5 y 320px sin scroll horizontal ni errores
  de JavaScript; el HTML generado no contiene comunidades, cantón ni nombres
  completos.
- WhatsApp de Celia (derivado del teléfono) abre con mensaje prellenado.
- Linda, sin contacto: CTA alternativo, ningún enlace `wa.me`.
- Móvil 375px: 1 columna de 335px, sin scroll horizontal.
- Desktop 1440px: 2 columnas de 601px con la derecha desfasada ~100px.
- Morph de blobs activo, sin reacción al ratón.
- Filtros: ninguna tarjeta se sale de la grilla durante la animación de Flip.
- Vídeo: entra en hover, se pausa al salir; en la ficha arranca solo.
