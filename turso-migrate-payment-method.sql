-- Add Invoice.paymentMethod for sale method (efectivo|transferencia|…)
-- Safe to re-run only if the column does not exist yet (SQLite/libSQL has no IF NOT EXISTS for ADD COLUMN in older versions).
ALTER TABLE Invoice ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT '';
