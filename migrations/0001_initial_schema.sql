PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS territories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  service_area_type TEXT NOT NULL,
  service_area_data TEXT NOT NULL DEFAULT '{}',
  operating_hours TEXT NOT NULL DEFAULT '{}',
  scheduling_policy TEXT NOT NULL DEFAULT 'provider_based',
  max_concurrent_jobs INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  base_duration_minutes INTEGER NOT NULL DEFAULT 60,
  required_provider_count INTEGER NOT NULL DEFAULT 1,
  auto_assign_enabled INTEGER NOT NULL DEFAULT 0,
  auto_assign_method TEXT NOT NULL DEFAULT 'balanced',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);

CREATE TABLE IF NOT EXISTS service_modifiers (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_adjustment_cents INTEGER NOT NULL DEFAULT 0,
  duration_adjustment_minutes INTEGER NOT NULL DEFAULT 0,
  is_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_required_skills (
  service_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  PRIMARY KEY (service_id, skill_id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS territory_services (
  territory_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  PRIMARY KEY (territory_id, service_id),
  FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  line_1 TEXT NOT NULL,
  line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  lat REAL,
  lng REAL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  can_be_auto_assigned INTEGER NOT NULL DEFAULT 1,
  can_edit_availability INTEGER NOT NULL DEFAULT 0,
  auto_assign_priority INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_member_skills (
  team_member_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  PRIMARY KEY (team_member_id, skill_id),
  FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_member_territories (
  team_member_id TEXT NOT NULL,
  territory_id TEXT NOT NULL,
  PRIMARY KEY (team_member_id, territory_id),
  FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
  FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_weekly_hours (
  id TEXT PRIMARY KEY,
  team_member_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_date_overrides (
  id TEXT PRIMARY KEY,
  team_member_id TEXT NOT NULL,
  date TEXT NOT NULL,
  is_available INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  service_id TEXT,
  territory_id TEXT,
  customer_address_id TEXT,
  scheduled_date TEXT NOT NULL,
  scheduled_start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  custom_service_name TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  assigned_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (territory_id) REFERENCES territories(id),
  FOREIGN KEY (customer_address_id) REFERENCES customer_addresses(id)
);

CREATE TABLE IF NOT EXISTS job_providers (
  job_id TEXT NOT NULL,
  team_member_id TEXT NOT NULL,
  PRIMARY KEY (job_id, team_member_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (team_member_id) REFERENCES team_members(id)
);

CREATE TABLE IF NOT EXISTS job_notes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recurring_bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  service_id TEXT,
  territory_id TEXT,
  frequency TEXT NOT NULL,
  day_of_week INTEGER,
  scheduled_start_time TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  next_scheduled_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (territory_id) REFERENCES territories(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  customer_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  invoice_id TEXT,
  customer_id TEXT,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL,
  payment_method TEXT,
  reference TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TEXT,
  valid_until TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  secret TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_adjustment_rules (
  id TEXT PRIMARY KEY,
  service_id TEXT,
  territory_id TEXT,
  rule_type TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  adjustment_value REAL NOT NULL,
  direction TEXT NOT NULL DEFAULT 'increase',
  days_of_week TEXT,
  start_time TEXT,
  end_time TEXT,
  min_hours_ahead INTEGER,
  max_hours_ahead INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_service_modifiers_service_id ON service_modifiers(service_id);
CREATE INDEX IF NOT EXISTS idx_territory_services_territory_id ON territory_services(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_services_service_id ON territory_services(service_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_team_member_skills_team_member_id ON team_member_skills(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_territories_team_member_id ON team_member_territories(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_territories_territory_id ON team_member_territories(territory_id);
CREATE INDEX IF NOT EXISTS idx_provider_weekly_hours_member_day ON provider_weekly_hours(team_member_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_provider_date_overrides_member_date ON provider_date_overrides(team_member_id, date);
CREATE INDEX IF NOT EXISTS idx_jobs_schedule ON jobs(territory_id, scheduled_date, scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_providers_member ON job_providers(team_member_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_recurring_customer ON recurring_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_price_adjustment_rules_service ON price_adjustment_rules(service_id, territory_id, is_active);
