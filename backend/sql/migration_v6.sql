-- ================================================================
-- migration_v6.sql — guarda nome original do arquivo nos registros
-- Execute no SQL Editor do Supabase
-- ================================================================
ALTER TABLE registros ADD COLUMN IF NOT EXISTS arquivo_nome_original TEXT;