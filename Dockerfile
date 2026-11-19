# El sitio (Astro). Se construye al arrancar y cada vez que el panel publica:
# ver scripts/servidor.mjs.
FROM node:22-slim
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4321
CMD ["node", "scripts/servidor.mjs"]
