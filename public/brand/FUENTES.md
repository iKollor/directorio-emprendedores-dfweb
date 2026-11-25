# Recursos de marca

## Diseña Futuro

Recuperados del sitio oficial https://disenafuturo.com/ el 14 de septiembre de 2026.

- `disena-futuro.webp`: logo blanco completo, servido por el CDN del sitio. Fuente: https://i-p.rmcdn.net/65317432e28b0a0021a9e424/5023001/image-16cdde07-f2e3-430f-a175-86e8b68066eb.png?w=608&e=webp&nll=true&cX=0&cY=77&cW=774&cH=265
- El favicon ya no es el de Diseña Futuro (su nube): ver "Favicon", más abajo.

El logo se conserva sin redibujarlo. Sigue pendiente recibir el original vectorial y el manual de marca.

## Escuela de Emprendimiento

Recibido de Diseña Futuro el 23 de noviembre de 2026 como `logo_escuela.ai`.

- `escuela-emprendimiento.webp`: el logo tal cual, con sus colores (blanco y
  amarillo, pensado para fondo azul), recortado a su contorno y con fondo
  transparente. 960 px de ancho.
- El vectorial está en `src/assets/marca/escuela-emprendimiento.svg`.

## Intervalores

Recibido el 23 de noviembre de 2026 en la carpeta "Logos Intervalores
actualiza.": el logo horizontal con su leyenda (`Logo completo.ai`), el
vertical (`Verticla 2.ai`) y cuatro PNG.

- `intervalores.webp`: el logo horizontal oficial **a una tinta, en blanco**,
  recortado a su contorno y con fondo transparente. 220 px de alto.
- Los vectoriales, con sus colores oficiales (tinta `#262631` y magenta
  `#F00080`), están en `src/assets/marca/intervalores.svg` y
  `intervalores-vertical.svg`.

⚠️ La carpeta no trae versión para fondo oscuro: todas son en tinta y
magenta, que sobre el azul del sitio no se leen (contraste 2,4 y 1,5). La
blanca se sacó del vectorial oficial cambiando solo el color, sin tocar las
formas; la propia carpeta trae una versión a una tinta (`Logos-23.png`).
**Hay que confirmarla con Intervalores** o pedirles su versión en negativo.

## Cómo se generaron

Los `.ai` son PDF por dentro. Con `pdftocairo` (Poppler) e ImageMagick:

```bash
pdftocairo -svg "Logo completo.ai" intervalores.svg
pdftocairo -png -transp -r 300 "Logo completo.ai" completo
convert completo-1.png -trim +repage -channel RGB -fill white -colorize 100 +channel \
  -resize x220 -define webp:lossless=true intervalores.webp
pdftocairo -png -transp -r 200 logo_escuela.ai escuela
convert escuela-1.png -trim +repage -resize 960x -define webp:lossless=true escuela-emprendimiento.webp
```

Si se cambia un archivo, hay que poner su medida nueva en `src/data/sitio.json`
(`logoAncho`, `logoAlto`). Estos archivos son los logos de partida: los carga
el panel en su primer arranque y los usa el sitio cuando se construye sin panel.

## Iconos

Los iconos de enviar, teléfono, reproducir y sonido (`src/components/Icono.astro`) son
del conjunto **Plump Solid - Free**, de [Streamline](https://www.streamlinehq.com/icons/plump-solid-free),
con licencia [Creative Commons Atribución 4.0](https://creativecommons.org/licenses/by/4.0/).
La licencia pide reconocer la autoría: este archivo es ese reconocimiento. Si
el sitio llega a tener una página de créditos, hay que repetirlo allí.

El de reproducir es el triángulo del icono "Button Play Circle", sin su círculo.
Los de pantalla completa son "Arrow Expand" y "Exit Full Screen".
El de sonido es "Volume Level High"; el de silencio es ese mismo altavoz con
un aspa en lugar de las ondas. Los de pausa y cerrar no están en el conjunto
gratuito: se dibujaron para este sitio con el mismo trazo grueso y redondeado.
El logotipo de WhatsApp es marca de WhatsApp LLC y se usa solo para indicar
que el mensaje se envía por esa aplicación.

## Favicon

Es de la Escuela de Emprendimiento: una gota como las formas del sitio
(`src/lib/blob.ts`, semilla "emprendimiento") con la E de "ESCUELA",
recortada del logo pintado a mano (`escuela-emprendimiento.webp`),
vectorizada y engrosada con un pincel redondo hasta que a 16 px sus trazos
miden 2 px (el 20 % del alto de la letra). En modo claro, la gota es azul con
la E blanca; en modo oscuro, amarilla con la E azul hondo.

Llevó también la pincelada amarilla debajo de la E y se quitó: a tamaño de
pestaña se leía como una boca y la gota parecía una cara, y la E, más fina,
casi desaparecía.

Es plana, como el sitio: solo lleva un reflejo difuso arriba a la izquierda,
que se apaga sin dejar borde, y una sombra leve abajo. Se probaron versiones
con degradados, brillos, filo de luz en el canto y borde de color, y se
rechazaron por exageradas: no añadas efectos.

- `/icon.svg`: el original, adaptativo.
- `scripts/favicon/icono-lleno.svg`: la misma gota sobre hueso, opaca, para el
  iPhone y Android.
- `/favicon.ico`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png` y
  `/icon-mask.png`: salen de los dos con `node scripts/favicon/generar.mjs`.
  No se editan a mano.

Contraste medido: en modo claro, la gota contra una pestaña blanca y la E
contra la gota, entre 5,4 y 7,5:1; en modo oscuro, la gota contra una pestaña
oscura entre 6,4 y 10,4:1, y la E contra ella entre 5,6 y 6,8:1.
