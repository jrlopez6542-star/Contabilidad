-- Stock alert emails, cash-close emails, and CashClose table (Turso / SQLite)
-- Safe-ish to re-run: ADD COLUMN fails if already present; CREATE TABLE IF NOT EXISTS is idempotent.

-- Company: separate recipient lists (do not mix stock vs caja)
ALTER TABLE Company ADD COLUMN stockAlertEmails TEXT NOT NULL DEFAULT '';
ALTER TABLE Company ADD COLUMN cashCloseEmails TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS CashClose (
  id TEXT NOT NULL PRIMARY KEY,
  date TEXT NOT NULL,
  expectedCash REAL NOT NULL DEFAULT 0,
  countedCash REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  closedByUserId TEXT,
  closedByEmail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'closed',
  breakdownJson TEXT NOT NULL DEFAULT '{}',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS CashClose_date_key ON CashClose(date);
CREATE INDEX IF NOT EXISTS CashClose_createdAt_idx ON CashClose(createdAt);
