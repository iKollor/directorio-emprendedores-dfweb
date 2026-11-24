## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

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
de la portada ni se sale de la página. En el teléfono el retrato va centrado
para dejarles sitio. No lleva botones de anterior y siguiente (hubo dos
flechas amarillas y se pidió quitarlas): se toca lo que se ve. Una luna trae
a esa persona; el retrato grande pasa a la siguiente o, en su tercio
izquierdo, a la anterior, como en unas historias; arrastrar o deslizar tira
de la cola; y con el teclado, flechas izquierda y derecha. El carrusel es un
grupo con nombre para los lectores de pantalla, cada luna es un botón con
área de toque de 48 px y enseña su nombre al mirarla, y los cambios que hace
la persona se anuncian. La gota grande no se mueve de su sitio. Debajo hubo una franja
de vídeos en carrusel ("En sus propias palabras") y se quitó: repetía lo que
ya hacen el hero y el listado. No añadas otro carrusel a la portada.

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
llamada de cada tarjeta, "Conoce también a" y el lema de la portada. No es para leer ni para la interfaz: titulares, textos,
botones y filtros siguen en General Sans, con su fino + grueso. No se usa
para destacar una palabra dentro de un titular. Va siempre grande, en blanco
o en amarillo (o en azul sobre el cartel claro). El subrayado amarillo es
una pincelada (`.pincelada`), no una barra recta. En la portada el logo va
grande y un punto torcido, como el cartel del retrato.

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

Rendimiento, que es parte del diseño: un solo contexto WebGL para todos
los retratos, que entrega cada dibujo a su lienzo sin copiarlo
(OffscreenCanvas + `transferToImageBitmap`; copiar con `drawImage` traía
cada dibujo de la tarjeta gráfica y daba saltos en Firefox), se pinta solo lo visible, en reposo a media cadencia, y un freno baja la resolución si el
dispositivo no llega. Sin WebGL o con movimiento reducido quedan las fotos
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
