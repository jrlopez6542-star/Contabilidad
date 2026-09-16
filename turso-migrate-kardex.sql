-- Kardex / StockMovement ledger (Turso / SQLite)
-- Idempotent: CREATE TABLE IF NOT EXISTS + indexes

CREATE TABLE IF NOT EXISTS StockMovement (
  id TEXT NOT NULL PRIMARY KEY,
  productId TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  stockBefore REAL NOT NULL,
  stockAfter REAL NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  refType TEXT NOT NULL DEFAULT '',
  refId TEXT NOT NULL DEFAULT '',
  refNumber TEXT NOT NULL DEFAULT '',
  userId TEXT,
  userEmail TEXT NOT NULL DEFAULT '',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES Product(id)
);

CREATE INDEX IF NOT EXISTS StockMovement_productId_idx ON StockMovement(productId);
CREATE INDEX IF NOT EXISTS StockMovement_createdAt_idx ON StockMovement(createdAt);
