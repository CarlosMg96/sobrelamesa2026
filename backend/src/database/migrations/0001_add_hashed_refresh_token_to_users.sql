-- Migración: 0001_add_hashed_refresh_token_to_users.sql
-- Descripción: Agrega la columna hashed_refresh_token a la tabla users para soporte de refresh tokens JWT

SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'hashed_refresh_token';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
