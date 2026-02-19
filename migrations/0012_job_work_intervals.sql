ALTER TABLE jobs ADD COLUMN work_intervals_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN paused_at TEXT;
