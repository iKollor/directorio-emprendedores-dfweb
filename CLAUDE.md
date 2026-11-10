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

**El fondo es agua.** `src/lib/fondo.ts` dibuja zonas apenas más hondas y un
veteado de luz en el azul de la marca. No puede bajar el contraste del texto:
el azul de la marca es su tono más claro salvo un 3 % de veteado. Si se
tocan sus valores, hay que recalcular el contraste del texto hueso (4.5:1).

**El rostro, al centro.** Las fotos son apaisadas y la cara cae arriba, justo
en el canto de la gota. Cada persona lleva en el JSON un campo `rostro`
(`x`, `y` de 0 a 1 sobre su foto) y el encuadre se centra ahí; ver `ROSTRO`
en `src/lib/directorio.ts`. Al añadir una foto, hay que ponerlo.

No usar:

- Varias transiciones distintas para lo mismo, o elegidas al azar.
- Ondas o anillos que salen de un elemento (ripple), pulsos, brillos que
  cruzan un botón, flechas que rebotan, cintas que corren solas.
- Círculos que se abren desde el clic o cortinas entre páginas. La transición
  es el retrato y el nombre viajando a su ficha (`transition:name`).
- Rótulo pequeño encima de un titular (antetítulo), ni en mayúsculas
  espaciadas. Si aporta algo, va dentro del titular.
- Sellos de texto giratorio, cursores personalizados, degradados en texto,
  siluetas o iconos genéricos de relleno, numerar lo que no es una secuencia.
- Acercamientos lentos hechos con `transform`: avanzan fracciones de píxel
  por fotograma y tiemblan. Van en el shader.

Rendimiento, que es parte del diseño: dos contextos WebGL en total (los
retratos comparten uno; el fondo tiene el suyo, a un tercio de resolución y
30 fotogramas por segundo), se pinta solo lo visible, en reposo a media cadencia, y un freno baja la resolución si el
dispositivo no llega. Sin WebGL o con movimiento reducido quedan las fotos
normales. Cualquier cambio en `tinta.ts` debe conservar eso.

Referencias: [refracción y dispersión, Maxime Heckel](https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/),
[vidrio refractivo con SDF](https://zenn.dev/orectic/articles/liquid-glass-webgl-refraction?locale=en),
[Impeccable](https://impeccable.style/slop) y la skill `frontend-design`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
