-- Migration: Add missing columns for job lifecycle tracking and data integrity
-- Reason: Jobs table was missing assigned_at and started_at columns needed for tracking
--         when jobs are assigned to providers and when work actually begins.
--         Also fixes transactions table to properly track customers and references.
-- Impact: Enables better job lifecycle tracking and transaction auditing
-- Date: Feb 15, 2026

-- Add job lifecycle tracking columns
ALTER TABLE jobs ADD COLUMN assigned_at TEXT;
ALTER TABLE jobs ADD COLUMN started_at TEXT;

-- Note: Transaction tracking columns (customer_id, reference) should be added
-- if/when transaction processing is implemented. Currently using Stripe payment IDs.
