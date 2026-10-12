# Club de Inversión Familiar — imagen de producción
# La base de datos SQLite vive en /data (monta un volumen para que persista).
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencias (postinstall ejecuta prisma generate, por eso el esquema va antes)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Código y compilación
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/data/club.db"
VOLUME ["/data"]
EXPOSE 3000

# Aplica migraciones, carga la Academia (idempotente) y arranca
CMD ["npm", "run", "start:prod"]
