# El panel (Payload + SQLite). La imagen final lleva solo lo que hace falta
# para correr: un `node server.js`.
#
# Se construye con un segundo contexto, `raiz`, que es la raíz del
# repositorio: de ahí sale la semilla del primer arranque (los emprendedores,
# sus fotos, sus vídeos y los logos). docker compose lo pasa con `additional_contexts`; a
# mano: docker build --build-context raiz=.. .
FROM node:22-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS compilacion
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
# Compilar pide bastante más memoria que correr (unos 2 GB). Si la VM no
# llega, se compila en otra máquina y se sube la imagen.
RUN npm run build

FROM base AS final
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DATOS_DIR=/app/datos

RUN mkdir -p /app/datos && chown -R node:node /app
COPY --from=compilacion --chown=node:node /app/.next/standalone ./
COPY --from=compilacion --chown=node:node /app/.next/static ./.next/static

# La semilla va dentro de la imagen: así no hace falta montar carpetas del
# repositorio (Coolify no puede). Solo se usa con la base vacía.
ENV SEMILLA_DIR=/semilla
COPY --from=raiz src/data /semilla/data
COPY --from=raiz src/assets/emprendedores /semilla/assets/emprendedores
COPY --from=raiz src/assets/videos /semilla/assets/videos
COPY --from=raiz public/brand /semilla/brand

USER node
EXPOSE 3000
VOLUME /app/datos
CMD ["node", "server.js"]
