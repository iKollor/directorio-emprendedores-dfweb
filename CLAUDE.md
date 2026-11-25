## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Contenido

Los datos salen del panel de `cms/` (Payload + SQLite) cuando existe
`CMS_URL`, y de `src/data/emprendedores.json` cuando no. La única puerta es
`src/lib/directorio.ts`. La ficha es `src/components/Ficha.astro`, compartida
por la página pública y por la vista previa del panel
(`src/pages/vista-previa/`). Los textos y logos que no son de una ficha
salen de `src/lib/sitio.ts` (de partida, `src/data/sitio.json`): ningún
componente escribe un texto visible por su cuenta. Ver "El panel de
contenido" en el README.

## Criterio de diseño

Antes de añadir o cambiar algo visual o animado, léelo entero. El sitio tiene
UNA idea y todo sale de ella; lo que no salga de ella, no entra.

**La idea.** Cada retrato es una gota de vidrio líquido. El blob ya era la
forma de la marca; el material le da volumen: la foto se refracta en el
borde, aparece un filo de color, hay un brillo de luz. Fuera de foco, la gota
es vidrio esmerilado en la tinta azul de la escuela; cuando recibe atención,
enfoca y toma color.

**Solo óptica.** Todo lo que pasa con una imagen es lo que haría una lente:
refracción, dispersión, enfoque. Para pasar de una persona a otra en el hero
hay un cambio de foco. No hay barridos, cortinas, páginas que se doblan,
puntos que crecen ni disolvencias: eso es lenguaje de editor de vídeo.

**Un material.** Todo efecto de imagen es `src/lib/tinta.ts` (WebGL, un solo
shader). No añadas otro: si hace falta algo nuevo, es un parámetro de ese
material. El canto de la gota es fino a propósito: el volumen lo dan la luz
y la sombra, que no mueven la imagen. Cuándo enfoca cada retrato está en `src/lib/retratos.ts`; el hero,
en `BlobHero.astro`. La silueta que usa el shader sale de `src/lib/blob.ts`.

**Un solo carrusel: la órbita del hero.** La gota grande de la portada va
pasando por las personas y, a su alrededor, hay una gota por cada una de las
demás (`BlobHero.astro`). Es el mismo vidrio (modo sistema de `tinta.ts`, un
solo lienzo) y lo que cuenta es la PROFUNDIDAD, con medios de lente. Las
lunas forman una cola sobre un arco abierto que rodea el retrato por arriba
y por la derecha: la última, arriba a la izquierda, es pequeña, esmerilada y
azul, con el borde también desenfocado, y asoma por detrás de la gota
grande; la primera, abajo a la derecha, es grande (casi el 40 % del
retrato), está enfocada y a color, y proyecta su sombra sobre el retrato.
Las lunas NO se pegan a la gota grande: son gotas sueltas. Solo se funde la
que le toca: en el frente crece, se forma el cuello y las dos son un solo
líquido; la gota cambia de silueta, hace su cambio de foco y suelta a la
anterior, que sale por detrás, al fondo de la cola. La cola es un reloj: la
siguiente persona llega al frente justo cuando le toca. El arco es abierto
porque abajo a la izquierda está el cartel: con un anillo cerrado las lunas
pasaban por debajo de él, tapadas, y se pidió cambiarlo. Su frente se
calcula con la medida del cartel, y ninguna luna pasa por encima del texto
de la portada ni se sale de la página. En el teléfono lo primero es el logo
de la escuela, grande, casi a todo lo ancho (se pidió así), y justo debajo
el retrato, centrado: una persona, grande, con su nombre. Alrededor solo se ve la
luna de la siguiente persona y, asomando, la de después (toda la cola junto a
un retrato pequeño era ruido); las demás nacen al acercarse. El cartel no va
encima del retrato sino colgando de su canto inferior, como el de las
tarjetas. Debajo van el titular, el botón y el párrafo (`Portada.astro`).
Se probó con la marca Y el titular encima del retrato y no gustó: tres
títulos apilados antes de ver a nadie. El logo solo, encima, sí. No lleva botones de anterior y siguiente (hubo dos
flechas amarillas y se pidió quitarlas): se toca lo que se ve. Una luna trae
a esa persona; arrastrar o deslizar tira de la cola; y con el teclado,
flechas izquierda y derecha. Pulsar el retrato grande abre su vídeo en
primer plano (antes pasaba de persona, como en unas historias). El carrusel es un
grupo con nombre para los lectores de pantalla, cada luna es un botón con
área de toque de 48 px y enseña su nombre al mirarla, y los cambios que hace
la persona se anuncian. La gota grande no se mueve de su sitio. Debajo hubo una franja
de vídeos en carrusel ("En sus propias palabras") y se quitó: repetía lo que
ya hacen el hero y el listado. No añadas otro carrusel a la portada.

