-- Password reset tokens (Turso / SQLite)
-- Applied via Turso evolve_schema; safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS PasswordResetToken (
  id TEXT NOT NULL PRIMARY KEY,
  tokenHash TEXT NOT NULL,
  userId TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PasswordResetToken_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS PasswordResetToken_tokenHash_key ON PasswordResetToken(tokenHash);
CREATE INDEX IF NOT EXISTS PasswordResetToken_userId_idx ON PasswordResetToken(userId);
