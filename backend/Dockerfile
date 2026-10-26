# Base stage para dependencias con pnpm
FROM node:20-alpine AS base
RUN npm install -g pnpm@10

WORKDIR /app

# Copiar manifiestos y lockfile de pnpm
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias con pnpm
RUN pnpm install

# Copiar código fuente
COPY . .

# Target para desarrollo local (con hot-reloading)
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# Target de compilación
FROM base AS build
RUN pnpm run build

# Target para producción optimizado
FROM node:20-alpine AS prod
RUN npm install -g pnpm@10

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
