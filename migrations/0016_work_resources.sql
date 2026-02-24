-- Migration: Work Resources — ресурсы позиций ВОР
-- @description: Create work_resources table for detailed resources of work positions

CREATE TABLE IF NOT EXISTS work_resources (
  id serial PRIMARY KEY,
  work_id integer NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  resource_code text,
  resource_type text,
  name text NOT NULL,
  unit text,
  quantity numeric(20,4),
  quantity_total numeric(20,4),
  base_cost_per_unit numeric(20,4),
  current_cost_per_unit numeric(20,4),
  total_current_cost numeric(20,4),
  order_index integer NOT NULL DEFAULT 0
);

-- Индексы для work_resources
CREATE INDEX IF NOT EXISTS work_resources_work_id_idx ON work_resources(work_id);
