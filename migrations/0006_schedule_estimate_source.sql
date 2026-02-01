-- @file: 0006_schedule_estimate_source.sql
-- @description: Add support for schedules based on estimate positions (not just works)
-- @created: 2026-02-01
--
-- Extends schedules table with source_type ('works' | 'estimate') and estimate_id.
-- Extends schedule_tasks to support both work_id and estimate_position_id (mutually exclusive).

-- ----
-- 1) Extend schedules table with source type and estimate reference
-- ----

ALTER TABLE "schedules"
  ADD COLUMN "source_type" TEXT NOT NULL DEFAULT 'works',
  ADD COLUMN "estimate_id" INTEGER REFERENCES "estimates"("id") ON DELETE SET NULL;

-- CHECK: source_type must be 'works' or 'estimate'
ALTER TABLE "schedules"
  ADD CONSTRAINT schedules_source_type_check
  CHECK ("source_type" IN ('works', 'estimate'));

-- CHECK: if source_type='estimate' then estimate_id must be set
ALTER TABLE "schedules"
  ADD CONSTRAINT schedules_estimate_id_required
  CHECK ("source_type" = 'works' OR "estimate_id" IS NOT NULL);

-- Index for finding schedules by estimate
CREATE INDEX IF NOT EXISTS "schedules_estimate_id_idx"
  ON "schedules" ("estimate_id")
  WHERE "estimate_id" IS NOT NULL;

-- ----
-- 2) Extend schedule_tasks to support estimate positions
-- ----

-- Make work_id nullable (it was NOT NULL before)
ALTER TABLE "schedule_tasks"
  ALTER COLUMN "work_id" DROP NOT NULL;

-- Add column for estimate position reference
ALTER TABLE "schedule_tasks"
  ADD COLUMN "estimate_position_id" INTEGER REFERENCES "estimate_positions"("id") ON DELETE CASCADE;

-- CHECK: exactly one of work_id or estimate_position_id must be set
ALTER TABLE "schedule_tasks"
  ADD CONSTRAINT schedule_tasks_source_check
  CHECK (
    ("work_id" IS NOT NULL AND "estimate_position_id" IS NULL) OR
    ("work_id" IS NULL AND "estimate_position_id" IS NOT NULL)
  );

-- Index for estimate positions
CREATE INDEX IF NOT EXISTS "schedule_tasks_estimate_position_id_idx"
  ON "schedule_tasks" ("estimate_position_id")
  WHERE "estimate_position_id" IS NOT NULL;

-- ----
-- 3) Migration safety: existing rows should remain valid
-- ----

-- All existing schedule_tasks have work_id set, so they satisfy the CHECK constraint.
-- All existing schedules will have source_type='works' (default) and estimate_id=NULL.
-- No data migration needed.
