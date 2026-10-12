# Club de Inversión Familiar — imagen de producción (Cloud Run o cualquier host de contenedores)
# La base de datos es PostgreSQL; la URL llega por la variable DATABASE_URL.
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
EXPOSE 3000

# Las migraciones y la carga de la Academia se ejecutan aparte (npm run db:deploy);
# el contenedor solo sirve la app, así los arranques en frío son rápidos.
CMD ["npm", "start"]
