-- Migration: 0023_user_data_scoping
-- Description: Add object_id to work_collections, estimates, schedules
-- for user data isolation. Migrate existing data to first object if exists.

-- Add object_id to work_collections
ALTER TABLE work_collections
  ADD COLUMN IF NOT EXISTS object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE;

-- Add object_id to estimates
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE;

-- Add object_id to schedules
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS work_collections_object_id_idx ON work_collections(object_id);
CREATE INDEX IF NOT EXISTS estimates_object_id_idx ON estimates(object_id);
CREATE INDEX IF NOT EXISTS schedules_object_id_idx ON schedules(object_id);

-- Migrate existing orphaned records to the first user's object
-- This ensures backward compatibility for existing data
DO $$
DECLARE
  default_object_id INTEGER;
BEGIN
  SELECT id INTO default_object_id FROM objects ORDER BY id LIMIT 1;
  
  IF default_object_id IS NOT NULL THEN
    UPDATE work_collections SET object_id = default_object_id WHERE object_id IS NULL;
    UPDATE estimates SET object_id = default_object_id WHERE object_id IS NULL;
    UPDATE schedules SET object_id = default_object_id WHERE object_id IS NULL;
  END IF;
END $$;