**El primer plano: la gota se acerca.** Los retratos con vídeo suenan y se
abren (`src/lib/sonido.ts`, `src/lib/primerPlano.ts`, `PrimerPlano.astro`).
Con el puntero encima de cualquier retrato con vídeo (el del hero, el de la
ficha y las tarjetas del listado), su vídeo se ve y suena, y el carrusel
espera. Pulsar abre el primer plano solo en el hero y en la ficha: en el
listado, la tarjeta lleva a la ficha. Al pulsarlo, su gota sale de su sitio y crece hasta casi
llenar la ventana: NO es pantalla completa, alrededor se sigue viendo la
página, fuera de foco. El borde sigue siendo de gota: parte de la silueta del
retrato y se vuelve una pantalla (una superelipse con la proporción del
vídeo, simétrica para no comerse la imagen) que sigue respirando. El paso del
recorte cuadrado al vídeo entero es un cambio de foco; el retrato que queda
atrás vuelve a la tinta y enfoca cuando la gota regresa. EL SONIDO ES UNA
SOLA PISTA (`src/lib/voz.ts`): lo que suena al pasar el puntero y lo que
suena en el primer plano es la misma reproducción, así que al pulsar un
retrato que ya suena no se corta ni vuelve a empezar, y al cerrar con el
puntero encima sigue sonando. Todo cambio de volumen es un fundido, nunca un
escalón. Para ir a la par, el sonido no se recoloca nunca (cada recolocación
es un corte): es el retrato, que es mudo, el que acelera o frena un poco.
Cambiar de calidad tampoco corta: la nueva carga en un segundo vídeo, que
echa a andar EN SILENCIO a la par del primero y, cuando ya van clavados, se
cruzan con la suma de volúmenes siempre en 1 (`cruzar`). Arrancarlo en el
mismo instante del relevo dejaba un hueco: lo que tarda un vídeo en echar a
andar. Por lo mismo, al pasar el puntero por el hero o la ficha suena ya la
calidad con la que se abriría el primer plano (`calidadDeEntrada`), no la
más ligera: al abrir no hay nada que cambiar. Y UNA PERSONA, UNA PISTA: si
la voz ya tiene cargada cualquier calidad de esa persona, se sigue con esa.
Al cerrar no se descarga: se queda en pausa, y si el puntero vuelve al
retrato continúa la misma (antes se cargaba otra desde cero y el sonido se
apagaba y volvía a entrar). Si la voz se queda cargando (red lenta), el retrato NO la
espera: sigue a su aire y se coloca una sola vez donde va ella cuando vuelve
a andar; esperándola se quedaba clavado, y parecía que pasar el puntero
pausaba el vídeo. Una luna que se está fundiendo con la gota grande no es un
botón: está encima del retrato, medio invisible, y se llevaba su clic. Los mandos son los de cualquier reproductor (reproducir, avance,
altavoz y nivel, calidad con "Auto", cerrar) vestidos con el material del
sitio: píldora de vidrio, lo andado es una pincelada amarilla y el tirador,
una gota. El retrato lleva un altavoz de vidrio (`.boton-icono.vidrio`) que
dice si suena y ES UN INTERRUPTOR DE SONIDO, como el de cualquier
reproductor: pulsarlo lo pone o lo quita. NO abre el primer plano (lo hacía,
y quien lo pulsaba para habilitar el sonido se encontraba con el
reproductor); abrirlo es pulsar el retrato, que es un botón también para el
teclado (Intro). Con el dedo o el teclado no hay "pasar por encima": lo que
se pone con el altavoz suena hasta que se quita, se cambia de persona o el
retrato sale de la pantalla, y mientras tanto el carrusel espera. Quitarlo
con el puntero encima silencia de verdad (el mismo silencio del reproductor,
que se recuerda), porque si no volvería a sonar al momento. Dos cosas que no se
pueden saltar: el navegador no deja sonar nada antes del primer gesto de la
persona (hasta entonces el altavoz sale tachado), y el vídeo con sonido
(`videoSonido`, en `src/assets/videos/sonido/` o en la ficha del panel) tiene
que durar lo mismo que el del retrato, porque el sonido se le pone a la par.
No añadas otro visor ni un lightbox: si algo más tiene que verse en grande,
es esta misma pieza.

