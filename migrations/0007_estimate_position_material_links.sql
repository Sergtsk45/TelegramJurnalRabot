-- @file: 0007_estimate_position_material_links.sql
-- @description: Link estimate subrows (estimate_positions) to project materials for quality docs status (MVP)
-- @created: 2026-02-02

-- ----
-- updated_at trigger helper (idempotent)
-- ----

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----
-- 1) estimate_position_material_links — explicit link for schedule subrows
-- ----

CREATE TABLE IF NOT EXISTS "estimate_position_material_links" (
  "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "object_id" INTEGER NOT NULL REFERENCES "objects"("id") ON DELETE RESTRICT,
  "estimate_id" INTEGER NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
  "estimate_position_id" INTEGER NOT NULL REFERENCES "estimate_positions"("id") ON DELETE CASCADE,
  "project_material_id" BIGINT NOT NULL REFERENCES "project_materials"("id") ON DELETE CASCADE,
  -- MVP: batch is optional and may be ignored in status computation
  "batch_id" BIGINT REFERENCES "material_batches"("id") ON DELETE SET NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One link per estimate subrow within an object
CREATE UNIQUE INDEX IF NOT EXISTS "estimate_position_material_links_object_position_uq"
  ON "estimate_position_material_links" ("object_id", "estimate_position_id");

CREATE INDEX IF NOT EXISTS "estimate_position_material_links_object_estimate_id_idx"
  ON "estimate_position_material_links" ("object_id", "estimate_id");

CREATE INDEX IF NOT EXISTS "estimate_position_material_links_estimate_position_id_idx"
  ON "estimate_position_material_links" ("estimate_position_id");

CREATE INDEX IF NOT EXISTS "estimate_position_material_links_project_material_id_idx"
  ON "estimate_position_material_links" ("project_material_id");

DROP TRIGGER IF EXISTS estimate_position_material_links_updated_at ON "estimate_position_material_links";
CREATE TRIGGER estimate_position_material_links_updated_at
  BEFORE UPDATE ON "estimate_position_material_links"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

