-- Migration: Add missing description column to skills table
-- Reason: The initial schema defined skills.description but it was never applied to production D1 database
-- Impact: Fixed widget postal code validation which was failing when loading services
-- Date: Feb 15, 2026

ALTER TABLE skills ADD COLUMN description TEXT;