**En la mano.** En un teléfono de pie, un vídeo apaisado a su proporción es
una tira en mitad de una pantalla vacía. Ahí la gota del primer plano es alta
(hasta 4:5) y recorta el vídeo por los lados con la persona en el centro,
como cualquier vídeo vertical de teléfono; girando el teléfono se ve el
encuadre entero. Debajo va el cartel de la persona (el mismo del hero, que
lleva a su ficha) y, pegados al borde inferior, los mandos, al alcance del
pulgar: la barra de avance a todo lo ancho y, debajo, silencio, reproducir
(grande, en el centro) y calidad. La gota se devuelve con el dedo:
arrastrarla hacia abajo la encoge hacia su retrato y, al soltarla, vuelve a
su sitio. El primer plano no es pantalla completa, pero lleva el botón de la
pantalla completa de verdad, la del sistema: ahí ya no hay gota, solo el
vídeo entero con los mandos encima (en el iPhone la pone su propio
reproductor: el sistema no deja otra). Los controles de rango se visten con
piezas aparte, nunca con `::before` o `::after` del propio control: en el
iPhone no se dibujan. En el listado, el sitio es para las caras: quien tiene retrato lo
lleva a todo lo ancho y quien todavía no (sale con sus iniciales) va en una
fila corta, con las iniciales al lado del cartel.

**Una curva.** Todo lo que entra sube un poco y se asienta con `expo.out`
(`CURVA` en `src/lib/animaciones.ts`). Sin rebotes, giros ni desenfoques de
texto. El único elástico del sitio es el contorno de los blobs.

**El puntero mueve el borde, nunca la imagen.** Pasar por encima de un
retrato lo enfoca, y al acercarse a su borde la gota responde como una gota:
el borde se estira hacia el puntero, conserva su volumen y tiembla al
soltarla (`src/lib/blobRuntime.ts`, se apaga con `GOTA_INTERACTIVA`). La foto
de dentro no se deforma con el puntero: eso se pidió quitar expresamente.
Tampoco hay nada que siga al cursor por la página.

**La misma luz en todo.** La luz viene de arriba a la izquierda. Botones,
píldoras y puntos llevan el brillo y la sombra interior de una gota
(`--gota` en `src/styles/tokens.css`), hechos con sombras, no con WebGL.
El favicon también (`public/icon.svg`): una gota plana con la E del
logo de la escuela, gruesa para leerse a 16 px y sin pincelada (debajo se
leía como una boca), azul en modo claro y amarilla en modo
oscuro, con solo un reflejo difuso (se rechazaron las versiones con brillos y
bordes de luz por exageradas). El resto de iconos sale de él con `node scripts/favicon/generar.mjs`;
ver "Favicon" en `public/brand/FUENTES.md`.

**El fondo es el de Diseña Futuro: plano, con formas.** Su sitio es azul
liso con formas grandes de color que asoman por los bordes y una estrella
verde. Eso es `src/components/Forma.astro`: blobs y estrellas, formas llenas.
Su sitio usa además trazos gruesos en arco; aquí los hubo y Diseña Futuro
pidió quitarlos: ninguna línea curva de fondo. Cada forma acompaña a algo (un
retrato, un titular). En el listado solo algunas tarjetas llevan forma detrás
del retrato, un blob o una estrella (`src/lib/acentos.ts`). Entran una vez,
al asomar, creciendo desde su centro (`forma` en `src/lib/animaciones.ts`).
Nada de texturas, degradados ni fondos animados con shaders: se probaron dos
(uno casi invisible y uno de agua con cáusticas) y los dos se rechazaron por
no ser de la marca. Las formas de color claro (rosa, cian, amarillo, verde)
van solo donde no puede caer texto, como detrás de un retrato; donde puede
pasar texto por encima, van en azul hondo.

**La letra a pincel es la del logo de la escuela, y solo para rótulos.** El
logo de la Escuela de Emprendimiento está pintado a mano, en blanco y
amarillo, como el rótulo de un negocio de barrio. La clase `.pincel`
(`src/styles/tokens.css`, tipografía Amatic SC, elegida por Diseña Futuro)
escribe con esa letra las pocas frases que el sitio dice en voz alta: la
cinta de palabras (un renglón blanco y otro amarillo, como el logo), la
llamada de cada tarjeta, "Conoce también a" y el lema de la escuela en el pie
("Ideas locales. Nuevas oportunidades.", bajo su logo, también en blanco y
amarillo). No es para leer ni para la interfaz: titulares, textos,
botones y filtros siguen en General Sans, con su fino + grueso. No se usa
para destacar una palabra dentro de un titular. Va siempre grande, en blanco
o en amarillo (o en azul sobre el cartel claro). El subrayado amarillo es
una pincelada (`.pincelada`), no una barra recta. En la portada el logo es la
marca de la casa y va GRANDE, recto, justo bajo la cabecera (se pidió así;
antes era una firma pequeña y torcida). Con el titular forma un solo bloque,
el rótulo: el logo mide EXACTAMENTE lo que el titular (`width: 0;
min-width: 100%` en `NombreEscuela.astro`), así sus bordes coinciden; uno
casi igual de ancho se lee como un error. El titular, y con él el logo, baja
con la altura de la pantalla para que el botón quepa en la primera. En la
portada los logos de las organizaciones van a la derecha de la cabecera y no
hay menú (`portada` en `Base.astro`); en las demás páginas, a la izquierda.

