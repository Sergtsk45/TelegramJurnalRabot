-- Migration 0020: Add split task fields
-- Description: Add split_group_id, split_index, and independent_materials to schedule_tasks
-- Date: 2026-03-02
-- Impact: Enables splitting tasks into sub-tasks with shared or independent materials

BEGIN;

-- ============================
-- 1. Add split_group_id column
-- ============================
ALTER TABLE "schedule_tasks" 
  ADD COLUMN IF NOT EXISTS "split_group_id" TEXT;

COMMENT ON COLUMN "schedule_tasks"."split_group_id" IS 
  'UUID linking split sub-tasks together. NULL for non-split tasks.';

-- ============================
-- 2. Add split_index column
-- ============================
ALTER TABLE "schedule_tasks" 
  ADD COLUMN IF NOT EXISTS "split_index" INTEGER;

COMMENT ON COLUMN "schedule_tasks"."split_index" IS 
  'Sequential number (1, 2, 3...) within split group. NULL for non-split tasks.';

-- ============================
-- 3. Add independent_materials column
-- ============================
ALTER TABLE "schedule_tasks" 
  ADD COLUMN IF NOT EXISTS "independent_materials" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "schedule_tasks"."independent_materials" IS 
  'If true, each split sub-task manages its own materials independently. If false, materials are shared across the split group.';

-- ============================
-- 4. Create index on split_group_id
-- ============================
CREATE INDEX IF NOT EXISTS "schedule_tasks_split_group_id_idx" 
  ON "schedule_tasks"("split_group_id") 
  WHERE "split_group_id" IS NOT NULL;

-- ============================
-- 5. Add CHECK constraints
-- ============================
-- Ensure split_group_id and split_index are both NULL or both NOT NULL
ALTER TABLE "schedule_tasks"
  ADD CONSTRAINT "schedule_tasks_split_fields_consistency"
  CHECK (
    (split_group_id IS NULL AND split_index IS NULL) OR
    (split_group_id IS NOT NULL AND split_index IS NOT NULL)
  );

COMMENT ON CONSTRAINT "schedule_tasks_split_fields_consistency" ON "schedule_tasks" IS
  'Ensures split_group_id and split_index are either both NULL (non-split task) or both NOT NULL (split task)';

-- Ensure split_index is non-negative when not NULL
ALTER TABLE "schedule_tasks"
  ADD CONSTRAINT "schedule_tasks_split_index_non_negative"
  CHECK (split_index IS NULL OR split_index >= 0);

COMMENT ON CONSTRAINT "schedule_tasks_split_index_non_negative" ON "schedule_tasks" IS
  'Ensures split_index is non-negative when set';

COMMIT;
