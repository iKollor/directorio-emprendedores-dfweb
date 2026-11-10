## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Criterio de diseño

Antes de añadir o cambiar algo visual o animado, léelo entero. El sitio tiene
UNA idea y todo sale de ella; lo que no salga de ella, no entra.

**La idea.** El directorio está impreso en la tinta azul de la escuela. Los
retratos llegan en esa tinta (tres tonos de la marca y trama de puntos) y
pasan a color vivo allí donde va la atención, a través de un frente líquido.
Ese mismo frente releva a una persona por otra en el hero.

**Un material.** Todo efecto de imagen es `src/lib/tinta.ts` (WebGL, un solo
shader). No añadas otro efecto de imagen: si hace falta algo nuevo, es un
parámetro de ese material. Cuándo se revela cada retrato está en
`src/lib/retratos.ts`; el hero, en `BlobHero.astro`.

**Una curva.** Todo lo que entra sube un poco y se asienta con `expo.out`
(`CURVA` en `src/lib/animaciones.ts`). Sin rebotes, giros ni desenfoques. El
único elástico del sitio es el contorno de los blobs, que es líquido.

**Nada se mueve solo.** El movimiento responde a algo: la carga de la página,
el scroll, un clic, el puntero. La única excepción es el relevo de personas
del hero. En reposo, el lienzo no dibuja ni un fotograma.

No usar:

- Varias transiciones distintas para lo mismo, o elegidas al azar.
- Ondas o anillos que salen de un elemento (ripple), pulsos, brillos que
  cruzan un botón, flechas que rebotan, cintas que corren solas.
- Círculos que se abren desde el clic, cortinas o barridos entre páginas. La
  transición es el retrato y el nombre viajando a su ficha (`transition:name`).
- Rótulo pequeño encima de un titular (antetítulo), ni en mayúsculas
  espaciadas. Si aporta algo, va dentro del titular.
- Sellos de texto giratorio, cursores personalizados, nada que siga al
  puntero (lo pidió quitar Diseña Futuro). La estela de la tinta responde al
  movimiento del puntero sobre un retrato y vuelve sola a su sitio: con el
  puntero quieto no hay nada deformado. Se apaga con `ARRASTRE = 0` en
  `retratos.ts`.
- Degradados en texto, resplandores, vidrio esmerilado, siluetas o iconos
  genéricos de relleno, numerar lo que no es una secuencia.

Rendimiento, que es parte del diseño: un solo contexto WebGL, se pinta solo
lo visible y solo cuando cambia, sin WebGL o con movimiento reducido quedan
las fotos normales. Cualquier cambio en `tinta.ts` debe conservar eso.

Referencias: [Impeccable](https://impeccable.style/slop), la skill
`frontend-design` de Anthropic y [Hallmark](https://github.com/Nutlope/hallmark).

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