**La barra: el logo se queda arriba.** Al bajar por la portada, el logo
grande se encoge con el propio desplazamiento hasta caber en una barra fija
arriba (`src/lib/barra.ts`): una píldora de vidrio azul, el material de los
mandos del reproductor, con el logo a la izquierda (lleva al inicio) y, a la
derecha, los logos de Diseña Futuro e Intervalores, que llevan a sus webs en
otra pestaña (hubo enlaces de texto a los emprendedores y a la escuela, y se
pidió cambiarlos por los logos). El logo llega primero y después
aparece el vidrio a su alrededor: si apareciera antes, lo taparía (la barra
va por encima de la página). Va atado al desplazamiento, no a un reloj, así
que se para y vuelve donde se pare la persona. En las demás páginas la barra
entra al pasar la cabecera, y con movimiento reducido no hay encogido.
Escondida, no se enfoca ni se pulsa. Una sola imagen del logo a la vez.

**La primera pantalla dice una cosa.** Marca, titular, un párrafo y un botón.
Llevó además una frase de cierre subrayada y un lema a pincel al pie, y se
pidió limpiarla: eran cinco textos compitiendo. El lema volvió, pero al pie
de página, bajo el logo de la escuela. No le añadas frases; si hay
algo más que decir, va más abajo.

**Patrones conocidos antes que rótulos (Ley de Jakob).** La gente pasa casi
todo su tiempo en otras aplicaciones y espera que esta funcione igual, así
que una acción que ya reconoce por su forma no necesita explicación ni un
botón con texto. El ejemplo que fija el criterio: el mensaje de WhatsApp de
la ficha es la caja de escribir de WhatsApp, con el mensaje ya puesto, su
botón verde de enviar dentro de la caja y el sello de WhatsApp en la
esquina; quien ha usado WhatsApp sabe qué pasa al tocarlo.
Antes eran tres piezas: el mensaje, una línea que lo explicaba y un botón
"Escribir por WhatsApp". Al añadir o revisar cualquier acción:

- Si existe un patrón que la gente ya conoce (enviar un mensaje, llamar a un
  número, reproducir un vídeo, pasar al siguiente, volver arriba), se usa
  ese patrón con su icono y no se escribe lo que el icono ya dice.
- El icono es un significante: tiene que ser el que se usa en todas partes
  para eso, no uno ingenioso. Todos salen de `src/components/Icono.astro`,
  de una sola familia.
- El texto que se quita de la pantalla pasa al nombre accesible
  (`aria-label` o `.solo-lectores`). Nunca un icono sin nombre.
- Un elemento, una acción: si la burbuja, la flecha y el retrato llevan al
  mismo sitio, son un solo enlace.
- No se quita el texto que pidió Diseña Futuro (la llamada de cada tarjeta,
  "¡Conoce a los emprendedores!"), aunque un icono pudiera sustituirlo.
- Para acciones redondas de icono hay una sola pieza: `.boton-icono`.
- Buscar es el campo de búsqueda de siempre: la lupa dentro, el texto de
  ayuda y un aspa para borrar (`.boton-icono.vidrio`), encima de las
  categorías del listado. Busca en el nombre, el negocio, la categoría y la
  descripción, sin tildes ni mayúsculas, y si hay varias palabras tienen que
  estar todas; se suma a la categoría elegida. La comunidad no se busca: la
  ubicación no se publica.

**Sin género al hablar de una persona.** El sitio no sabe si cada quien es
emprendedor o emprendedora, y no se le pregunta. Todo lo que se refiere a
una sola persona se escribe sin género: "¡Conoce su negocio!" (antes
"¡Conócelo!", que salía también en las fichas de mujeres), "Conoce cada
historia", "1 emprendimiento", "con certificado de", "Escríbele". Vale
también para lo que solo oyen los lectores de pantalla y para las
descripciones de buscadores. "Emprendedores", en plural, es el nombre del
directorio y del programa, y se mantiene.

