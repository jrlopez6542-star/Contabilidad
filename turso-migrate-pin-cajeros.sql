-- PIN de caja para cajeros (vendedor / contador).
-- Puramente aditivo: tres columnas NUEVAS y NULLABLE en User, sin DEFAULT ni
-- reescritura de datos. Filas existentes quedan con NULL (= sin PIN).
-- Aplicar UNA sola vez, ANTES de desplegar el código que las usa:
--   turso db shell contabilidad < turso-migrate-pin-cajeros.sql
-- (SQLite/libSQL no soporta ADD COLUMN IF NOT EXISTS: si una columna ya existe,
--  esa sentencia falla con "duplicate column name" sin afectar datos.)
ALTER TABLE User ADD COLUMN pinHash TEXT;
ALTER TABLE User ADD COLUMN pinFailedAttempts INTEGER;
ALTER TABLE User ADD COLUMN pinLockedAt DATETIME;
