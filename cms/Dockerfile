# El panel (Payload + SQLite). La imagen final lleva solo lo que hace falta
# para correr: un `node server.js`.
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

USER node
EXPOSE 3000
VOLUME /app/datos
CMD ["node", "server.js"]
