# Vídeos de presentación

Un archivo por emprendedor, con su slug como nombre:

    src/assets/videos/kelly-cedillo.mp4

El sitio lo detecta solo en el siguiente build: aparece dentro de la gota
grande del hero cuando le toca a esa persona, en su tarjeta del listado y en
el blob de su ficha. Sin archivo, no hay vídeo.

- Formato vertical o cuadrado, MP4 (H.264), sin audio, idealmente menos de 8 MB.
  Cuadrado es lo más seguro: todos los retratos del sitio son cuadrados y
  lo muestran entero. Con la cara un poco por encima del centro.
- Revisar antes de subir que no aparezcan menores de edad ni datos que permitan
  ubicar el negocio o la vivienda (fachadas, letreros con dirección, placas).

Estos archivos son los vídeos de partida: los usa el sitio cuando se construye
sin panel, y el panel los carga en la ficha de cada persona (en su primer
arranque, o al actualizarse si la ficha aún no tiene vídeo). Con el panel en
marcha, el vídeo se cambia desde la ficha.

## Los que hay

Salen de la carpeta "VIDEOS" del Drive de Diseña Futuro, recibida el 23 de
noviembre de 2026: entrevistas en 4K, apaisadas y con sonido, de entre 40
segundos y casi 2 minutos (150 a 780 MB cada una). El sitio los muestra en
silencio y en bucle dentro del retrato, así que de cada una se sacó un
recorte cuadrado de 720 px centrado en la persona, sin sonido y sin los
datos del archivo original:

| Archivo | Original | Tramo |
|---|---|---|
| `kelly-cedillo.mp4` | `KELLY_CEDILLO.mov` | entero (40 s) |
| `alexandra-medina.mp4` | `ALEXANDRA_MEDINA.mov` | entero (47 s) |
| `jonathan-gordillo.mp4` | `JONATHAN_GORDILLO.mov` | la última toma hablando a cámara (27 s) |
| `miriam-correa.mp4` | `MIRIAN_CORREA.mp4` | tres tomas hablando a cámara (15 s) |

- De Jonathan y Miriam el original es una pieza editada, con planos del
  trabajo. Se dejó solo a la persona hablando: el recorte cuadrado no sirve
  para los otros planos, y en el de Miriam hay uno con su familia.
- El de Miriam lleva subtítulos incrustados, con su nombre completo y su
  cuenta de redes. El recorte los deja fuera.
- ⚠️ En el de Miriam se ve al fondo una calle con edificios y gente, y en el
  de Jonathan una obra. No hay letreros legibles, pero conviene que Diseña
  Futuro confirme que no permiten ubicarlos.
- `CONSUELO_ANTEPARA.mov` no se incluyó: no hay nadie con ese nombre en el
  directorio. Falta su ficha.

## Con sonido: `sonido/`

El vídeo del retrato es mudo y cuadrado. En `sonido/` está el mismo tramo de
cada entrevista entero (apaisado, 16:9) y con su audio, en tres calidades:
`<slug>-1080.mp4`, `<slug>-720.mp4` y `<slug>-480.mp4`. Es lo que suena al
pasar el puntero por el retrato y lo que reproduce el primer plano, que deja
elegir la calidad. Duran exactamente lo mismo que el recorte cuadrado: el
sonido se le pone a la par.

- ⚠️ Nadie ha escuchado el audio para comprobar qué se dice. Antes de darlo
  por bueno, que Diseña Futuro lo oiga entero: que no se mencionen
  direcciones, teléfonos ni nombres de menores.
- ⚠️ El encuadre entero enseña más fondo que el recorte: en el de Miriam, la
  calle con casas; en el de Jonathan, la obra y una casa amarilla.
- El de Miriam son los mismos tres tramos del recorte, así que el audio son
  tres comienzos de respuesta que se cortan (con un fundido corto en cada
  corte). Sus subtítulos incrustados se ven; son solo lo que dice. Para
  tenerla hablando de corrido haría falta una toma sin editar.
- Pesan 57 MB entre todos (de 1,2 a 12 MB cada uno).

Cómo se hicieron: `-crf 25` con tope de 2000k (1080), 1100k (720) y `-crf 26`
con tope de 550k (480); audio AAC a 96k (64k en el de 480); un fotograma
clave cada 2 s para que cambiar de calidad sea rápido; sin los datos del
archivo original.

## Los recortes cuadrados

Cómo se hicieron (ffmpeg), con el recorte de cada uno:

```bash
COMUN="-an -sn -dn -map_metadata -1 -map_chapters -1 -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p -movflags +faststart"
ffmpeg -i KELLY_CEDILLO.mov -vf "crop=1600:1600:1143:324,scale=720:720:flags=lanczos" $COMUN kelly-cedillo.mp4
ffmpeg -i ALEXANDRA_MEDINA.mov -vf "crop=2160:2160:763:0,scale=720:720:flags=lanczos" $COMUN alexandra-medina.mp4
ffmpeg -ss 81.6 -to 108.2 -i JONATHAN_GORDILLO.mov -vf "crop=1600:1600:1204:0,scale=720:720:flags=lanczos" $COMUN jonathan-gordillo.mp4
# Miriam: el mismo recorte (crop=1600:1600:1120:0) sobre los tramos
# 14.9-18.8, 33.7-36.6 y 40.65-48.6, unidos con `trim` y `concat`.
```
