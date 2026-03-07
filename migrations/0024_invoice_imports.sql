-- Migration: 0024_invoice_imports
-- Description: Creates table for tracking PDF invoice imports per user (for tariff quota enforcement).
-- Dependencies: users, objects tables must exist.
-- Created: 2026-03-07

CREATE TABLE IF NOT EXISTS invoice_imports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  object_id INTEGER NOT NULL REFERENCES objects(id),
  pdf_filename TEXT,
  items_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX invoice_imports_user_id_idx ON invoice_imports(user_id);
CREATE INDEX invoice_imports_user_id_created_at_idx ON invoice_imports(user_id, created_at);
