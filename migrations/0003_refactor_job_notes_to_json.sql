-- Migration: Refactor job notes from separate table to JSON array on jobs table
-- Stores notes as JSON array: [{"text": "...", "timestamp": "...", "completed": false}, ...]

ALTER TABLE jobs ADD COLUMN notes_json TEXT DEFAULT '[]';

DROP INDEX IF EXISTS idx_job_notes_job_id;
DROP TABLE IF EXISTS job_notes;
