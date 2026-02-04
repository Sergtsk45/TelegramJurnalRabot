-- Migration: Drop issuer column from documents table
-- Description: Remove "Кем выдан" (issuer) field as it's not needed in the project
-- Created: 2026-02-03

ALTER TABLE "documents" DROP COLUMN IF EXISTS "issuer";
