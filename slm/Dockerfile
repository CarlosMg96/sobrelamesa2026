# Base stage para frontend con pnpm
FROM node:24-alpine AS base
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
ENV PORT=3001
ENV CHOKIDAR_USEPOLLING=true
ENV WDS_SOCKET_PORT=0
EXPOSE 3001
CMD ["pnpm", "start"]

# Target para compilar estáticos de producción
FROM base AS build
ARG REACT_APP_SERVER_URL
ENV REACT_APP_SERVER_URL=${REACT_APP_SERVER_URL}
RUN pnpm run build

# Target para producción servido con Nginx
FROM nginx:alpine AS prod
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
