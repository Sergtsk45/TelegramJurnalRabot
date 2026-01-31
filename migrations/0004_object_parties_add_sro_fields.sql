-- 0004_object_parties_add_sro_fields.sql
-- Add SRO (self-regulatory organization) fields for parties (customer/builder/designer)

ALTER TABLE "object_parties"
  ADD COLUMN IF NOT EXISTS "sro_full_name" text,
  ADD COLUMN IF NOT EXISTS "sro_short_name" text,
  ADD COLUMN IF NOT EXISTS "sro_ogrn" text,
  ADD COLUMN IF NOT EXISTS "sro_inn" text;

-- 0004_object_parties_add_sro_fields.sql
-- Add SRO (self-regulatory organization) fields for parties

ALTER TABLE "object_parties"
  ADD COLUMN IF NOT EXISTS "sro_full_name" text,
  ADD COLUMN IF NOT EXISTS "sro_short_name" text,
  ADD COLUMN IF NOT EXISTS "sro_ogrn" text,
  ADD COLUMN IF NOT EXISTS "sro_inn" text;

