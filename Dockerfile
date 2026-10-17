# Club de Inversión Familiar — imagen de producción (Cloud Run o cualquier host de contenedores)
# Build en dos etapas: la imagen final solo lleva la salida «standalone» de Next.js y corre sin privilegios.
FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Dependencias (postinstall ejecuta prisma generate, por eso el esquema va antes)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Fechas «de hoy», meses y plazos en hora de España, no en UTC
ENV TZ=Europe/Madrid
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
# Las migraciones y la carga de la Academia se ejecutan aparte (npm run db:deploy);
# el contenedor solo sirve la app, así los arranques en frío son rápidos.
CMD ["node", "server.js"]
