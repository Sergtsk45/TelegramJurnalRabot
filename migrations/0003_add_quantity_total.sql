-- Migration: Add quantity_total column to position_resources table
-- Description: Добавляет колонку для хранения суммы количества ресурсов с учетом коэффициентов
-- Created: 2026-01-29

ALTER TABLE position_resources 
ADD COLUMN IF NOT EXISTS quantity_total NUMERIC(20, 4);

COMMENT ON COLUMN position_resources.quantity_total IS 'Сумма количества ресурса с учётом коэффициентов (всего с учётом коэффициентов)';
