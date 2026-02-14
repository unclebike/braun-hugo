-- Migration: SMS integration via Twilio
-- Adds: sms_log table, sms_templates table, consent + opt-out columns on customers

-- Track all SMS messages sent and received
CREATE TABLE IF NOT EXISTS sms_log (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  job_id TEXT,
  message_id TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',  -- 'outbound' | 'inbound'
  phone_to TEXT NOT NULL,
  phone_from TEXT NOT NULL,
  body TEXT NOT NULL,
  template_event TEXT,                          -- which template triggered this (e.g. 'booking.confirmed')
  twilio_sid TEXT,                              -- Twilio MessageSid for tracking
  status TEXT NOT NULL DEFAULT 'queued',        -- queued | sent | delivered | undelivered | failed
  error_code TEXT,
  error_message TEXT,
  segments INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_sms_log_customer ON sms_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_job ON sms_log(job_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_twilio_sid ON sms_log(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_sms_log_phone_to ON sms_log(phone_to);
CREATE INDEX IF NOT EXISTS idx_sms_log_direction ON sms_log(direction);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON sms_log(created_at);

-- SMS templates with variable substitution
-- Variables use {{variable_name}} syntax
CREATE TABLE IF NOT EXISTS sms_templates (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL UNIQUE,              -- e.g. 'booking.confirmed', 'status.enroute'
  label TEXT NOT NULL,                          -- Human-readable name for admin UI
  body_template TEXT NOT NULL,                  -- Template body with {{variables}}
  is_active INTEGER NOT NULL DEFAULT 1,         -- Toggle per event type
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default templates
INSERT INTO sms_templates (id, event_type, label, body_template) VALUES
  ('tpl_booking_confirmed', 'booking.confirmed', 'Booking Confirmed',
   'Hi {{first_name}}, your {{service_name}} with Uncle Bike is booked for {{date}} at {{time}}. We''ll text you with updates. Reply STOP to opt out.'),
  ('tpl_status_assigned', 'status.assigned', 'Technician Assigned',
   'Hi {{first_name}}, {{provider_name}} has been assigned to your {{service_name}} on {{date}}. See you soon!'),
  ('tpl_status_enroute', 'status.enroute', 'Technician En Route',
   'Hi {{first_name}}, {{provider_name}} is on the way! ETA approx. 15 min for your {{service_name}}.'),
  ('tpl_status_in_progress', 'status.in_progress', 'Job In Progress',
   'Hi {{first_name}}, work has started on your {{service_name}}. We''ll let you know when it''s done!'),
  ('tpl_status_complete', 'status.complete', 'Job Complete',
   'Hi {{first_name}}, your {{service_name}} is complete! Total: ${{total}}. Thanks for choosing Uncle Bike!'),
  ('tpl_status_cancelled', 'status.cancelled', 'Job Cancelled',
   'Hi {{first_name}}, your {{service_name}} scheduled for {{date}} has been cancelled. Questions? Reply to this text.'),
  ('tpl_reminder_day_before', 'reminder.day_before', 'Reminder (Day Before)',
   'Reminder: Uncle Bike is coming tomorrow at {{time}} for your {{service_name}}. Reply if you need to reschedule.'),
  ('tpl_reminder_morning_of', 'reminder.morning_of', 'Reminder (Morning Of)',
   'Hi {{first_name}}, just a reminder — your {{service_name}} is today at {{time}}. See you soon!');

-- Add SMS consent and opt-out tracking to customers
ALTER TABLE customers ADD COLUMN sms_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN sms_consent_at TEXT;
ALTER TABLE customers ADD COLUMN sms_opted_out INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN sms_opted_out_at TEXT;
ALTER TABLE customers ADD COLUMN phone_e164 TEXT;  -- Normalized E.164 format (+1XXXXXXXXXX)
