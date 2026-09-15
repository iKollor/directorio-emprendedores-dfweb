// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Necesario para canonical, og:image absolutas y sitemap.
  // Cambiar al dominio definitivo antes de desplegar en Coolify.
  site: "https://emprendedores.disenafuturo.com",

  integrations: [sitemap()],

  image: {
    // Los retratos vienen del Drive en 2-6 MB: sin techo, el build genera
    // variantes enormes que nadie va a usar.
    layout: "constrained",
  },

  build: {
    // URLs con barra final, consistentes con los enlaces del sitio.
    format: "directory",
  },

  prefetch: {
    // El listado es el punto de entrada: precargar la ficha al pasar el cursor
    // hace que la transición de vista arranque sin espera.
    prefetchAll: true,
    defaultStrategy: "hover",
  },
});
