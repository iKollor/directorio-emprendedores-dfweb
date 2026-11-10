# Comentarios de Diseña Futuro: octubre de 2026

Estado de cada punto de la revisión.

| # | Comentario | Estado |
|---|---|---|
| 1 | Logo de Intervalores en toda la plataforma | ⏳ Hecho a medias: el espacio ya está en la cabecera y el pie de todas las páginas. **Falta el archivo del logo.** Mientras tanto se ve el nombre en texto. |
| 2 | Quitar el botón de comunidades | ✅ El filtro y las etiquetas de comunidad están ocultos. También se quitaron "Sabanilla & Los Lojas" del inicio, las descripciones para buscadores y la dirección de los datos estructurados. El dato se conserva: para volver a mostrarlo basta con cambiar `MOSTRAR_COMUNIDAD` en `src/data/taxonomia.ts`. |
| 3 | Resumir la descripción de los emprendedores | ✅ Cada ficha tiene ahora un resumen de 1 o 2 líneas centrado en el negocio. Se quitaron los datos familiares ("casada, tres hijos") y los de ubicación (p. ej. "noroeste de Guayaquil"). Los textos están en el campo `resumen` del JSON. |
| 4 | Que funcione en el celular | ✅ Probado en iPhone 13, Pixel 5 y pantallas de 320px: sin errores ni scroll horizontal. Si alguien sigue sin poder entrar, el problema probablemente es de acceso (enlace, dominio o servidor) y no de diseño. Para revisarlo hace falta saber qué enlace se usó y en qué dispositivo falló. |
| 5 | Eliminar la "mancha" que sigue al puntero | ✅ Se quitaron las dos cosas que podían serlo: la deformación de los retratos hacia el cursor y el blob de color que recorría la página. |
| 6 | Fotos y videos de los emprendedores | ⏳ Todo listo para recibirlos: se deja el archivo en una carpeta y aparece solo (ver `src/assets/videos/LEEME.md`). Se quitó el video de ejemplo (Big Buck Bunny). **Faltan los archivos reales.** |
| 7 | "Escuela de Emprendimiento" con la tipografía tipo logo | 👀 Propuesta visible en el inicio y en el pie: minúsculas y dos líneas, como "diseña futuro". Se usa la fuente actual del sitio porque no tenemos la del logo. Si nos pasan el archivo de la fuente, se cambia en un paso. |
| 8 | Botón de pago para donaciones | 💬 Conversación pendiente con Isaí. No hay cambios en el sitio. |
| 9 | Fotos de productos o servicios en los perfiles | ✅ Nueva sección "Su trabajo" en cada ficha. Aparece cuando hay fotos en `src/assets/productos/<slug>/`. |
| 10 | "¡Conócele!" → "¡Conócelo!" | ✅ Cambiado. Se puede usar "¡Conócela!" para las emprendedoras si lo prefieren. |
| 11 | Texto sobre formación y microcrédito | ✅ Ahora dice: "Los emprendedores de esta plataforma se certificaron en el programa de la Escuela de Emprendimiento de Diseña Futuro, luego de culminar un proceso de fortalecimiento de conocimientos y desarrollo de habilidades blandas." |
| 12 | Botones de redes de DF | ✅ Se quitaron Instagram y LinkedIn. El pie enlaza solo a las webs de Diseña Futuro e Intervalores. |
| 13 | "Sabanilla y Los Lojas · Daule" en el pie | ✅ Eliminado. |
| 14 | Nombres completos | ✅ Se muestra un nombre y un apellido ("Kerly Huacón"). El nombre completo no aparece en ninguna parte del sitio. Para usar el formato "Kerly Huacón C." hay que cambiar una línea. |
| 15 | Fotos o videos con menores de edad | ✅ Se retiró la foto de Alexandra y no se volverá a descargar. Además, el sitio ya no "presta" fotos de otras personas: antes esa misma foto aparecía en 4 fichas más. Quien no tiene foto muestra un monograma con sus iniciales (antes, una silueta neutra). Las guías para subir material piden revisar que no aparezcan menores. |
| 16 | "Ficha en preparación" | ✅ Era el estado de 6 personas que todavía no entregaron los datos de su negocio, no una categoría. Se quitó el botón y la etiqueta ahora dice "Próximamente". |

## Lo que necesitamos de Diseña Futuro

1. **Logo de Intervalores**, en versión clara para fondo azul (SVG o PNG con
   fondo transparente). Va en `public/brand/intervalores.svg`.
2. **Fotos de retrato** de los 12 que muestran monograma, sin menores en el
   cuadro.
3. **Videos de presentación y fotos de productos o servicios**, sin menores y
   sin letreros, fachadas ni placas que permitan ubicar el negocio o la
   vivienda.
4. **Datos del negocio** de los 6 que están en "Próximamente".
5. **Confirmar el formato del nombre**: "Daniela Holguín" (actual) o
   "Daniela Holguín W.".
6. **Archivo de la tipografía del logo**, si deciden mantener el punto 7.
7. Si persisten los problemas de acceso desde el celular: **el enlace usado,
   el modelo del teléfono y el navegador.**
