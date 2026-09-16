-- Professional pack migration for Turso / SQLite
-- Apply with: turso db shell <db-name> < turso-migrate-professional.sql
-- Apply exactly once to a database using the original production baseline.
-- For fresh DBs prefer: prisma db push (local) then dump schema, or run full CREATE below.

-- Company branding + quotes numbering + alert threshold
ALTER TABLE Company ADD COLUMN logoUrl TEXT NOT NULL DEFAULT '/logo-bunuelandia.png';
ALTER TABLE Company ADD COLUMN quotePrefix TEXT NOT NULL DEFAULT 'COT';
ALTER TABLE Company ADD COLUMN nextQuoteNumber INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Company ADD COLUMN unpaidAlertDays INTEGER NOT NULL DEFAULT 30;

-- Product inventory
ALTER TABLE Product ADD COLUMN stock REAL NOT NULL DEFAULT 0;
ALTER TABLE Product ADD COLUMN minStock REAL NOT NULL DEFAULT 5;
ALTER TABLE Product ADD COLUMN trackStock INTEGER NOT NULL DEFAULT 1;

-- Invoice optional link to quote
ALTER TABLE Invoice ADD COLUMN quoteId TEXT;

-- Quotes
CREATE TABLE IF NOT EXISTS Quote (
  id TEXT NOT NULL PRIMARY KEY,
  number TEXT NOT NULL,
  customerId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal REAL NOT NULL DEFAULT 0,
  ivaTotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  validUntil DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT Quote_customerId_fkey FOREIGN KEY (customerId) REFERENCES Customer (id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS Quote_number_key ON Quote(number);

CREATE TABLE IF NOT EXISTS QuoteItem (
  id TEXT NOT NULL PRIMARY KEY,
  quoteId TEXT NOT NULL,
  productId TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unitPrice REAL NOT NULL,
  ivaRate REAL NOT NULL DEFAULT 19,
  lineSubtotal REAL NOT NULL,
  lineIva REAL NOT NULL,
  lineTotal REAL NOT NULL,
  CONSTRAINT QuoteItem_quoteId_fkey FOREIGN KEY (quoteId) REFERENCES Quote (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT QuoteItem_productId_fkey FOREIGN KEY (productId) REFERENCES Product (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Audit log
CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT NOT NULL PRIMARY KEY,
  userId TEXT,
  userEmail TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entityId TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS AuditLog_createdAt_idx ON AuditLog(createdAt);
CREATE INDEX IF NOT EXISTS AuditLog_entity_entityId_idx ON AuditLog(entity, entityId);

-- Login rate limiting
CREATE TABLE IF NOT EXISTS LoginAttempt (
  id TEXT NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  success INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS LoginAttempt_email_createdAt_idx ON LoginAttempt(email, createdAt);
