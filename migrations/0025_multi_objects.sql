-- Migration: 0025_multi_objects
-- Description: Adds current_object_id to users for multi-object support (Phase 1).
-- Dependencies: users, objects tables must exist.
-- Created: 2026-03-07

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_object_id INTEGER REFERENCES objects(id) ON DELETE SET NULL;

-- Populate current_object_id for existing users (pick oldest object by created_at)
UPDATE users SET current_object_id = (
  SELECT id FROM objects
  WHERE objects.user_id = users.id
  ORDER BY created_at ASC LIMIT 1
) WHERE current_object_id IS NULL;