**El rostro, al centro.** Las fotos son apaisadas y la cara cae arriba, justo
en el canto de la gota. Cada persona lleva en el JSON un campo `rostro`
(`x`, `y` de 0 a 1 sobre su foto) y el encuadre se centra ahí; ver `ROSTRO`
en `src/lib/directorio.ts`. Al añadir una foto, hay que ponerlo.

No usar:

- Varias transiciones distintas para lo mismo, o elegidas al azar.
- Trazos o líneas curvas de fondo (el arco de Diseña Futuro): se pidió
  quitarlos. Solo formas llenas.
- La letra a pincel en textos para leer, en botones o en letra pequeña.
- Ondas o anillos que salen de un elemento (ripple), pulsos, brillos que
  cruzan un botón, flechas que rebotan, cintas que corren solas.
- Círculos que se abren desde el clic o cortinas entre páginas. La transición
  es el retrato y el nombre viajando a su ficha (`src/lib/viaje.ts`).
- Fundir una página con otra, o la imagen vieja de una pieza con la nueva:
  deja textos fantasma y nombres dobles. Una página se apaga y la otra se
  enciende; de lo que viaja vuela una sola imagen (reglas en `tokens.css`).
- `transition:name` en listas: el navegador saca una foto aparte de cada
  elemento nombrado. Los nombres los pone `viaje.ts`, solo a lo que viaja.
- Entradas en mitad del vuelo. Al cambiar de página, primero vuelan el
  retrato y el nombre y después entra lo demás (`src/lib/aterrizaje.ts`); si
  no aterriza nada, lo demás entra ya. Lo que recibe una pieza que vuela no
  hace su propia entrada. Y lo que ya está en pantalla entra sin esperar a un
  ScrollTrigger: calculado con la página a medio cambiar, alguno no disparaba
  y dejaba un titular escondido.
- Rótulo pequeño encima de un titular (antetítulo), ni en mayúsculas
  espaciadas. Si aporta algo, va dentro del titular.
- Sellos de texto giratorio, cursores personalizados, degradados en texto,
  siluetas o iconos genéricos de relleno, numerar lo que no es una secuencia.
- Acercamientos lentos hechos con `transform`: avanzan fracciones de píxel
  por fotograma y tiemblan. Van en el shader.
- Mezclar una imagen nítida con otra, aunque sea dentro del vidrio. Cuando
  una luna se funde con la gota grande o se suelta de ella, esa zona se
  desenfoca primero y después cambia de imagen: es otro cambio de foco.
- Filtros del listado que bajan en varias líneas en el teléfono: allí cada
  grupo es una fila que se desliza de lado hasta el borde de la pantalla, y
  el botón elegido se corre a la vista.
- Hacer volar las tarjetas al filtrar. El listado cambia como en una
  herramienta de trabajo: lo que hay se apaga, la lista cambia sin que se
  vea y lo nuevo entra subiendo un poco. Con cada tarjeta viajando a su
  sitio nuevo, los retratos se pisaban a medio camino. Tampoco hay píldora
  que se deslice entre filtros: el elegido se marca al instante.
- Buscar el retrato de una tarjeta con `.blob` a secas: la forma de adorno
  que algunas llevan detrás también lo es y va antes. Es `.retrato .blob`.
- Saltar al final de un movimiento para empezar otro. Cada luna lleva su
  propio movimiento y se puede interrumpir donde esté; si llegan dos cambios
  seguidos, sigue desde ahí.

Rendimiento, que es parte del diseño: un solo contexto WebGL para todos
los retratos, que entrega cada dibujo a su lienzo sin copiarlo
(OffscreenCanvas + `transferToImageBitmap`; copiar con `drawImage` traía
cada dibujo de la tarjeta gráfica y daba saltos en Firefox), se pinta solo lo visible, en reposo a media cadencia, y un freno baja la resolución si el
dispositivo no llega. Un vídeo no trae niveles pequeños (mipmaps): mientras
se lee desenfocado, su fotograma se copia a una textura cuadrada que sí los
tiene; desenfocar el vídeo tal cual da ruido y rayas. Sin WebGL o con movimiento reducido quedan las fotos
normales. Cualquier cambio en `tinta.ts` debe conservar eso.

Referencias: [refracción y dispersión, Maxime Heckel](https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/),
[vidrio refractivo con SDF](https://zenn.dev/orectic/articles/liquid-glass-webgl-refraction?locale=en),
[Impeccable](https://impeccable.style/slop), la skill `frontend-design` y la
[Ley de Jakob](https://lawsofux.com/jakobs-law/).

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
