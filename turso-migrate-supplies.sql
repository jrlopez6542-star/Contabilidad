-- Supply / SupplyMovement inventory (Turso / SQLite)
-- Idempotent: CREATE TABLE IF NOT EXISTS + indexes

CREATE TABLE IF NOT EXISTS Supply (
  id TEXT NOT NULL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro',
  unit TEXT NOT NULL DEFAULT 'unidad',
  quantity REAL NOT NULL DEFAULT 0,
  minStock REAL NOT NULL DEFAULT 0,
  unitCost REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS Supply_code_key ON Supply(code);

CREATE TABLE IF NOT EXISTS SupplyMovement (
  id TEXT NOT NULL PRIMARY KEY,
  supplyId TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  quantityBefore REAL NOT NULL,
  quantityAfter REAL NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  userId TEXT,
  userEmail TEXT NOT NULL DEFAULT '',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplyId) REFERENCES Supply(id)
);

CREATE INDEX IF NOT EXISTS SupplyMovement_supplyId_idx ON SupplyMovement(supplyId);
CREATE INDEX IF NOT EXISTS SupplyMovement_createdAt_idx ON SupplyMovement(createdAt);
