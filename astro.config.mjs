// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

// El panel de contenido (carpeta cms/). Sin esta variable el sitio se
// construye con el JSON del repositorio; ver src/lib/directorio.ts.
const CMS_URL = process.env.CMS_URL ?? loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "").CMS_URL ?? "";
const cms = CMS_URL ? new URL(CMS_URL) : null;

// https://astro.build/config
export default defineConfig({
  // Necesario para canonical, og:image absolutas y sitemap.
  // Cambiar al dominio definitivo antes de desplegar.
  site: "https://emprendedores.disenafuturo.com",

  // Las páginas siguen siendo estáticas: se construyen una vez. El servidor
  // Node existe para la vista previa del panel (src/pages/vista-previa/) y
  // para servir los vídeos subidos (src/pages/medios/).
  adapter: node({ mode: "standalone" }),

  integrations: [sitemap({ filter: (pagina) => !pagina.includes("/vista-previa/") })],

  image: {
    // Los retratos vienen del Drive en 2-6 MB: sin techo, el build genera
    // variantes enormes que nadie va a usar.
    layout: "constrained",
    // Las fotos subidas al panel se optimizan igual que las del repositorio.
    remotePatterns: cms
      ? [{ protocol: cms.protocol.replace(":", ""), hostname: cms.hostname, port: cms.port, pathname: "/api/medios/file/**" }]
      : [],
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
