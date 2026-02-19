CREATE TABLE IF NOT EXISTS service_task_templates (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'check',
  is_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_service_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  template_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'check',
  is_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  answer TEXT,
  completed_at TEXT,
  override_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stt_service_id ON service_task_templates(service_id);
CREATE INDEX IF NOT EXISTS idx_jst_job_id ON job_service_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_jst_service_id ON job_service_tasks(service_id);
