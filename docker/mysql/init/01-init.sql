-- Coloca aquí tus scripts .sql iniciales (migraciones, schemas, seeds).
-- Cualquier archivo .sql en esta carpeta se ejecutará automáticamente
-- la primera vez que se inicialice el contenedor de MySQL.

-- Asegurar que la tabla users tenga la columna hashed_refresh_token requerida por el backend:
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_refresh_token VARCHAR(255) NULL;
