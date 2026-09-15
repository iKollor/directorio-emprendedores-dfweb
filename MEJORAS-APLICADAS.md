# Mejoras de diseño — 14 de septiembre de 2026

## Ajuste posterior: blobs opacos y snap

- Se eliminó la opacidad del viajero y de las tarjetas pendientes; las entradas y filtros usan desplazamiento/escala sin transparentar los retratos.
- El viajero comienza con blur en el SVG y lo reduce a cero al alcanzar el primer emprendedor. El resto del recorrido permanece nítido.
- Se retiraron los fondos de los filtros y del contador.
- En escritorio, el paso entre columnas se distribuye en la mitad del intervalo entre filas: ya no cruza todo el ancho en solo 12vh. El snap comparte estas mismas coordenadas y se registra al terminar cada pareja; en móvil hay uno por persona. Una pareja incompleta también tiene parada.
- Snap de proximidad más suave: 10% de umbral, 550 ms de espera y 1.2 s de duración. Las instancias antiguas se detienen antes de destruirlas para que un callback pendiente no mueva el scroll.
- Verificación inicial: opacidad 1, blur de 4 a 0 unidades SVG, fondos transparentes, 7 paradas de escritorio y 14 móviles; al filtrar Sabanilla, 3 personas y 2 paradas de escritorio. Compilación y tipos sin errores.

La medición Lighthouse que figura más abajo corresponde a la revisión anterior a este ajuste visual.

## Implementado

- **Hero:** el tamaño inicial del viajero se calcula a partir de los límites del path SVG y el bloque de texto, con margen adicional. Se recalcula al redimensionar y al cargar las fuentes. En escritorio se midieron 1284 × 692 px de silueta frente a 1120 × 564 px de texto.
- **Filtros:** la grilla reserva la mayor altura durante Flip y se contrae después de terminar la salida de tarjetas. Los clics rápidos completan el estado previo antes de medir el siguiente. Se reasignan las columnas según los resultados; se limpia la altura temporal al terminar.
- **Recorrido:** destinos medidos sin transformaciones de entrada/hover, interpolación suave por tramo, giros leves y desplazamiento alterno entre columnas. El recorrido se sincroniza con la distancia vertical de scroll y se oculta mientras se filtra o no hay coincidencias.
- **Listado:** título visible, filtros con área táctil de al menos 44 px, contador accesible, limpiar filtros y estado vacío con botón para restablecerlos. Los controles conservan un fondo legible cuando pasa el viajero.
- **Marca:** logo oficial en el encabezado y el footer de todas las páginas; favicon PNG, ICO y SVG coherentes con el sitio oficial. Instagram y LinkedIn enlazados a las cuentas publicadas en disenafuturo.com.
- **Footer:** composición adaptable, información de la escuela, enlaces sociales y retorno al inicio, con separación suficiente respecto a las tarjetas.
- **Tarjetas:** elevación suave del retrato al pasar el puntero, jerarquía de encabezados y transición compartida del nombre al abrir una ficha.
- **Siluetas:** amplitud limitada para mantener los radios de reposo entre 0.8R y 1.2R. Se revisaron visualmente las 14 formas y se muestrearon 60 segundos: relación máxima observada 1.403, bajo el límite de 1.5.
- **Movimiento reducido:** se aplica también al cambiar la preferencia durante la sesión; detiene morph, scroll animado, entradas, hover y reproducción automática de vídeo. Las fotos siguen visibles. Se limpian listeners y animaciones al navegar.
- **Rendimiento:** General Sans se sirve localmente, con precarga de los pesos principales. Se eliminaron imports dinámicos de GSAP que no generaban separación real del bundle.

## Verificación

- `npm run check`: sin errores, advertencias ni hints.
- `npm run build`: 9 páginas generadas. Persiste el aviso de contenido de maqueta preexistente.
- Navegador Chromium: todas las categorías, comunidad Sabanilla, combinación vacía, restablecer y clics rápidos. Ninguna celda quedó absoluta ni con altura temporal residual; contadores correctos y cero errores de JavaScript.
- Separación mínima observada durante filtros en escritorio: 143.78 px entre última celda y footer. Error subpíxel máximo respecto a la grilla: 0.22 px.
- Viewports 320, 375, 768 y 1440 px: sin overflow horizontal; una columna en móvil y dos desde 768 px.
- Movimiento reducido en ejecución: morph detenido, cero vídeos reproduciéndose, tarjetas visibles y 80 px de separación en móvil.
- Abrir ficha de Kelly y volver: logo y footer presentes, sin overflow y filtros operativos; Los Lojas devuelve 11 resultados.
- Lighthouse móvil contra `astro preview`, con simulación de carga local: **92 rendimiento, 100 accesibilidad, 100 buenas prácticas y 100 SEO**. Son mediciones de laboratorio, no datos de visitantes reales.

Capturas, scripts de comprobación y reporte Lighthouse en `output/playwright/`.

## Pendiente de contenido / siguiente fase

Se mantienen las 11 fotos prestadas, los vídeos de ejemplo y las 6 fichas sin datos que ya tenía el proyecto. Falta recibir esos contenidos, el SVG original, el manual y el dominio definitivo. No se ha publicado el sitio ni conectado Strapi/Coolify.

Las propuestas experimentales de cursor personalizado, SplitText y parallax adicional del plan original quedan para otra iteración; el movimiento actual conserva un único viajero y evita sumar efectos que compitan con los filtros.
