# Guía de Comandos y Operación - Sobre La Mesa

Este documento recopila los comandos principales para operar el monorrepo, los contenedores Docker y los scripts de mantenimiento.

---

## 1. Comandos de Docker Compose

Todos los comandos de Docker se ejecutan desde la raíz del proyecto (`sobrelamesa2026/`):

### Iniciar todos los servicios en segundo plano
```bash
docker compose up -d
```

### Ver el estado de los contenedores
```bash
docker compose ps
```

### Ver logs en tiempo real
- **De todos los servicios:**
  ```bash
  docker compose logs -f
  ```
- **Solo del backend:**
  ```bash
  docker compose logs -f backend
  ```
- **Solo del frontend:**
  ```bash
  docker compose logs -f frontend
  ```
- **Solo de MySQL:**
  ```bash
  docker compose logs -f mysql
  ```

### Reconstruir imágenes tras cambios en dependencias o Dockerfiles
```bash
docker compose up -d --build
```

### Detener los servicios
```bash
docker compose down
```

### Detener y eliminar volúmenes (⚠️ reinicia la base de datos desde cero)
```bash
docker compose down -v
```

---

## 2. Migraciones de Base de Datos (Backend)

Las modificaciones de esquema (creación de tablas, columnas, índices, alter table) se gestionan exclusivamente desde el backend en `backend/src/database/migrations/` y su historial se audita automáticamente en la tabla `_migrations`.

> **Nota de arquitectura:** La carpeta previa `docker/mysql/init/` fue eliminada ya que la inicialización de esquemas pertenece al ciclo de vida del backend y no al contenedor de base de datos.

### Ejecutar migraciones pendientes
- **Dentro de Docker:**
  ```bash
  docker compose exec backend pnpm run migrate
  ```
- **En local:**
  ```bash
  pnpm --dir backend run migrate
  ```

### Ver el estado de las migraciones (Aplicadas vs Pendientes)
Muestra una tabla con el estado, lote (`batch`), archivo y fecha de aplicación:
- **Dentro de Docker:**
  ```bash
  docker compose exec backend pnpm run migrate:status
  ```
- **En local:**
  ```bash
  pnpm --dir backend run migrate:status
  ```

### Crear una nueva migración
Genera un archivo `.sql` numerado correlativamente (ej. `0002_migrar_clientes.sql`) en `backend/src/database/migrations/`:
- **Dentro de Docker:**
  ```bash
  docker compose exec backend pnpm run migrate:create <nombre_de_migracion>
  ```
- **En local:**
  ```bash
  pnpm --dir backend run migrate:create <nombre_de_migracion>
  ```

### Tipos de archivos de migración soportados
1. **Archivos `.sql` (Predeterminado):** Escribe sentencias SQL estándar separadas por punto y coma.
2. **Archivos `.ts`:** Puedes exportar una función asíncrona `export async function up(connection) { ... }` para lógica dinámica o transformación de datos.

---

## 3. Script de Actualización de Contraseñas (`pwd` ➡️ `password`)

El script lee las contraseñas en texto claro de la columna `pwd`, genera un hash `bcrypt` (10 rounds) y actualiza la columna `password` en la tabla `users`.

### Actualizar todos los usuarios con contraseña
- **Dentro del contenedor Docker (Recomendado):**
  ```bash
  docker compose exec backend pnpm run hash:passwords
  ```
- **O directamente en tu máquina local:**
  ```bash
  pnpm --dir backend run hash:passwords
  ```

### Actualizar un usuario específico
Puedes pasar el email como parámetro:
- **Dentro del contenedor Docker:**
  ```bash
  docker compose exec backend npx ts-node scripts/update-passwords.ts isadev@mail.com
  ```
- **En tu máquina local:**
  ```bash
  npx --prefix backend ts-node scripts/update-passwords.ts isadev@mail.com
  ```

---

## 4. Comandos de Monorrepo con PNPM

### Instalar dependencias en todo el monorrepo
```bash
pnpm install
```

### Agregar una dependencia a un proyecto específico
- **Al backend:**
  ```bash
  pnpm --dir backend add <paquete>
  pnpm --dir backend add -D <paquete-dev>
  ```
- **Al frontend (`slm`):**
  ```bash
  pnpm --dir slm add <paquete>
  ```

---

## 5. URLs de Acceso Local

| Servicio | URL | Descripción |
|---|---|---|
| **Frontend** | [http://localhost:3001](http://localhost:3001) | Aplicación React (Login, Dashboard, Eventos) |
| **Backend API** | [http://localhost:3000/api](http://localhost:3000/api) | API REST Node.js / Express |
| **Healthcheck** | [http://localhost:3000/api/health](http://localhost:3000/api/health) | Verificación de estado del backend |
| **Base de Datos** | `localhost:3306` (o `3312` según `.env`) | MySQL 8.0 |

---

## 6. Credenciales de Base de Datos por Defecto

- **Host (desde fuera de Docker / DataGrip / DBeaver):** `localhost` o `127.0.0.1`
- **Host (entre contenedores Docker):** `mysql`
- **Puerto:** `3306` (o `3312` si se configuró `DB_PORT=3312` en `.env`)
- **Base de datos:** `sobrelamesa`
- **Usuario administrador:** `root`
- **Contraseña root:** `rootpassword`
- **Usuario de aplicación:** `slm_user`
- **Contraseña usuario:** `slm_password`
