-- Migration: Add work_collection_id to schedules
-- @description: Support selecting specific work collection as schedule source

-- Add column if it doesn't exist
ALTER TABLE schedules 
  ADD COLUMN IF NOT EXISTS work_collection_id integer REFERENCES work_collections(id) ON DELETE SET NULL;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS schedules_work_collection_id_idx ON schedules(work_collection_id);

-- Migrate existing schedules with sourceType='works' to use default work collection
DO $$
DECLARE
  default_collection_id integer;
  affected_count integer;
BEGIN
  -- Get default collection (first one, or null if none exist)
  SELECT id INTO default_collection_id FROM work_collections ORDER BY created_at LIMIT 1;
  
  IF default_collection_id IS NOT NULL THEN
    UPDATE schedules 
    SET work_collection_id = default_collection_id
    WHERE source_type = 'works' AND work_collection_id IS NULL;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RAISE NOTICE 'Migrated % schedules to default work collection (ID: %)', 
      affected_count,
      default_collection_id;
  ELSE
    RAISE NOTICE 'No work collections found, skipping schedule migration';
  END IF;
END $$;
