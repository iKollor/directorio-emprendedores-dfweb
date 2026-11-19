/**
 * EL SITIO EN EL SERVIDOR. Construye el sitio con lo publicado en el panel,
 * lo sirve, y lo vuelve a construir cuando el panel avisa de que se ha
 * publicado algo. Así "Publicar" llega al sitio sin que nadie despliegue.
 *
 *   PORT        puerto del sitio (4321)
 *   PUERTO_AVISO puerto donde escucha el aviso del panel (4322). No debe
 *                ser visible desde fuera: solo lo usa el panel.
 *
 * El sitio nuevo se construye en una carpeta aparte y se cambia por el
 * viejo al final: mientras tanto se sigue sirviendo el anterior, y si la
 * construcción falla (por ejemplo, el panel no responde) no se cambia nada.
 */
import { spawn } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { createServer } from "node:http";

const PUERTO_AVISO = Number(process.env.PUERTO_AVISO ?? 4322);
const ACTUAL = "dist";
const NUEVO = "dist-nuevo";
const VIEJO = "dist-viejo";

let servidor = null;
let construyendo = false;
let pendiente = false;

const ejecutar = (orden, args) =>
  new Promise((resolver) => {
    spawn(orden, args, { stdio: "inherit" }).on("exit", (codigo) => resolver(codigo === 0));
  });

function servir() {
  servidor = spawn("node", [`${ACTUAL}/server/entry.mjs`], {
    stdio: "inherit",
    env: { ...process.env, HOST: process.env.HOST ?? "0.0.0.0", PORT: process.env.PORT ?? "4321" },
  });
}

async function construir() {
  if (construyendo) {
    // Llegó otro aviso a media construcción: se hace una más al terminar.
    pendiente = true;
    return;
  }
  construyendo = true;
  rmSync(NUEVO, { recursive: true, force: true });

  if (await ejecutar("npx", ["astro", "build", "--outDir", NUEVO])) {
    const anterior = servidor;
    servidor = null;
    if (anterior) {
      await new Promise((resolver) => anterior.on("exit", resolver).kill());
    }
    rmSync(VIEJO, { recursive: true, force: true });
    if (existsSync(ACTUAL)) renameSync(ACTUAL, VIEJO);
    renameSync(NUEVO, ACTUAL);
    servir();
    rmSync(VIEJO, { recursive: true, force: true });
    console.log("[sitio] Sitio actualizado.");
  } else {
    console.error("[sitio] La construcción falló: se sigue sirviendo el sitio anterior.");
  }

  construyendo = false;
  if (pendiente) {
    pendiente = false;
    construir();
  }
}

// Primer arranque: hasta que el panel responda no hay nada que servir.
while (!servidor) {
  await construir();
  if (!servidor) {
    console.log("[sitio] Reintento en 10 segundos (¿el panel está arrancando?).");
    await new Promise((resolver) => setTimeout(resolver, 10_000));
  }
}

createServer((peticion, respuesta) => {
  if (peticion.method !== "POST") {
    respuesta.writeHead(405).end();
    return;
  }
  console.log("[sitio] El panel avisa de una publicación: reconstruyendo.");
  construir();
  respuesta.writeHead(202).end("ok");
}).listen(PUERTO_AVISO, "0.0.0.0");

for (const senal of ["SIGINT", "SIGTERM"]) {
  process.on(senal, () => {
    servidor?.kill();
    process.exit(0);
  });
}
