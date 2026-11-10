## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Criterio de diseño

Antes de añadir o cambiar algo visual o animado, pásalo por esta lista. Sale
de los catálogos de "diseño genérico" de [Impeccable](https://impeccable.style/slop),
de la skill `frontend-design` de Anthropic y de
[Hallmark](https://github.com/Nutlope/hallmark), aplicados a este sitio.

**La regla:** nada se mueve si la persona no hizo algo o algo no cambió. Y
cada recurso tiene que salir de este sitio (los blobs, el fino + grueso del
titular, el color por categoría, la nota pegada, la píldora amarilla), no de
una librería de efectos.

No usar:

- Ondas o anillos que salen de un elemento (ripple), pulsos, brillos que
  cruzan un botón, flechas que rebotan solas ni nada que se anime en bucle
  para llamar la atención.
- Círculos que se abren desde el clic, cortinas o barridos entre páginas. La
  transición es el retrato y el nombre viajando a su ficha (`transition:name`).
- Rótulo pequeño encima de un titular (antetítulo, "eyebrow"), ni en
  mayúsculas espaciadas. Si aporta algo, va dentro del titular.
- Sellos de texto giratorio, cursores personalizados, nada que siga al
  puntero (esto último lo pidió quitar Diseña Futuro).
- Aparecer-al-hacer-scroll en cada bloque, parallax en cada sección, y un
  efecto al pasar el puntero distinto en cada elemento.
- Numerar cosas que no son una secuencia, degradados en texto, resplandores,
  vidrio esmerilado y siluetas o iconos genéricos de relleno.

Sí:

- Movimiento que explica un cambio: la píldora que se desliza al filtro
  elegido, las tarjetas que se reordenan, el retrato que viaja a su ficha.
- Una sola secuencia orquestada al cargar cada página.
- Tipografía como recurso principal: fino + grueso en la misma frase.
- Antes de dar algo por terminado, quitar un elemento.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
