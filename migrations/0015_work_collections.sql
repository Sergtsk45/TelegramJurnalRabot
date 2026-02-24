-- Migration: Work Collections — коллекции ВОР с разделами
-- @description: Create work_collections and work_sections tables, extend works table

-- Таблица коллекций ВОР (аналог estimates)
CREATE TABLE IF NOT EXISTS work_collections (
  id serial PRIMARY KEY,
  code text,
  name text NOT NULL,
  object_name text,
  region text,
  total_cost numeric(20,4),
  total_construction numeric(20,4),
  total_installation numeric(20,4),
  total_equipment numeric(20,4),
  total_other numeric(20,4),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Индекс для быстрого поиска по имени
CREATE INDEX IF NOT EXISTS work_collections_name_idx ON work_collections(name);

-- Таблица разделов ВОР (аналог estimate_sections)
CREATE TABLE IF NOT EXISTS work_sections (
  id serial PRIMARY KEY,
  work_collection_id integer NOT NULL REFERENCES work_collections(id) ON DELETE CASCADE,
  number text NOT NULL,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);

-- Индексы для work_sections
CREATE INDEX IF NOT EXISTS work_sections_collection_id_idx ON work_sections(work_collection_id);
CREATE UNIQUE INDEX IF NOT EXISTS work_sections_collection_number_uq ON work_sections(work_collection_id, number);

-- Расширяем таблицу works новыми полями
ALTER TABLE works 
  ADD COLUMN IF NOT EXISTS work_collection_id integer REFERENCES work_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_id integer REFERENCES work_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS line_no text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS base_cost_per_unit numeric(20,4),
  ADD COLUMN IF NOT EXISTS current_cost_per_unit numeric(20,4),
  ADD COLUMN IF NOT EXISTS total_current_cost numeric(20,4),
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

-- Индексы для связи с коллекциями и секциями
CREATE INDEX IF NOT EXISTS works_collection_id_idx ON works(work_collection_id);
CREATE INDEX IF NOT EXISTS works_section_id_idx ON works(section_id);

-- Перенос существующих works в дефолтную коллекцию
DO $$
DECLARE
  default_collection_id integer;
  default_section_id integer;
  works_count integer;
BEGIN
  -- Проверяем, есть ли существующие works
  SELECT COUNT(*) INTO works_count FROM works;
  
  IF works_count > 0 THEN
    -- Создаём дефолтную коллекцию ВОР
    INSERT INTO work_collections(name) 
    VALUES ('ВОР по умолчанию')
    RETURNING id INTO default_collection_id;
    
    -- Создаём дефолтную секцию
    INSERT INTO work_sections(work_collection_id, number, title)
    VALUES (default_collection_id, '1', 'Работы')
    RETURNING id INTO default_section_id;
    
    -- Переносим все существующие works в дефолтную коллекцию и секцию
    UPDATE works 
    SET work_collection_id = default_collection_id,
        section_id = default_section_id,
        line_no = code  -- используем код как номер строки
    WHERE work_collection_id IS NULL;
    
    RAISE NOTICE 'Migrated % works to default collection (ID: %)', works_count, default_collection_id;
  END IF;
END $$;
