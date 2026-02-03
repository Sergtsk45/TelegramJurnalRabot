-- Remove column manufacturer from material_batches (field "Производитель" removed from app)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'material_batches' AND column_name = 'manufacturer'
  ) THEN
    ALTER TABLE material_batches DROP COLUMN manufacturer;
  END IF;
END $$;
