// biome-ignore assist/source/organizeImports: keep imports stable for this file
import { type Context, Hono } from 'hono';
import { checkServiceArea } from '../geo/service-area';
import { sendJobSms, sendDirectSms, normalizePhoneE164, getTwilioConfig, isTwilioEnabled, ensureSmsInboxMessage } from '../services/twilio';
import type { TemplateVars } from '../services/twilio';
import { buildServiceBaseLine, normalizeLine, parseEditableText, parsePriceLines, subtotalFromLines, type PriceLineItem } from '../utils/line-items';
import { type FormField, FormView, TableView } from '../views/components';
import { BrandingPage } from '../views/branding';
import { MessageDetailPage, SmsHistoryList, SmsThreadPanel } from '../views/message-detail';
import type { SmsLogRow } from '../views/message-detail';
import { Dashboard } from '../views/dashboard';
import { JobDetailPage, SmsThreadCard } from '../views/job-detail';
import { AddressSearchResults, CustomerSearchResults, JobWizardPage, JobWizardSwapBundle, parseWizardState, type NewJobProps, type WizardState } from '../views/job-wizard';
import { ProviderDetailPage } from '../views/provider-detail';
import { ServiceDetailPage } from '../views/service-detail';
import { GeofencePanel, RadiusPanel, TerritoryDetailPage, ZipPanel } from '../views/territory-detail';
import { SmsSettingsPage } from '../views/sms-settings';
import { PUSH_MANIFEST, PUSH_SERVICE_WORKER_SCRIPT, PushSettingsPage } from '../views/push-settings';
import { InvoiceDetailPage } from '../views/invoice-detail';
import { formatTorontoDate } from '../utils/datetime';
import {
  deactivatePushSubscription,
  enqueueTestPushNotificationAndPing,
  getPushSubscriptionStatus,
  getPushVapidPublicKey,
  pullPendingPushNotifications,
  upsertPushSubscription,
} from '../services/notifications';

type WizardCustomer = { id: string; first_name: string; last_name: string; email?: string; phone?: string };
type WizardService = { id: string; name: string; description?: string; base_price_cents: number; base_duration_minutes: number };
type InboxJobOption = { id: string; label: string };


const parseJsonObject = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
};

const toTaskTitle = (text: string) => {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  if (compact.length <= 72) return compact;
  return `${compact.slice(0, 69).trimEnd()}...`;
};

const getCompletedSmsTaskIds = async (db: D1Database, jobId: string | null): Promise<string[]> => {
  if (!jobId) return [];
  const job = await db.prepare('SELECT notes_json FROM jobs WHERE id = ?').bind(jobId).first<{ notes_json: string | null }>();
  if (!job?.notes_json) return [];

  const completed = new Set<string>();
  try {
    const notes = JSON.parse(job.notes_json) as unknown;
    if (!Array.isArray(notes)) return [];

    for (const note of notes) {
      if (!note || typeof note !== 'object' || Array.isArray(note)) continue;
      const noteRecord = note as Record<string, unknown>;
      if (!noteRecord.completed) continue;
      const source = noteRecord.source;
      if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
      const sourceRecord = source as Record<string, unknown>;
      if (sourceRecord.type !== 'sms') continue;
      if (typeof sourceRecord.sms_log_id === 'string' && sourceRecord.sms_log_id.trim()) {
        completed.add(sourceRecord.sms_log_id);
      }
    }
  } catch {
    return [];
  }

  return Array.from(completed);
};

type AdminContext = Context<{ Bindings: { DB: D1Database; MAPBOX_ACCESS_TOKEN?: string } }>;

const app = new Hono<{ Bindings: { DB: D1Database; MAPBOX_ACCESS_TOKEN?: string } }>();

const generateId = () => crypto.randomUUID();

const getAuthenticatedStaffEmail = (c: Context): string | null => {
  const auth = c.get('auth');
  if (!auth || auth.type !== 'cf_access' || !auth.email) return null;
  return auth.email;
};

const normalizeEmail = (value: string | null | undefined) => {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const parseMoneyToCents = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== 'string') return 0;
  const cleaned = value.trim().replace(/[$,]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
};

const formatCents = (value: number) => `$${(value / 100).toFixed(2)}`;

const nextInvoiceNumber = async (db: D1Database) => {
  const row = await db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1")
    .first<{ invoice_number: string | null }>();
  const suffix = row?.invoice_number ? Number.parseInt(row.invoice_number.replace('INV-', ''), 10) : 0;
  const next = Number.isFinite(suffix) ? suffix + 1 : 1;
  return `INV-${String(next).padStart(6, '0')}`;
};

const parseInvoiceLineItems = parseEditableText;

const recomputeJobTotals = async (db: D1Database, jobId: string): Promise<void> => {
  const job = await db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(jobId).first<{ line_items_json: string | null }>();
  if (!job) return;
  const lines = parsePriceLines(job.line_items_json);
  const total = subtotalFromLines(lines);
  const base = lines.find((line) => line.kind === 'service')?.total_cents || total;
  await db.prepare("UPDATE jobs SET base_price_cents = ?, total_price_cents = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(base, total, jobId)
    .run();
};

const syncInvoiceFromJob = async (db: D1Database, jobId: string): Promise<void> => {
  const [job, invoice] = await Promise.all([
    db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(jobId).first<{ line_items_json: string | null }>(),
    db.prepare('SELECT id, tax_cents, discount_cents FROM invoices WHERE job_id = ? AND status IN (\'pending\', \'sent\') ORDER BY created_at DESC LIMIT 1').bind(jobId).first<{ id: string; tax_cents: number; discount_cents: number }>(),
  ]);
  if (!job || !invoice) return;
  const lines = parsePriceLines(job.line_items_json);
  const subtotal = subtotalFromLines(lines);
  const total = Math.max(0, subtotal + Number(invoice.tax_cents || 0) - Number(invoice.discount_cents || 0));
  await db.prepare(
    `UPDATE invoices
     SET line_items_json = ?, subtotal_cents = ?, amount_cents = ?, total_cents = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(JSON.stringify(lines), subtotal, total, total, invoice.id).run();
};

const writeInvoiceLines = async (db: D1Database, invoiceId: string, lines: PriceLineItem[]): Promise<void> => {
  const invoice = await db.prepare('SELECT tax_cents, discount_cents FROM invoices WHERE id = ?').bind(invoiceId).first<{ tax_cents: number; discount_cents: number }>();
  if (!invoice) return;
  const subtotal = subtotalFromLines(lines);
  const total = Math.max(0, subtotal + Number(invoice.tax_cents || 0) - Number(invoice.discount_cents || 0));
  await db.prepare(
    `UPDATE invoices
     SET line_items_json = ?, subtotal_cents = ?, amount_cents = ?, total_cents = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(JSON.stringify(lines), subtotal, total, total, invoiceId).run();
};

const parseImportedCustomers = (raw: string): Array<{ first_name: string; last_name: string; email: string | null; phone: string | null }> => {
  const text = raw.trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const looksLikeCsvHeader = /first.?name|last.?name|email|phone|name/i.test(lines[0]);
  if (looksLikeCsvHeader) {
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const findIndex = (keys: string[]) => {
      for (const key of keys) {
        const idx = headers.indexOf(key);
        if (idx >= 0) return idx;
      }
      return -1;
    };
    const firstNameIndex = findIndex(['first_name', 'firstname', 'first name']);
    const lastNameIndex = findIndex(['last_name', 'lastname', 'last name']);
    const nameIndex = findIndex(['name', 'full_name', 'full name']);
    const emailIndex = findIndex(['email', 'email_address', 'email address']);
    const phoneIndex = findIndex(['phone', 'phone_number', 'phone number', 'mobile']);

    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((cell) => cell.trim());
      const fullName = nameIndex >= 0 ? (cols[nameIndex] || '') : '';
      const explicitFirst = firstNameIndex >= 0 ? (cols[firstNameIndex] || '') : '';
      const explicitLast = lastNameIndex >= 0 ? (cols[lastNameIndex] || '') : '';
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const first_name = explicitFirst || nameParts[0] || '';
      const last_name = explicitLast || nameParts.slice(1).join(' ') || '';
      return {
        first_name,
        last_name,
        email: emailIndex >= 0 ? normalizeEmail(cols[emailIndex] || null) : null,
        phone: phoneIndex >= 0 ? (cols[phoneIndex] || null) : null,
      };
    }).filter((entry) => entry.first_name && entry.last_name);
  }

  return lines.map((line) => {
    const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = line.match(/(\+?\d[\d\s().-]{7,}\d)/);
    const cleaned = line
      .replace(emailMatch?.[0] || '', '')
      .replace(phoneMatch?.[0] || '', '')
      .replace(/[<>]/g, ' ')
      .trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    return {
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
      email: normalizeEmail(emailMatch?.[0] || null),
      phone: phoneMatch?.[0]?.trim() || null,
    };
  }).filter((entry) => entry.first_name && entry.last_name);
};

app.get('/', async (c) => {
  const db = c.env.DB;
  
  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  const [
    todayJobs,
    weekJobs,
    totalCustomers,
    activeTerritories,
    activeProviders,
    pendingInvoices,
    upcomingJobs,
    recentBookings,
    recentMessages
  ] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE scheduled_date = ? AND status != 'cancelled'
    `).bind(today).first<{ count: number }>(),
    
    db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE scheduled_date BETWEEN ? AND ? AND status != 'cancelled'
    `).bind(today, weekFromNow.toISOString().split('T')[0]).first<{ count: number }>(),
    
    db.prepare('SELECT COUNT(*) as count FROM customers').first<{ count: number }>(),
    
    db.prepare('SELECT COUNT(*) as count FROM territories WHERE is_active = 1').first<{ count: number }>(),
    
    db.prepare(`
      SELECT COUNT(*) as count FROM team_members 
      WHERE is_active = 1 AND role = 'provider'
    `).first<{ count: number }>(),
    
    db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE status IN ('pending', 'sent')
    `).first<{ count: number }>(),
    
    db.prepare(`
      SELECT j.id, c.first_name || ' ' || c.last_name as customer_name,
             s.name as service_name, j.scheduled_date, j.scheduled_start_time, j.status
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN services s ON j.service_id = s.id
      WHERE j.scheduled_date BETWEEN ? AND ?
      AND j.status NOT IN ('cancelled', 'complete')
      ORDER BY j.scheduled_date, j.scheduled_start_time
      LIMIT 10
    `).bind(today, weekFromNow.toISOString().split('T')[0]).all(),
    
    db.prepare(`
      SELECT j.id, c.first_name || ' ' || c.last_name as customer_name,
             s.name as service_name, t.name as territory_name, j.status, j.created_at, j.total_price_cents
      FROM jobs j
      JOIN customers c ON j.customer_id = c.id
      LEFT JOIN services s ON j.service_id = s.id
      LEFT JOIN territories t ON j.territory_id = t.id
      ORDER BY j.created_at DESC
      LIMIT 10
    `).all(),
    
    db.prepare(`
      SELECT id, first_name, last_name, email, subject, is_read, created_at
      FROM messages
      ORDER BY created_at DESC
      LIMIT 10
    `).all()
  ]);
  
  const stats = {
    todayJobs: todayJobs?.count || 0,
    weekJobs: weekJobs?.count || 0,
    totalCustomers: totalCustomers?.count || 0,
    activeTerritories: activeTerritories?.count || 0,
    activeProviders: activeProviders?.count || 0,
    pendingInvoices: pendingInvoices?.count || 0
  };
  
  const dashboardHtml = Dashboard({ 
    stats,
    upcomingJobs: upcomingJobs.results || [],
    recentBookings: recentBookings.results || [],
    recentMessages: recentMessages.results || []
  });
  
  return c.html(dashboardHtml);
});

app.get('/territories', async (c) => {
  const db = c.env.DB;
  const territories = await db.prepare(`
    SELECT id, name, service_area_type, scheduling_policy, is_active
    FROM territories WHERE is_active = 1 ORDER BY name
  `).all();
  
  const rows = (territories.results || []).map(t => ({
    name: t.name,
    areaType: t.service_area_type,
    scheduling: t.scheduling_policy,
    active: t.is_active ? 'active' : 'inactive'
  }));
  
  return c.html(TableView({
    title: 'Territories',
    columns: ['Name', 'Area Type', 'Scheduling', 'Active'],
    rows,
    rawIds: (territories.results || []).map(t => t.id as string),
    createUrl: '/admin/territories/new',
    detailUrlPrefix: '/admin/territories',
    deleteUrlPrefix: '/admin/territories'
  }));
});

app.get('/territories/new', (c) => {
  return c.html(TerritoryDetailPage({
    territory: {
      id: '', name: '', timezone: 'America/Toronto',
      service_area_type: 'zip', service_area_data: '{}',
      operating_hours: '{}', scheduling_policy: 'provider_based',
      is_active: 1
    },
    services: [],
    providers: [],
    isNew: true
  }));
});

app.post('/territories', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO territories (id, name, timezone, service_area_type, service_area_data, scheduling_policy, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.timezone || 'America/Toronto',
    body.service_area_type,
    body.service_area_data || '{}',
    body.scheduling_policy,
    body.is_active === 'on' ? 1 : 0
  ).run();
  
  return c.redirect(`/admin/territories/${id}`);
});

app.get('/territories/:id/edit', async (c) => {
  return c.redirect(`/admin/territories/${c.req.param('id')}`);
});

app.post('/territories/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const section = body._section as string | undefined;

  if (section === 'basic') {
    await db.prepare(`
      UPDATE territories
      SET name = ?, timezone = ?, scheduling_policy = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name,
      body.timezone || 'America/New_York',
      body.scheduling_policy,
      body.is_active === 'on' ? 1 : 0,
      id
    ).run();

    return c.redirect(`/admin/territories/${id}`);
  }
  
  await db.prepare(`
    UPDATE territories 
    SET name = ?, timezone = ?, service_area_type = ?, service_area_data = ?, scheduling_policy = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.name,
    body.timezone || 'America/New_York',
    body.service_area_type,
    body.service_area_data || '{}',
    body.scheduling_policy,
    body.is_active === 'on' ? 1 : 0,
    id
  ).run();
  
  return c.redirect(`/admin/territories/${id}`);
});

app.post('/territories/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM territory_services WHERE territory_id = ?').bind(id).run();
  await db.prepare('DELETE FROM team_member_territories WHERE territory_id = ?').bind(id).run();
  await db.prepare("UPDATE territories SET is_active = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/territories/${id}`)) {
      c.header('HX-Redirect', '/admin/territories');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/territories');
});

app.get('/territories/:id/area-panel/:type', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const panelType = c.req.param('type');
  const territory = await db.prepare('SELECT service_area_type, service_area_data FROM territories WHERE id = ?').bind(id).first();
  const areaData = JSON.parse((territory?.service_area_data as string) || '{}');
  const zipCodes: string[] = areaData.zip_codes || areaData.zipCodes || [];

  if (panelType === 'zip') return c.html(ZipPanel({ tid: id, zipCodes }));
  if (panelType === 'radius') return c.html(RadiusPanel({ tid: id, areaData }));
  if (panelType === 'geofence') return c.html(GeofencePanel({ tid: id, areaData }));
  return c.text('Unknown panel type', 400);
});

app.get('/territories/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/territories/new');
  
  const territory = await db.prepare('SELECT * FROM territories WHERE id = ?').bind(id).first();
  if (!territory) return c.redirect('/admin/territories');
  
  const [allServices, territoryServices, allProviders, territoryProviders] = await Promise.all([
    db.prepare('SELECT id, name FROM services WHERE is_active = 1 ORDER BY name').all(),
    db.prepare('SELECT service_id FROM territory_services WHERE territory_id = ?').bind(id).all(),
    db.prepare("SELECT id, first_name, last_name FROM team_members WHERE role = 'provider' ORDER BY last_name").all(),
    db.prepare('SELECT team_member_id FROM team_member_territories WHERE territory_id = ?').bind(id).all()
  ]);
  
  const assignedServiceIds = new Set((territoryServices.results || []).map(r => r.service_id as string));
  const assignedProviderIds = new Set((territoryProviders.results || []).map(r => r.team_member_id as string));

  const territoryModel = territory as unknown as {
    id: string;
    name: string;
    timezone: string;
    service_area_type: string;
    service_area_data: string;
    operating_hours: string;
    scheduling_policy: string;
    max_concurrent_jobs?: number;
    is_active: number;
  };
  
  return c.html(TerritoryDetailPage({
    territory: territoryModel,
    services: (allServices.results || []).map(s => ({ id: s.id as string, name: s.name as string, assigned: assignedServiceIds.has(s.id as string) })),
    providers: (allProviders.results || []).map(p => ({ id: p.id as string, first_name: p.first_name as string, last_name: p.last_name as string, assigned: assignedProviderIds.has(p.id as string) }))
  }));
});

app.post('/territories/:id/area', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const areaType = body.service_area_type as string;
  let areaData = '{}';
  
  if (areaType === 'zip') {
    const zips = (body.zip_codes as string).split(',').map(z => z.trim()).filter(Boolean);
    areaData = JSON.stringify({ zip_codes: zips });
  } else if (areaType === 'radius') {
    areaData = JSON.stringify({ center: { lat: parseFloat(body.center_lat as string), lng: parseFloat(body.center_lng as string) }, radius_miles: parseFloat(body.radius_miles as string) });
  } else if (areaType === 'geofence') {
    const rawJson = body.polygon_json as string || '[]';
    try {
      const parsed = JSON.parse(rawJson);
      const polygon = Array.isArray(parsed) ? parsed : (parsed.polygon || []);
      areaData = JSON.stringify({ polygon });
    } catch {
      areaData = JSON.stringify({ polygon: [] });
    }
  }
  
  await db.prepare("UPDATE territories SET service_area_type = ?, service_area_data = ?, updated_at = datetime('now') WHERE id = ?").bind(areaType, areaData, id).run();
  return c.body('', 200);
});

app.post('/territories/:id/hours', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const hours: Record<string, { start: string; end: string } | null> = {};
  
  for (const key of dayKeys) {
    if (body[`${key}_enabled`] === 'on') {
      hours[key] = { start: body[`${key}_start`] as string, end: body[`${key}_end`] as string };
    } else {
      hours[key] = null;
    }
  }
  
  await db.prepare("UPDATE territories SET operating_hours = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(hours), id).run();
  return c.body('', 200);
});

app.post('/territories/:id/services', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const serviceIds = Array.isArray(body.service_ids) ? body.service_ids : (body.service_ids ? [body.service_ids] : []);
  
  await db.prepare('DELETE FROM territory_services WHERE territory_id = ?').bind(id).run();
  for (const sid of serviceIds) {
    await db.prepare('INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)').bind(id, sid).run();
  }
  return c.redirect(`/admin/territories/${id}`);
});

app.post('/territories/:id/services/:serviceId/toggle', async (c) => {
  const db = c.env.DB;
  const territoryId = c.req.param('id');
  const serviceId = c.req.param('serviceId');

  const existing = await db.prepare('SELECT 1 FROM territory_services WHERE territory_id = ? AND service_id = ?').bind(territoryId, serviceId).first();
  if (existing) {
    await db.prepare('DELETE FROM territory_services WHERE territory_id = ? AND service_id = ?').bind(territoryId, serviceId).run();
  } else {
    await db.prepare('INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)').bind(territoryId, serviceId).run();
  }

  return c.body('', 200);
});

app.post('/territories/:id/providers', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const providerIds = Array.isArray(body.provider_ids) ? body.provider_ids : (body.provider_ids ? [body.provider_ids] : []);
  
  await db.prepare('DELETE FROM team_member_territories WHERE territory_id = ?').bind(id).run();
  for (const pid of providerIds) {
    await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(pid, id).run();
  }
  return c.redirect(`/admin/territories/${id}`);
});

app.post('/territories/:id/providers/:providerId/toggle', async (c) => {
  const db = c.env.DB;
  const territoryId = c.req.param('id');
  const providerId = c.req.param('providerId');

  const existing = await db.prepare('SELECT 1 FROM team_member_territories WHERE territory_id = ? AND team_member_id = ?').bind(territoryId, providerId).first();
  if (existing) {
    await db.prepare('DELETE FROM team_member_territories WHERE territory_id = ? AND team_member_id = ?').bind(territoryId, providerId).run();
  } else {
    await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(providerId, territoryId).run();
  }

  return c.body('', 200);
});

app.get('/services', async (c) => {
  const db = c.env.DB;
  const services = await db.prepare(`
    SELECT s.id, s.name, s.base_price_cents, s.base_duration_minutes, s.is_active, c.name as category_name
    FROM services s
    LEFT JOIN service_categories c ON s.category_id = c.id
    WHERE s.is_active = 1
    ORDER BY s.name
  `).all();
  
  const rows = (services.results || []).map(s => ({
    name: s.name,
    price: `$${((s.base_price_cents as number) / 100).toFixed(2)}`,
    duration: `${s.base_duration_minutes} min`,
    active: s.is_active ? 'active' : 'inactive'
  }));
  
  return c.html(TableView({
    title: 'Services',
    columns: ['Name', 'Price', 'Duration', 'Active'],
    rows,
    rawIds: (services.results || []).map(s => s.id as string),
    createUrl: '/admin/services/new',
    detailUrlPrefix: '/admin/services',
    deleteUrlPrefix: '/admin/services'
  }));
});

app.get('/services/new', async (c) => {
  const db = c.env.DB;
  const categories = await db.prepare('SELECT id, name FROM service_categories ORDER BY sort_order, name').all();
  
  const fields: FormField[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'category_id', label: 'Category', type: 'select', options: (categories.results || []).map(c => ({ value: c.id as string, label: c.name as string })) },
    { name: 'base_price', label: 'Base Price ($)', type: 'number', required: true, min: 0, step: 0.01 },
    { name: 'base_duration_minutes', label: 'Duration (minutes)', type: 'number', required: true, min: 1 },
    { name: 'auto_assign_enabled', label: 'Auto-assign Enabled', type: 'checkbox' },
    { name: 'auto_assign_method', label: 'Auto-assign Method', type: 'select', value: 'balanced', options: [
      { value: 'balanced', label: 'Balanced' },
      { value: 'prioritized', label: 'Prioritized' },
      { value: 'drive_time', label: 'Drive Time' }
    ]},
    { name: 'is_active', label: 'Active', type: 'checkbox', value: true }
  ];
  
  return c.html(FormView({
    title: 'Create Service',
    fields,
    submitUrl: '/admin/services',
    cancelUrl: '/admin/services'
  }));
});

app.post('/services', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO services (id, name, description, category_id, base_price_cents, base_duration_minutes, auto_assign_enabled, auto_assign_method, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.name,
    body.description || null,
    body.category_id || null,
    Math.round(parseFloat(body.base_price as string || '0') * 100),
    parseInt(body.base_duration_minutes as string, 10) || 60,
    body.auto_assign_enabled === 'on' ? 1 : 0,
    body.auto_assign_method || 'balanced',
    body.is_active === 'on' ? 1 : 0
  ).run();
  
  return c.redirect('/admin/services');
});

app.get('/services/:id/edit', async (c) => {
  return c.redirect(`/admin/services/${c.req.param('id')}`);
});

app.post('/services/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const section = body._section as string | undefined;

  if (section === 'basic') {
    await db.prepare(`
      UPDATE services
      SET name = ?, description = ?, category_id = ?, base_price_cents = ?, base_duration_minutes = ?,
          auto_assign_enabled = ?, auto_assign_method = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.name,
      body.description || null,
      body.category_id || null,
      Math.round(parseFloat(body.base_price as string || '0') * 100),
      parseInt(body.base_duration_minutes as string, 10) || 60,
      body.auto_assign_enabled === 'on' ? 1 : 0,
      body.auto_assign_method || 'balanced',
      body.is_active === 'on' ? 1 : 0,
      id
    ).run();

    return c.redirect(`/admin/services/${id}`);
  }
  
  await db.prepare(`
    UPDATE services 
    SET name = ?, description = ?, category_id = ?, base_price_cents = ?, base_duration_minutes = ?, 
        auto_assign_enabled = ?, auto_assign_method = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.name,
    body.description || null,
    body.category_id || null,
    Math.round(parseFloat(body.base_price as string || '0') * 100),
    parseInt(body.base_duration_minutes as string, 10) || 60,
    body.auto_assign_enabled === 'on' ? 1 : 0,
    body.auto_assign_method || 'balanced',
    body.is_active === 'on' ? 1 : 0,
    id
  ).run();
  
  return c.redirect(`/admin/services/${id}`);
});

app.post('/services/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM territory_services WHERE service_id = ?').bind(id).run();
  await db.prepare("UPDATE services SET is_active = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/services/${id}`)) {
      c.header('HX-Redirect', '/admin/services');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/services');
});

const renderServiceDetail = async (c: AdminContext, serviceId: string) => {
  const db = c.env.DB;

  const service = await db.prepare('SELECT * FROM services WHERE id = ?').bind(serviceId).first();
  if (!service) return c.redirect('/admin/services');

  const [categories, modifiers, priceRules, reqSkills, allSkills, territories] = await Promise.all([
    db.prepare('SELECT id, name FROM service_categories ORDER BY sort_order, name').all(),
    db.prepare('SELECT * FROM service_modifiers WHERE service_id = ? ORDER BY sort_order').bind(serviceId).all(),
    db.prepare('SELECT par.*, t.name as territory_name FROM price_adjustment_rules par LEFT JOIN territories t ON par.territory_id = t.id WHERE par.service_id = ?').bind(serviceId).all(),
    db.prepare('SELECT s.id, s.name FROM service_required_skills srs JOIN skills s ON srs.skill_id = s.id WHERE srs.service_id = ?').bind(serviceId).all(),
    db.prepare('SELECT id, name FROM skills ORDER BY name').all(),
    db.prepare('SELECT id, name FROM territories ORDER BY name').all()
  ]);

  const serviceModel = service as unknown as {
    id: string;
    name: string;
    description?: string | null;
    category_id?: string | null;
    base_price_cents: number;
    base_duration_minutes: number;
    is_active: number;
    auto_assign_enabled: number;
    auto_assign_method: string;
    required_provider_count: number;
  };

  const categoryList = (categories.results || []).map(r => ({
    id: r.id as string,
    name: r.name as string,
  }));

  const modifierList = (modifiers.results || []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || undefined,
    price_adjustment_cents: Number(r.price_adjustment_cents || 0),
    duration_adjustment_minutes: Number(r.duration_adjustment_minutes || 0),
    is_required: Number(r.is_required || 0),
    sort_order: Number(r.sort_order || 0),
  }));

  const ruleList = (priceRules.results || []).map(r => ({
    id: r.id as string,
    rule_type: r.rule_type as string,
    adjustment_type: r.adjustment_type as string,
    adjustment_value: Number(r.adjustment_value || 0),
    direction: r.direction as string,
    days_of_week: (r.days_of_week as string) || undefined,
    start_time: (r.start_time as string) || undefined,
    end_time: (r.end_time as string) || undefined,
    min_hours_ahead: r.min_hours_ahead !== null && r.min_hours_ahead !== undefined ? Number(r.min_hours_ahead) : undefined,
    max_hours_ahead: r.max_hours_ahead !== null && r.max_hours_ahead !== undefined ? Number(r.max_hours_ahead) : undefined,
    territory_id: (r.territory_id as string) || undefined,
    territory_name: (r.territory_name as string) || undefined,
  }));

  const requiredSkillList = (reqSkills.results || []).map(r => ({
    id: r.id as string,
    name: r.name as string,
  }));

  const allSkillList = (allSkills.results || []).map(r => ({
    id: r.id as string,
    name: r.name as string,
  }));

  const territoryList = (territories.results || []).map(r => ({
    id: r.id as string,
    name: r.name as string,
  }));

  return c.html(ServiceDetailPage({
    service: serviceModel,
    categories: categoryList,
    modifiers: modifierList,
    priceRules: ruleList,
    requiredSkills: requiredSkillList,
    allSkills: allSkillList,
    territories: territoryList
  }));
};

app.get('/services/:id', async (c) => {
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/services/new');

  return renderServiceDetail(c, id);
});

app.post('/services/:id/modifiers/:modId/delete', async (c) => {
  const db = c.env.DB;
  await db.prepare('DELETE FROM service_modifiers WHERE id = ? AND service_id = ?')
    .bind(c.req.param('modId'), c.req.param('id')).run();
  return renderServiceDetail(c, c.req.param('id'));
});

app.post('/services/:id/rules/:ruleId/delete', async (c) => {
  const db = c.env.DB;
  await db.prepare('DELETE FROM price_adjustment_rules WHERE id = ? AND service_id = ?')
    .bind(c.req.param('ruleId'), c.req.param('id')).run();
  return renderServiceDetail(c, c.req.param('id'));
});

app.post('/services/:id/modifiers', async (c) => {
  const db = c.env.DB;
  const serviceId = c.req.param('id');
  const body = await c.req.parseBody();
  
  const maxOrder = await db.prepare('SELECT MAX(sort_order) as max_order FROM service_modifiers WHERE service_id = ?').bind(serviceId).first<{ max_order: number }>();
  
  await db.prepare('INSERT INTO service_modifiers (id, service_id, name, description, price_adjustment_cents, duration_adjustment_minutes, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(
    generateId(), serviceId, body.name, body.description || null,
    Math.round(parseFloat(body.price_adjustment as string || '0') * 100),
    parseInt(body.duration_adjustment_minutes as string, 10) || 0,
    body.is_required === 'on' ? 1 : 0,
    (maxOrder?.max_order || 0) + 1
  ).run();
  
  return c.redirect(`/admin/services/${serviceId}`);
});

app.post('/services/:id/rules', async (c) => {
  const db = c.env.DB;
  const serviceId = c.req.param('id');
  const body = await c.req.parseBody();
  
  await db.prepare('INSERT INTO price_adjustment_rules (id, service_id, rule_type, adjustment_type, adjustment_value, direction, days_of_week, start_time, end_time, min_hours_ahead, max_hours_ahead, territory_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(
    generateId(), serviceId, body.rule_type, body.adjustment_type,
    body.adjustment_type === 'flat'
      ? Math.round(parseFloat(body.adjustment_value as string || '0') * 100)
      : parseFloat(body.adjustment_value as string || '0'),
    body.direction,
    body.days_of_week || null, body.start_time || null, body.end_time || null,
    body.min_hours_ahead ? parseInt(body.min_hours_ahead as string, 10) : null,
    body.max_hours_ahead ? parseInt(body.max_hours_ahead as string, 10) : null,
    body.territory_id || null
  ).run();
  
  return c.redirect(`/admin/services/${serviceId}`);
});

app.post('/services/:id/skills', async (c) => {
  const db = c.env.DB;
  const serviceId = c.req.param('id');
  const body = await c.req.parseBody();
  const skillIds = Array.isArray(body.skill_ids) ? body.skill_ids : (body.skill_ids ? [body.skill_ids] : []);
  
  await db.prepare('DELETE FROM service_required_skills WHERE service_id = ?').bind(serviceId).run();
  for (const sid of skillIds) {
    await db.prepare('INSERT INTO service_required_skills (service_id, skill_id) VALUES (?, ?)').bind(serviceId, sid).run();
  }
  return c.redirect(`/admin/services/${serviceId}`);
});

app.get('/customers', async (c) => {
  const db = c.env.DB;
  const customers = await db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
           ca.line_1, ca.city, ca.state, ca.postal_code,
           t.name as territory_name
    FROM customers c
    LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default = 1
    LEFT JOIN jobs j ON j.customer_id = c.id
    LEFT JOIN territories t ON j.territory_id = t.id
    GROUP BY c.id
    ORDER BY c.created_at DESC LIMIT 50
  `).all();
  
  return c.html(TableView({
    title: 'Customers',
    columns: ['Name', 'Email', 'Phone', 'Address', 'Territory'],
    rows: (customers.results || []).map(cust => ({
      name: `${cust.first_name} ${cust.last_name}`,
      email: cust.email || '-',
      phone: cust.phone || '-',
      address: cust.line_1 ? `${cust.line_1}${cust.city ? `, ${cust.city}` : ''}${cust.state ? `, ${cust.state}` : ''} ${cust.postal_code || ''}`.trim() : '-',
      territory: cust.territory_name || '-'
    })),
    rawIds: (customers.results || []).map(cust => cust.id as string),
    createUrl: '/admin/customers/new',
    extraActions: [{ label: 'Import', url: '/admin/customers/import' }],
    detailUrlPrefix: '/admin/customers',
    deleteUrlPrefix: '/admin/customers'
  }));
});

app.get('/customers/new', (c) => {
  const error = c.req.query('error') || undefined;
  const fields: FormField[] = [
    { name: 'first_name', label: 'First Name', required: true },
    { name: 'last_name', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    {
      name: 'address_line_1',
      label: 'Address',
      placeholder: 'Start typing address',
      attrs: {
        'hx-get': '/admin/api/address/search',
        'hx-trigger': 'input changed delay:300ms',
        'hx-target': '#address-results',
        autocomplete: 'off',
      }
    },
    { name: 'address_line_2', label: 'Address Line 2' },
    { name: 'address_city', label: 'City' },
    { name: 'address_state', label: 'Province / State' },
    { name: 'address_postal', label: 'Postal Code' },
    { name: 'address_lat', label: 'Latitude', type: 'hidden' },
    { name: 'address_lng', label: 'Longitude', type: 'hidden' }
  ];
  
  return c.html(FormView({
    title: 'Create Customer',
    fields,
    error,
    submitUrl: '/admin/customers',
    cancelUrl: '/admin/customers'
  }));
});

app.post('/customers', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : null);
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const phoneE164 = normalizePhoneE164(phoneRaw || null);

  const duplicate = await db.prepare(
    `SELECT id, first_name, last_name FROM customers
     WHERE (? IS NOT NULL AND LOWER(email) = ?)
        OR (? IS NOT NULL AND phone_e164 = ?)
     LIMIT 1`
  ).bind(email, email, phoneE164, phoneE164).first<{ id: string; first_name: string; last_name: string }>();

  if (duplicate) {
    const q = new URLSearchParams({ error: `A customer already exists: ${duplicate.first_name} ${duplicate.last_name}.` });
    return c.redirect(`/admin/customers/new?${q.toString()}`);
  }
  
  await db.prepare(`
    INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.first_name,
    body.last_name,
    email,
    phoneRaw || null,
    phoneE164
  ).run();

  const line1 = typeof body.address_line_1 === 'string' ? body.address_line_1.trim() : '';
  const city = typeof body.address_city === 'string' ? body.address_city.trim() : '';
  const state = typeof body.address_state === 'string' ? body.address_state.trim() : '';
  const postal = typeof body.address_postal === 'string' ? body.address_postal.trim() : '';
  if (line1 && city && state && postal) {
    await db.prepare(`
      INSERT INTO customer_addresses (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      generateId(),
      id,
      line1,
      (typeof body.address_line_2 === 'string' && body.address_line_2.trim()) ? body.address_line_2.trim() : null,
      city,
      state,
      postal,
      (typeof body.address_lat === 'string' && body.address_lat.trim()) ? Number.parseFloat(body.address_lat) : null,
      (typeof body.address_lng === 'string' && body.address_lng.trim()) ? Number.parseFloat(body.address_lng) : null,
    ).run();
  }
  
  return c.redirect('/admin/customers');
});

app.get('/customers/import', (c) => {
  const error = c.req.query('error') || undefined;
  const fields: FormField[] = [
    {
      name: 'source_text',
      label: 'Paste Contacts (CSV or one contact per line)',
      type: 'textarea',
      required: true,
      placeholder: 'first_name,last_name,email,phone\nJane,Doe,jane@example.com,613-555-0101\n\nOR\n\nJane Doe jane@example.com 613-555-0101'
    }
  ];
  return c.html(FormView({
    title: 'Import Customers',
    fields,
    error,
    submitUrl: '/admin/customers/import',
    cancelUrl: '/admin/customers'
  }));
});

app.post('/customers/import', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const source = typeof body.source_text === 'string' ? body.source_text : '';
  const parsed = parseImportedCustomers(source);
  if (parsed.length === 0) {
    const q = new URLSearchParams({ error: 'No valid contacts found. Use CSV headers or one contact per line.' });
    return c.redirect(`/admin/customers/import?${q.toString()}`);
  }

  for (const entry of parsed) {
    const phoneE164 = normalizePhoneE164(entry.phone || null);
    const existing = await db.prepare(
      `SELECT id FROM customers
       WHERE (? IS NOT NULL AND LOWER(email) = ?)
          OR (? IS NOT NULL AND phone_e164 = ?)
       LIMIT 1`
    ).bind(entry.email, entry.email, phoneE164, phoneE164).first();
    if (existing) continue;

    await db.prepare(
      `INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId(),
      entry.first_name,
      entry.last_name,
      entry.email,
      entry.phone,
      phoneE164,
    ).run();
  }

  return c.redirect('/admin/customers');
});

app.get('/customers/:id', async (c) => {
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/customers/new');
  return c.redirect(`/admin/customers/${id}/edit`);
});

app.get('/customers/:id/edit', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const error = c.req.query('error') || undefined;
  const [customer, address, territory] = await Promise.all([
    db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first(),
    db.prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1').bind(id).first(),
    db.prepare('SELECT t.name FROM jobs j JOIN territories t ON j.territory_id = t.id WHERE j.customer_id = ? ORDER BY j.created_at DESC LIMIT 1').bind(id).first<{ name: string }>()
  ]);
  
  if (!customer) {
    return c.redirect('/admin/customers');
  }

  const fields: FormField[] = [
    { name: 'first_name', label: 'First Name', required: true, value: customer.first_name as string },
    { name: 'last_name', label: 'Last Name', required: true, value: customer.last_name as string },
    { name: 'email', label: 'Email', type: 'email', value: customer.email as string },
    { name: 'phone', label: 'Phone', type: 'tel', value: customer.phone as string },
    {
      name: 'address_line_1',
      label: 'Address',
      value: (address?.line_1 as string) || '',
      placeholder: 'Start typing address',
      attrs: {
        'hx-get': '/admin/api/address/search',
        'hx-trigger': 'input changed delay:300ms',
        'hx-target': '#address-results',
        autocomplete: 'off',
      }
    },
    { name: 'address_line_2', label: 'Address Line 2', value: (address?.line_2 as string) || '' },
    { name: 'address_city', label: 'City', value: (address?.city as string) || '' },
    { name: 'address_state', label: 'Province / State', value: (address?.state as string) || '' },
    { name: 'address_postal', label: 'Postal Code', value: (address?.postal_code as string) || '' },
    { name: 'address_lat', label: 'Latitude', type: 'hidden', value: String(address?.lat || '') },
    { name: 'address_lng', label: 'Longitude', type: 'hidden', value: String(address?.lng || '') },
    ...(territory ? [{ name: '_territory', label: 'Territory', value: territory.name, readonly: true } as FormField] : [])
  ];
  
  return c.html(FormView({
    title: 'Edit Customer',
    fields,
    error,
    submitUrl: `/admin/customers/${id}`,
    cancelUrl: '/admin/customers',
    isEdit: true,
    deleteUrl: `/admin/customers/${id}/delete`
  }));
});

app.post('/customers/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : null);
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const phoneE164 = normalizePhoneE164(phoneRaw || null);

  const duplicate = await db.prepare(
    `SELECT id, first_name, last_name FROM customers
     WHERE id != ?
       AND ((? IS NOT NULL AND LOWER(email) = ?) OR (? IS NOT NULL AND phone_e164 = ?))
     LIMIT 1`
  ).bind(id, email, email, phoneE164, phoneE164).first<{ id: string; first_name: string; last_name: string }>();

  if (duplicate) {
    const q = new URLSearchParams({ error: `A customer already exists: ${duplicate.first_name} ${duplicate.last_name}.` });
    return c.redirect(`/admin/customers/${id}/edit?${q.toString()}`);
  }
  
  await db.prepare(`
    UPDATE customers 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, phone_e164 = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.first_name,
    body.last_name,
    email,
    phoneRaw || null,
    phoneE164,
    id
  ).run();

  const line1 = typeof body.address_line_1 === 'string' ? body.address_line_1.trim() : '';
  const city = typeof body.address_city === 'string' ? body.address_city.trim() : '';
  const state = typeof body.address_state === 'string' ? body.address_state.trim() : '';
  const postal = typeof body.address_postal === 'string' ? body.address_postal.trim() : '';
  await db.prepare('DELETE FROM customer_addresses WHERE customer_id = ? AND is_default = 1').bind(id).run();
  if (line1 && city && state && postal) {
    await db.prepare(`
      INSERT INTO customer_addresses (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      generateId(),
      id,
      line1,
      (typeof body.address_line_2 === 'string' && body.address_line_2.trim()) ? body.address_line_2.trim() : null,
      city,
      state,
      postal,
      (typeof body.address_lat === 'string' && body.address_lat.trim()) ? Number.parseFloat(body.address_lat) : null,
      (typeof body.address_lng === 'string' && body.address_lng.trim()) ? Number.parseFloat(body.address_lng) : null,
    ).run();
  }
  
  return c.redirect('/admin/customers');
});

app.post('/customers/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/customers/${id}`)) {
      c.header('HX-Redirect', '/admin/customers');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/customers');
});

app.get('/team', async (c) => {
  const db = c.env.DB;
  const team = await db.prepare(`
    SELECT id, first_name, last_name, email, role, is_active
    FROM team_members WHERE is_active = 1 ORDER BY last_name, first_name
  `).all();
  
  const rows = (team.results || []).map(t => ({
    name: `${t.first_name} ${t.last_name}`,
    role: t.role,
    email: t.email,
    active: t.is_active ? 'active' : 'inactive'
  }));
  
  return c.html(TableView({
    title: 'Team',
    columns: ['Name', 'Role', 'Email', 'Active'],
    rows,
    rawIds: (team.results || []).map(t => t.id as string),
    createUrl: '/admin/team/new',
    detailUrlPrefix: '/admin/team',
    deleteUrlPrefix: '/admin/team'
  }));
});

app.get('/team/new', (c) => {
  const fields: FormField[] = [
    { name: 'first_name', label: 'First Name', required: true },
    { name: 'last_name', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'role', label: 'Role', type: 'select', required: true, value: 'provider', options: [
      { value: 'manager', label: 'Manager' },
      { value: 'provider', label: 'Provider' }
    ]},
    { name: 'can_be_auto_assigned', label: 'Can be Auto-assigned', type: 'checkbox', value: true },
    { name: 'is_active', label: 'Active', type: 'checkbox', value: true }
  ];
  
  return c.html(FormView({
    title: 'Create Team Member',
    fields,
    submitUrl: '/admin/team',
    cancelUrl: '/admin/team'
  }));
});

app.post('/team', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO team_members (id, first_name, last_name, email, phone, role, can_be_auto_assigned, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.first_name,
    body.last_name,
    body.email,
    body.phone || null,
    body.role || 'provider',
    body.can_be_auto_assigned === 'on' ? 1 : 0,
    body.is_active === 'on' ? 1 : 0
  ).run();
  
  return c.redirect('/admin/team');
});

app.get('/team/:id/edit', async (c) => {
  return c.redirect(`/admin/team/${c.req.param('id')}`);
});

app.post('/team/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const section = body._section as string | undefined;
  if (section && section !== 'profile') {
    // Backward-compat: unknown sections behave like full update.
  }
  
  await db.prepare(`
    UPDATE team_members 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, 
        can_be_auto_assigned = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.first_name,
    body.last_name,
    body.email,
    body.phone || null,
    body.role || 'provider',
    body.can_be_auto_assigned === 'on' ? 1 : 0,
    body.is_active === 'on' ? 1 : 0,
    id
  ).run();
  
  return c.redirect(`/admin/team/${id}`);
});

app.post('/team/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('UPDATE team_members SET is_active = 0 WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/team/${id}`)) {
      c.header('HX-Redirect', '/admin/team');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/team');
});

app.get('/team/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/team/new');
  
  const member = await db.prepare('SELECT * FROM team_members WHERE id = ?').bind(id).first();
  if (!member) return c.redirect('/admin/team');
  
  const [weeklyHours, dateOverrides, memberSkills, allSkills, allTerritories, memberTerritories] = await Promise.all([
    db.prepare('SELECT day_of_week, start_time, end_time FROM provider_weekly_hours WHERE team_member_id = ? ORDER BY day_of_week').bind(id).all(),
    db.prepare('SELECT * FROM provider_date_overrides WHERE team_member_id = ? ORDER BY date').bind(id).all(),
    db.prepare('SELECT s.id, s.name FROM team_member_skills tms JOIN skills s ON tms.skill_id = s.id WHERE tms.team_member_id = ?').bind(id).all(),
    db.prepare('SELECT id, name FROM skills ORDER BY name').all(),
    db.prepare('SELECT id, name FROM territories ORDER BY name').all(),
    db.prepare('SELECT territory_id FROM team_member_territories WHERE team_member_id = ?').bind(id).all()
  ]);
  
  const assignedTerritoryIds = new Set((memberTerritories.results || []).map(r => r.territory_id as string));

  const memberModel = member as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    role: string;
    is_active: number;
    can_be_auto_assigned: number;
    can_edit_availability: number;
    auto_assign_priority: number;
  };
  
  return c.html(ProviderDetailPage({
    member: memberModel,
    weeklyHours: (weeklyHours.results || []).map(h => ({
      day_of_week: Number(h.day_of_week),
      start_time: h.start_time as string,
      end_time: h.end_time as string,
    })),
    dateOverrides: (dateOverrides.results || []).map(o => ({
      id: o.id as string,
      date: o.date as string,
      is_available: Number(o.is_available),
      start_time: (o.start_time as string) || undefined,
      end_time: (o.end_time as string) || undefined,
    })),
    skills: (memberSkills.results || []).map(s => ({ id: s.id as string, name: s.name as string })),
    allSkills: (allSkills.results || []).map(s => ({ id: s.id as string, name: s.name as string })),
    territories: (allTerritories.results || []).map(t => ({ id: t.id as string, name: t.name as string, assigned: assignedTerritoryIds.has(t.id as string) }))
  }));
});

app.post('/team/:id/hours', async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param('id');
  const body = await c.req.parseBody();
  
  await db.prepare('DELETE FROM provider_weekly_hours WHERE team_member_id = ?').bind(memberId).run();
  
  for (let day = 0; day <= 6; day++) {
    if (body[`day_${day}_enabled`] === 'on') {
      await db.prepare('INSERT INTO provider_weekly_hours (id, team_member_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)').bind(
        generateId(), memberId, day, body[`day_${day}_start`] as string, body[`day_${day}_end`] as string
      ).run();
    }
  }
  
  return c.redirect(`/admin/team/${memberId}`);
});

app.post('/team/:id/overrides', async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param('id');
  const body = await c.req.parseBody();
  
  await db.prepare('INSERT INTO provider_date_overrides (id, team_member_id, date, is_available, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)').bind(
    generateId(), memberId, body.date,
    parseInt(body.is_available as string, 10), body.start_time || null, body.end_time || null
  ).run();
  
  return c.redirect(`/admin/team/${memberId}`);
});

app.delete('/team/:id/overrides/:oId', async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param('id');
  const overrideId = c.req.param('oId');

  await db.prepare('DELETE FROM provider_date_overrides WHERE id = ? AND team_member_id = ?').bind(overrideId, memberId).run();
  return c.redirect(`/admin/team/${memberId}`);
});

app.post('/team/:id/skills', async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param('id');
  const body = await c.req.parseBody();

  const removeSkillId = body.remove_skill_id as string | undefined;
  if (removeSkillId) {
    await db.prepare('DELETE FROM team_member_skills WHERE team_member_id = ? AND skill_id = ?').bind(memberId, removeSkillId).run();
    return c.redirect(`/admin/team/${memberId}`);
  }

  const skillIds = Array.isArray(body.skill_ids) ? body.skill_ids : (body.skill_ids ? [body.skill_ids] : []);
  
  await db.prepare('DELETE FROM team_member_skills WHERE team_member_id = ?').bind(memberId).run();
  for (const sid of skillIds) {
    await db.prepare('INSERT INTO team_member_skills (team_member_id, skill_id) VALUES (?, ?)').bind(memberId, sid).run();
  }
  return c.redirect(`/admin/team/${memberId}`);
});

app.post('/team/:id/territories', async (c) => {
  const db = c.env.DB;
  const memberId = c.req.param('id');
  const body = await c.req.parseBody();

  const removeTerritoryId = body.remove_territory_id as string | undefined;
  if (removeTerritoryId) {
    await db.prepare('DELETE FROM team_member_territories WHERE team_member_id = ? AND territory_id = ?').bind(memberId, removeTerritoryId).run();
    return c.redirect(`/admin/team/${memberId}`);
  }

  const territoryIds = Array.isArray(body.territory_ids) ? body.territory_ids : (body.territory_ids ? [body.territory_ids] : []);
  
  await db.prepare('DELETE FROM team_member_territories WHERE team_member_id = ?').bind(memberId).run();
  for (const tid of territoryIds) {
    await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(memberId, tid).run();
  }
  return c.redirect(`/admin/team/${memberId}`);
});

app.get('/jobs', async (c) => {
  const db = c.env.DB;
  const jobs = await db.prepare(`
    SELECT j.id, c.first_name || ' ' || c.last_name as customer_name,
           s.name as service_name, j.scheduled_date, j.status
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN services s ON j.service_id = s.id
    ORDER BY j.scheduled_date DESC
    LIMIT 50
  `).all();
  
  const rows = (jobs.results || []).map(j => ({
    customer: j.customer_name,
    service: j.service_name || 'Custom',
    date: j.scheduled_date,
    status: j.status
  }));
  
  return c.html(TableView({
    title: 'Jobs',
    columns: ['Customer', 'Service', 'Date', 'Status'],
    rows,
    rawIds: (jobs.results || []).map(j => j.id as string),
    createUrl: '/admin/jobs/new',
    detailUrlPrefix: '/admin/jobs',
    deleteUrlPrefix: '/admin/jobs'
  }));
});

app.get('/jobs/new', async (c) => {
  const db = c.env.DB;

  const customerId = c.req.query('customer_id') || undefined;
  const territoryIdQ = c.req.query('territory_id') || undefined;
  const serviceIdQ = c.req.query('service_id') || undefined;
  const dateQ = c.req.query('date') || undefined;
  const timeQ = c.req.query('time') || undefined;
  const providerIdQ = c.req.query('provider_id') || undefined;
  const addressLine1 = c.req.query('address_line1') || undefined;
  const error = c.req.query('error') || undefined;

  let customer: WizardCustomer | undefined;
  if (customerId) {
    const row = await db.prepare('SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?').bind(customerId).first();
    if (row) customer = row as unknown as WizardCustomer;
  }

  const territoriesRes = await db.prepare('SELECT id, name FROM territories WHERE is_active = 1 ORDER BY name').all();
  const territories = (territoriesRes.results || []).map(t => ({ id: t.id as string, name: t.name as string }));

  let selectedTerritoryId = territoryIdQ;
  const onlyTerritory = territories.length === 1 ? territories[0] : undefined;
  if (!selectedTerritoryId && onlyTerritory) selectedTerritoryId = onlyTerritory.id;

  let services: WizardService[] = [];
  if (selectedTerritoryId) {
    const servicesRes = await db.prepare(
      'SELECT s.id, s.name, s.description, s.base_price_cents, s.base_duration_minutes FROM services s JOIN territory_services ts ON s.id = ts.service_id WHERE ts.territory_id = ? AND s.is_active = 1 ORDER BY s.name'
    ).bind(selectedTerritoryId).all();
    services = (servicesRes.results || []) as unknown as WizardService[];
  }

  // Clear invalid service selection (eg. stale query)
  let selectedServiceId = serviceIdQ;
  if (selectedServiceId && services.length > 0 && !services.some(s => s.id === selectedServiceId)) {
    selectedServiceId = undefined;
  }
  const onlyService = services.length === 1 ? services[0] : undefined;
  if (!selectedServiceId && onlyService) selectedServiceId = onlyService.id;

  const today = new Date();
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    if (dateStr) dates.push(dateStr);
  }

  let selectedDate = dateQ;
  if (selectedDate && !dates.includes(selectedDate)) {
    // Keep the day strip stable; ignore out-of-window date
    selectedDate = undefined;
  }

  // Reuse the legacy wizard Step 3 logic: hourly slots 8am-5pm
  const timeslots: string[] = [];
  if (selectedServiceId && selectedDate) {
    for (let h = 8; h <= 17; h++) {
      timeslots.push(`${String(h).padStart(2, '0')}:00`);
    }
  }

  let selectedTime = timeQ;
  if (selectedTime && (!timeslots.includes(selectedTime) || !selectedDate)) {
    selectedTime = undefined;
  }

  let providers: { id: string; first_name: string; last_name: string; role: string; is_available: boolean }[] = [];
  if (selectedServiceId && selectedDate && selectedTime) {
    const providerQuery = "SELECT id, first_name, last_name, role, is_active FROM team_members WHERE role = 'provider' AND is_active = 1";
    const providersRes = await db.prepare(`${providerQuery} ORDER BY last_name, first_name`).all();
    providers = (providersRes.results || []).map(p => ({
      id: p.id as string,
      first_name: p.first_name as string,
      last_name: p.last_name as string,
      role: p.role as string,
      is_available: Boolean(p.is_active),
    }));
  }

  let selectedProviderId = providerIdQ;
  if (selectedProviderId && providers.length > 0 && !providers.some(p => p.id === selectedProviderId)) {
    selectedProviderId = undefined;
  }
  const onlyProvider = providers.length === 1 ? providers[0] : undefined;
  if (!selectedProviderId && onlyProvider) selectedProviderId = onlyProvider.id;

  const props: NewJobProps = {
    customer,
    territories,
    services,
    dates,
    timeslots,
    providers,
    addressLine1,
    selectedTerritoryId,
    selectedServiceId,
    selectedDate,
    selectedTime,
    selectedProviderId,
    error,
  };

  if (c.req.header('HX-Request') === 'true') {
    const targetId = c.req.header('HX-Target') || '';
    if (targetId && targetId !== 'page-content') {
      return c.html(JobWizardSwapBundle({ props, targetId }));
    }
  }

  return c.html(JobWizardPage(props));
});

app.post('/jobs/quick-create', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();

  const customerId = typeof body.customer_id === 'string' ? body.customer_id : '';
  const territoryId = typeof body.territory_id === 'string' ? body.territory_id : '';
  const serviceId = typeof body.service_id === 'string' ? body.service_id : '';
  const date = typeof body.date === 'string' ? body.date : '';
  const time = typeof body.time === 'string' ? body.time : '';
  const providerId = typeof body.provider_id === 'string' ? body.provider_id : '';
  const addressLine1 = typeof body.address_line1 === 'string' ? body.address_line1.trim() : '';

  if (!customerId || !territoryId || !serviceId || !date || !time) {
    const q = new URLSearchParams();
    if (customerId) q.set('customer_id', customerId);
    if (territoryId) q.set('territory_id', territoryId);
    if (serviceId) q.set('service_id', serviceId);
    if (date) q.set('date', date);
    if (time) q.set('time', time);
    if (providerId) q.set('provider_id', providerId);
    if (addressLine1) q.set('address_line1', addressLine1);
    q.set('error', 'Pick a customer, territory, service, date, and time.');
    return c.redirect(`/admin/jobs/new?${q.toString()}`);
  }

  const service = await db
    .prepare('SELECT base_price_cents, base_duration_minutes FROM services WHERE id = ?')
    .bind(serviceId)
    .first<{ base_price_cents: number; base_duration_minutes: number }>();

  const jobId = generateId();
  const priceCents = service?.base_price_cents || 0;
  const duration = service?.base_duration_minutes || 60;

  let customerAddressId: string | null = null;
  if (addressLine1) {
    customerAddressId = generateId();
    await db
      .prepare(
        'INSERT INTO customer_addresses (id, customer_id, line_1, city, state, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)'
      )
      .bind(customerAddressId, customerId, addressLine1, '', '', '')
      .run();
  }

  await db
    .prepare(`
      INSERT INTO jobs (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
                        duration_minutes, base_price_cents, total_price_cents, line_items_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      jobId,
      customerId,
      serviceId,
      territoryId,
      customerAddressId,
      date,
      time,
      duration,
      priceCents,
      priceCents,
      JSON.stringify([buildServiceBaseLine('Service', priceCents)]),
      providerId ? 'assigned' : 'created'
    )
    .run();

  if (providerId) {
    await db.prepare('INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)').bind(jobId, providerId).run();
  }

  return c.redirect(`/admin/jobs/${jobId}`);
});

app.get('/api/customers/search', async (c) => {
  const db = c.env.DB;
  const q = c.req.query('q') || '';
  if (q.length < 2) return c.html('');
  
  const customers = await db.prepare(
    'SELECT id, first_name, last_name, email FROM customers WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? ORDER BY last_name, first_name LIMIT 10'
  ).bind(`%${q}%`, `%${q}%`, `%${q}%`).all();
  
  return c.html(CustomerSearchResults({ customers: (customers.results || []) as { id: string; first_name: string; last_name: string; email?: string }[] }));
});

app.get('/api/address/search', async (c) => {
  const q = c.req.query('q')
    || c.req.query('center_address_q')
    || c.req.query('address_line1')
    || c.req.query('address_line_1')
    || '';
  const targetPrefix = c.req.query('center_address_q') ? 'radius' : undefined;
  if (q.length < 4) return c.html('');
  
  try {
    const token = c.env?.MAPBOX_ACCESS_TOKEN || '';
    if (!token) {
      return c.html('<div class="search-results"><div class="search-item text-muted-foreground">Mapbox is not configured.</div></div>');
    }
    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=ca&limit=5&access_token=${token}`);
    const data = await res.json() as {
      features?: Array<{
        properties: { full_address?: string; name?: string; context?: { place?: { name?: string }; region?: { region_code?: string }; postcode?: { name?: string }; address?: { street_name?: string; address_number?: string } } };
        geometry: { coordinates: [number, number] };
      }>;
    };

    const results = (data.features || []).map(f => {
      const p = f.properties;
      const ctx = p.context || {};
      return {
        display: p.full_address || p.name || '',
        line1: p.name || '',
        city: ctx.place?.name || '',
        state: ctx.region?.region_code || '',
        postal: ctx.postcode?.name || '',
        lat: String(f.geometry.coordinates[1]),
        lng: String(f.geometry.coordinates[0])
      };
    });

    return c.html(AddressSearchResults({ results, targetPrefix }));
  } catch {
    return c.html(AddressSearchResults({ results: [], targetPrefix }));
  }
});

app.post('/api/customers/create-for-job', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : null);
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const phoneE164 = normalizePhoneE164(phoneRaw || null);

  const existing = await db.prepare(
    `SELECT id, first_name, last_name, email, phone FROM customers
     WHERE (? IS NOT NULL AND LOWER(email) = ?)
        OR (? IS NOT NULL AND phone_e164 = ?)
     LIMIT 1`
  ).bind(email, email, phoneE164, phoneE164).first<{ id: string; first_name: string; last_name: string; email: string | null; phone: string | null }>();

  const id = existing?.id || generateId();
  if (!existing) {
    await db.prepare('INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164) VALUES (?, ?, ?, ?, ?, ?)').bind(
      id, body.first_name, body.last_name, email, phoneRaw || null, phoneE164
    ).run();
  }
  
  return c.html(JobWizardPage({
    step: 1,
    state: {},
    customer: existing
      ? { id: existing.id, first_name: existing.first_name, last_name: existing.last_name, email: existing.email || '', phone: existing.phone || '' }
      : { id, first_name: body.first_name as string, last_name: body.last_name as string, email: email || '', phone: phoneRaw }
  }));
});

app.post('/jobs/wizard/step1-address', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  
  const state: WizardState = {
    customer_id: body.customer_id as string,
    customer_name: body.customer_name as string,
    customer_email: body.customer_email as string,
    address_line1: body.address_line1 as string,
    address_city: body.address_city as string,
    address_state: body.address_state as string,
    address_postal: body.address_postal as string,
    address_lat: body.address_lat as string,
    address_lng: body.address_lng as string,
  };

  try {
    const territories = await db.prepare('SELECT id, name, service_area_type, service_area_data FROM territories WHERE is_active = 1').all();
    
    let matchedTerritory: { id: string; name: string } | null = null;
    for (const t of (territories.results || [])) {
      try {
        const result = checkServiceArea(
          t.service_area_type as string,
          t.service_area_data as string,
          {
            postalCode: state.address_postal,
            lat: state.address_lat ? parseFloat(state.address_lat) : undefined,
            lng: state.address_lng ? parseFloat(state.address_lng) : undefined,
          }
        );
        if (result.within) {
          matchedTerritory = { id: t.id as string, name: t.name as string };
          break;
        }
      } catch { /* skip malformed territory data */ }
    }
    
    if (!matchedTerritory) {
      const customer = await db.prepare('SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?').bind(state.customer_id).first();
      return c.html(JobWizardPage({
        step: 1,
        state,
        customer: customer as unknown as WizardCustomer,
        error: `No service territory covers ${state.address_postal || 'this address'}. Check your territory settings.`
      }));
    }
    
    state.territory_id = matchedTerritory.id;
    state.territory_name = matchedTerritory.name;
    
    const addressId = generateId();
    await db.prepare(
      'INSERT OR IGNORE INTO customer_addresses (id, customer_id, line_1, city, state, postal_code, lat, lng, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
    ).bind(
      addressId, state.customer_id, state.address_line1, state.address_city,
      state.address_state, state.address_postal,
      state.address_lat ? parseFloat(state.address_lat) : null,
      state.address_lng ? parseFloat(state.address_lng) : null
    ).run();
    
    const services = await db.prepare(
      'SELECT s.id, s.name, s.description, s.base_price_cents, s.base_duration_minutes FROM services s JOIN territory_services ts ON s.id = ts.service_id WHERE ts.territory_id = ? AND s.is_active = 1 ORDER BY s.name'
    ).bind(matchedTerritory.id).all();
    
    let serviceList = (services.results || []) as WizardService[];
    if (serviceList.length === 0) {
      serviceList = (await db.prepare('SELECT id, name, description, base_price_cents, base_duration_minutes FROM services WHERE is_active = 1 ORDER BY name').all()).results as WizardService[] || [];
    }
    
    return c.html(JobWizardPage({ step: 2, state, services: serviceList }));
  } catch (error) {
    console.error('Error in step1-address:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const customer = await db.prepare('SELECT id, first_name, last_name, email, phone FROM customers WHERE id = ?').bind(state.customer_id).first();
    return c.html(JobWizardPage({
      step: 1,
      state,
      customer: customer as unknown as WizardCustomer,
      error: `Error processing address: ${errorMsg}`
    }));
  }
});

app.post('/jobs/wizard/step3', async (c) => {
  const body = await c.req.parseBody();
  const state = parseWizardState(body);
  
  const today = new Date();
  const timeslots: { date: string; start_time: string; available: boolean }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    for (let h = 8; h <= 17; h++) {
      timeslots.push({ date: dateStr, start_time: `${String(h).padStart(2, '0')}:00`, available: true });
    }
  }
  
  return c.html(JobWizardPage({ step: 3, state, timeslots }));
});

app.post('/jobs/wizard/step4', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const state = parseWizardState(body);
  
  const providerQuery = "SELECT id, first_name, last_name, role, is_active FROM team_members WHERE role = 'provider'";
  const providers = await db.prepare(`${providerQuery} ORDER BY last_name, first_name`).all();
  
  return c.html(JobWizardPage({
    step: 4,
    state,
    providers: (providers.results || []).map(p => ({
      id: p.id as string,
      first_name: p.first_name as string,
      last_name: p.last_name as string,
      role: p.role as string,
      is_available: Boolean(p.is_active)
    }))
  }));
});

app.post('/jobs/create', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const state = parseWizardState(body);
  const jobId = generateId();
  
  const priceCents = state.service_price ? parseInt(String(state.service_price), 10) : 0;
  const duration = state.service_duration ? parseInt(String(state.service_duration), 10) : 60;
  
  await db.prepare(`
    INSERT INTO jobs (id, customer_id, service_id, territory_id, scheduled_date, scheduled_start_time, duration_minutes, base_price_cents, total_price_cents, line_items_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    jobId, state.customer_id, state.service_id || null, state.territory_id,
    state.date, state.time, duration, priceCents, priceCents,
    JSON.stringify([buildServiceBaseLine('Service', priceCents)]),
    state.provider_id ? 'assigned' : 'created'
  ).run();
  
  if (state.provider_id) {
    await db.prepare('INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)').bind(jobId, state.provider_id).run();
  }
  
  return c.redirect(`/admin/jobs/${jobId}`);
});

app.get('/jobs/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  if (id === 'new' || id === 'wizard') return c.redirect('/admin/jobs/new');
  
  const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
  if (!job) return c.redirect('/admin/jobs');
  
  const notesJson = (job.notes_json as string) || '[]';
  const parsedLineItems = parsePriceLines((job.line_items_json as string) || '[]');
  
  const [customer, service, territory, jobProviders, teamProviders] = await Promise.all([
    job.customer_id ? db.prepare('SELECT id, first_name, last_name, email, phone, phone_e164 FROM customers WHERE id = ?').bind(job.customer_id).first() : null,
    job.service_id ? db.prepare('SELECT id, name, description FROM services WHERE id = ?').bind(job.service_id).first() : null,
    job.territory_id ? db.prepare('SELECT id, name FROM territories WHERE id = ?').bind(job.territory_id).first() : null,
    db.prepare('SELECT tm.id, tm.first_name, tm.last_name FROM job_providers jp JOIN team_members tm ON jp.team_member_id = tm.id WHERE jp.job_id = ?').bind(id).all(),
    db.prepare("SELECT id, first_name, last_name FROM team_members WHERE role = 'provider' ORDER BY last_name, first_name").all()
  ]);

  const customerPhone = (customer as { phone_e164?: string | null; phone?: string | null } | null)?.phone_e164
    || normalizePhoneE164((customer as { phone?: string | null } | null)?.phone || null);
  const smsThreadMessage = await db.prepare(
    `SELECT id, is_read, updated_at, body,
            CASE WHEN json_extract(metadata, '$.job_id') = ? THEN 0 ELSE 1 END as sort_priority
     FROM messages
     WHERE source = 'sms'
       AND (
         json_extract(metadata, '$.job_id') = ?
         OR phone = ?
       )
     ORDER BY sort_priority ASC, updated_at DESC
     LIMIT 1`
  ).bind(id, id, customerPhone || '').first<{ id: string; is_read: number; updated_at: string; body: string | null }>();

  const assignedProviderId = (jobProviders.results || [])[0]?.id as string | undefined;

  const jobModel = job as unknown as {
    id: string;
    status: string;
    scheduled_date: string;
    scheduled_start_time: string;
    duration_minutes: number;
    base_price_cents: number;
    total_price_cents: number;
    custom_service_name?: string | null;
    created_at: string;
  };

  const notes = JSON.parse(notesJson) as Array<{ text: string; timestamp: string; completed: number }>;
  const lineItems = parsedLineItems.length > 0
    ? parsedLineItems
    : [buildServiceBaseLine((service as { name?: string } | null)?.name || (job.custom_service_name as string) || 'Service', Number(job.total_price_cents || 0))];
  
  return c.html(JobDetailPage({
    job: jobModel,
    customer: customer ? (customer as unknown as { id: string; first_name: string; last_name: string; email?: string; phone?: string }) : undefined,
    service: service ? (service as unknown as { id: string; name: string; description?: string }) : undefined,
    territory: territory ? (territory as unknown as { id: string; name: string }) : undefined,
    team: (teamProviders.results || []).map(p => ({
      id: p.id as string,
      first_name: p.first_name as string,
      last_name: p.last_name as string,
    })),
    assignedProviderId: assignedProviderId || null,
    notes,
    lineItems,
    smsThreadMessage: smsThreadMessage
      ? {
        id: smsThreadMessage.id,
        is_read: smsThreadMessage.is_read,
        updated_at: smsThreadMessage.updated_at,
        body: smsThreadMessage.body,
      }
      : null,
  }));
});

app.post('/jobs/:id/line-items/add', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.parseBody();
  const job = await db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(jobId).first<{ line_items_json: string | null }>();
  if (!job) return c.redirect('/admin/jobs');

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const quantity = Math.max(1, Number.parseFloat(String(body.quantity || '1')) || 1);
  const unitPriceCents = parseMoneyToCents(body.unit_price);
  if (!description) return c.redirect(`/admin/jobs/${jobId}`);

  const lines = parsePriceLines(job.line_items_json);
  lines.push(normalizeLine(description, quantity, unitPriceCents, 'custom', null, 1));
  await db.prepare("UPDATE jobs SET line_items_json = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(lines), jobId)
    .run();
  await recomputeJobTotals(db, jobId);
  await syncInvoiceFromJob(db, jobId);

  return c.redirect(`/admin/jobs/${jobId}`);
});

app.post('/jobs/:id/line-items/delete', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.parseBody();
  const lineId = typeof body.lineId === 'string' ? body.lineId : '';
  if (!lineId) return c.redirect(`/admin/jobs/${jobId}`);

  const job = await db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(jobId).first<{ line_items_json: string | null }>();
  if (!job) return c.redirect('/admin/jobs');
  const lines = parsePriceLines(job.line_items_json).filter((line) => !(line.id === lineId && line.is_custom === 1));
  await db.prepare("UPDATE jobs SET line_items_json = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(lines), jobId)
    .run();
  await recomputeJobTotals(db, jobId);
  await syncInvoiceFromJob(db, jobId);

  return c.redirect(`/admin/jobs/${jobId}`);
});

app.get('/jobs/:id/sms-thread-card', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const job = await db.prepare('SELECT customer_id FROM jobs WHERE id = ?').bind(id).first<{ customer_id: string | null }>();
  const customer = job?.customer_id
    ? await db.prepare('SELECT phone, phone_e164 FROM customers WHERE id = ?').bind(job.customer_id).first<{ phone: string | null; phone_e164: string | null }>()
    : null;
  const customerPhone = customer?.phone_e164 || normalizePhoneE164(customer?.phone || null);

  const smsThreadMessage = await db.prepare(
    `SELECT id, is_read, updated_at, body,
            CASE WHEN json_extract(metadata, '$.job_id') = ? THEN 0 ELSE 1 END as sort_priority
     FROM messages
     WHERE source = 'sms'
       AND (
         json_extract(metadata, '$.job_id') = ?
         OR phone = ?
       )
     ORDER BY sort_priority ASC, updated_at DESC
     LIMIT 1`
  ).bind(id, id, customerPhone || '').first<{ id: string; is_read: number; updated_at: string; body: string | null }>();

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');

  return c.html(SmsThreadCard({
    jobId: id,
    smsThreadMessage: smsThreadMessage
      ? {
        id: smsThreadMessage.id,
        is_read: smsThreadMessage.is_read,
        updated_at: smsThreadMessage.updated_at,
        body: smsThreadMessage.body,
      }
      : null,
  }));
});

app.post('/jobs/:id/notes/add', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.parseBody();
  
  const job = await db.prepare('SELECT notes_json FROM jobs WHERE id = ?').bind(jobId).first<{ notes_json: string }>();
  const notes = job?.notes_json ? JSON.parse(job.notes_json) : [];
  
  notes.push({
    text: body.text,
    timestamp: new Date().toISOString(),
    completed: 0
  });
  
  await db.prepare('UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(notes), jobId).run();
  
  return c.redirect(`/admin/jobs/${jobId}`);
});

app.post('/jobs/:id/notes/toggle', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.parseBody();
  const noteIndex = parseInt(body.noteIndex as string, 10);
  
  const job = await db.prepare('SELECT notes_json FROM jobs WHERE id = ?').bind(jobId).first<{ notes_json: string }>();
  const notes = job?.notes_json ? JSON.parse(job.notes_json) : [];
  
  if (notes[noteIndex]) {
    notes[noteIndex].completed = notes[noteIndex].completed ? 0 : 1;
  }
  
  await db.prepare('UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(notes), jobId).run();
  
  return c.redirect(`/admin/jobs/${jobId}`);
});

app.post('/jobs/:id/notes/delete', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.parseBody();
  const noteIndex = parseInt(body.noteIndex as string, 10);
  
  const job = await db.prepare('SELECT notes_json FROM jobs WHERE id = ?').bind(jobId).first<{ notes_json: string }>();
  const notes = job?.notes_json ? JSON.parse(job.notes_json) : [];
  
  notes.splice(noteIndex, 1);
  
  await db.prepare('UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(notes), jobId).run();
  
  return c.redirect(`/admin/jobs/${jobId}`);
});

app.post('/jobs/:id/status', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.parseBody();
  const status = body.status as string;
  
  const validStatuses = ['created', 'assigned', 'enroute', 'in_progress', 'complete', 'cancelled'];
  if (!validStatuses.includes(status)) return c.redirect(`/admin/jobs/${jobId}`);
  
  const updates: string[] = ['status = ?', "updated_at = datetime('now')"];
  const binds: unknown[] = [status];
  if (status === 'complete') updates.push("completed_at = datetime('now')");
  if (status === 'cancelled') updates.push("cancelled_at = datetime('now')");
  binds.push(jobId);
  
  await db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  
  const jobData = await db.prepare(
    `SELECT j.customer_id, j.total_price_cents, j.scheduled_date, j.scheduled_start_time, j.line_items_json,
            c.first_name, c.last_name, c.email, c.phone_e164,
            COALESCE(s.name, j.custom_service_name, 'Service') as service_name
     FROM jobs j
     JOIN customers c ON c.id = j.customer_id
     LEFT JOIN services s ON s.id = j.service_id
     WHERE j.id = ?`
  ).bind(jobId).first<{
    customer_id: string; total_price_cents: number; scheduled_date: string; scheduled_start_time: string; line_items_json: string | null;
    first_name: string; last_name: string; email: string | null; phone_e164: string | null; service_name: string;
  }>();

  if (jobData) {
    if (status === 'complete') {
      const existingInvoice = await db.prepare(
        'SELECT id FROM invoices WHERE job_id = ?'
      ).bind(jobId).first();
      
      if (!existingInvoice) {
        const invoiceId = generateId();
        const invoiceNumber = await nextInvoiceNumber(db);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        const jobLines = parsePriceLines(jobData.line_items_json);
        const effectiveLines = jobLines.length > 0 ? jobLines : [buildServiceBaseLine(jobData.service_name, jobData.total_price_cents)];
        const subtotal = subtotalFromLines(effectiveLines);
        
        await db.prepare(`
          INSERT INTO invoices (id, invoice_number, job_id, customer_id, currency, amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents, line_items_json, due_date, status)
          VALUES (?, ?, ?, ?, 'CAD', ?, ?, 0, 0, ?, ?, ?, 'pending')
        `).bind(
          invoiceId,
          invoiceNumber,
          jobId,
          jobData.customer_id,
          subtotal,
          subtotal,
          subtotal,
          JSON.stringify(effectiveLines),
          dueDate.toISOString().split('T')[0],
        ).run();
      }
    }

    let providerName = '';
    if (['assigned', 'enroute'].includes(status)) {
      const provider = await db.prepare(
        `SELECT tm.first_name, tm.last_name FROM job_providers jp
         JOIN team_members tm ON tm.id = jp.team_member_id
         WHERE jp.job_id = ? LIMIT 1`
      ).bind(jobId).first<{ first_name: string; last_name: string }>();
      if (provider) providerName = `${provider.first_name} ${provider.last_name}`.trim();
    }

    const statusEventMap: Record<string, string> = {
      assigned: 'status.assigned',
      enroute: 'status.enroute',
      in_progress: 'status.in_progress',
      complete: 'status.complete',
      cancelled: 'status.cancelled',
    };

    const eventType = statusEventMap[status];
    if (eventType) {
      const baseUrl = new URL(c.req.url).origin;
      const inboxMessageId = jobData.phone_e164
        ? await ensureSmsInboxMessage({
          db,
          phoneE164: jobData.phone_e164,
          customerId: jobData.customer_id,
          jobId,
          firstName: jobData.first_name,
          lastName: jobData.last_name,
          email: jobData.email,
        })
        : null;

      const templateVars: TemplateVars = {
        first_name: jobData.first_name,
        last_name: jobData.last_name,
        service_name: jobData.service_name,
        date: jobData.scheduled_date,
        time: jobData.scheduled_start_time,
        provider_name: providerName || 'your technician',
        total: (jobData.total_price_cents / 100).toFixed(2),
      };

      c.executionCtx.waitUntil(
        sendJobSms({
          db,
          jobId,
          customerId: jobData.customer_id,
          eventType,
          vars: templateVars,
          messageId: inboxMessageId,
          statusCallbackUrl: `${baseUrl}/webhooks/twilio/status`,
          skipQuietHours: true,
        })
      );
    }
  }
  
  return c.redirect(`/admin/jobs/${jobId}`);
});

app.post('/jobs', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  
  const totalPriceCents = parseInt(body.total_price_cents as string, 10) || 0;
  
  await db.prepare(`
    INSERT INTO jobs (id, customer_id, service_id, territory_id, scheduled_date, scheduled_start_time, 
                      duration_minutes, base_price_cents, total_price_cents, line_items_json, custom_service_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.customer_id,
    body.service_id || null,
    body.territory_id,
    body.scheduled_date,
    body.scheduled_start_time,
    parseInt(body.duration_minutes as string, 10) || 60,
    totalPriceCents,
    totalPriceCents,
    JSON.stringify([buildServiceBaseLine(String(body.custom_service_name || 'Service'), totalPriceCents)]),
    body.custom_service_name || null,
    body.status || 'created'
  ).run();
  
  return c.redirect('/admin/jobs');
});

app.get('/jobs/:id/edit', async (c) => {
  return c.redirect(`/admin/jobs/${c.req.param('id')}`);
});

app.post('/jobs/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const section = body._section as string | undefined;
  if (section === 'details') {
    const duration = parseInt(body.duration_minutes as string, 10) || 60;
    const basePriceCents = Math.round(parseFloat(body.base_price as string || '0') * 100);
    const totalPriceCents = Math.round(parseFloat(body.total_price as string || '0') * 100);
    const providerId = (body.provider_id as string | undefined) || '';

    const existing = await db.prepare('SELECT custom_service_name, line_items_json FROM jobs WHERE id = ?').bind(id).first<{ custom_service_name: string | null; line_items_json: string | null }>();
    const customLines = parsePriceLines(existing?.line_items_json || '[]').filter((line) => line.is_custom === 1);
    const generated = buildServiceBaseLine((existing?.custom_service_name || 'Service'), totalPriceCents);

    await db.prepare(`
      UPDATE jobs
      SET scheduled_date = ?, scheduled_start_time = ?, duration_minutes = ?,
          base_price_cents = ?, total_price_cents = ?, line_items_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.scheduled_date,
      body.scheduled_start_time,
      duration,
      basePriceCents,
      totalPriceCents,
      JSON.stringify([generated, ...customLines]),
      id
    ).run();

    await db.prepare('DELETE FROM job_providers WHERE job_id = ?').bind(id).run();
    if (providerId) {
      await db.prepare('INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)').bind(id, providerId).run();
    }

    return c.redirect(`/admin/jobs/${id}`);
  }

  // Backward-compat for legacy full edit forms.
  const totalPriceCents = parseInt(body.total_price_cents as string, 10) || 0;
  const existing = await db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(id).first<{ line_items_json: string | null }>();
  const customLines = parsePriceLines(existing?.line_items_json || '[]').filter((line) => line.is_custom === 1);
  const baseLine = buildServiceBaseLine(String(body.custom_service_name || 'Service'), totalPriceCents);
  await db.prepare(`
    UPDATE jobs 
    SET customer_id = ?, service_id = ?, territory_id = ?, scheduled_date = ?, scheduled_start_time = ?,
        duration_minutes = ?, total_price_cents = ?, line_items_json = ?, custom_service_name = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.customer_id,
    body.service_id || null,
    body.territory_id,
    body.scheduled_date,
    body.scheduled_start_time,
    parseInt(body.duration_minutes as string, 10) || 60,
    totalPriceCents,
    JSON.stringify([baseLine, ...customLines]),
    body.custom_service_name || null,
    body.status || 'created',
    id
  ).run();

  return c.redirect(`/admin/jobs/${id}`);
});

app.post('/jobs/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM job_notes WHERE job_id = ?').bind(id).run();
  await db.prepare('DELETE FROM job_providers WHERE job_id = ?').bind(id).run();
  await db.prepare('DELETE FROM invoices WHERE job_id = ?').bind(id).run();
  await db.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run();

  const isHtmx = c.req.header('HX-Request');
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/jobs/${id}`)) {
      c.header('HX-Redirect', '/admin/jobs');
    }
    return c.body('', 200);
  }
  return c.redirect('/admin/jobs');
});

app.get('/invoices', async (c) => {
  const db = c.env.DB;
  const invoices = await db.prepare(`
    SELECT i.id, i.invoice_number, i.customer_id,
           TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) as customer_name,
           i.total_cents, i.currency, i.status, i.due_date, i.created_at
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC
    LIMIT 50
  `).all();
  
  return c.html(TableView({
    title: 'Invoices',
    columns: ['Invoice #', 'Customer', 'Total', 'Status', 'Due', 'Created'],
    rows: (invoices.results || []).map(i => ({
      invoice: i.invoice_number || i.id,
      customer: (typeof i.customer_name === 'string' && i.customer_name.trim()) ? i.customer_name : `Customer ${i.customer_id}`,
      total: `${i.currency || 'CAD'} ${formatCents(Number(i.total_cents || 0))}`,
      status: i.status,
      due: i.due_date || '-',
      created: formatTorontoDate(`${i.created_at as string}Z`, {}) || (i.created_at as string)
    })),
    rawIds: (invoices.results || []).map(i => i.id as string),
    createUrl: '/admin/invoices/new',
    detailUrlPrefix: '/admin/invoices',
    deleteUrlPrefix: '/admin/invoices'
  }));
});

app.get('/invoices/new', async (c) => {
  const db = c.env.DB;
  const [customers, jobs] = await Promise.all([
    db.prepare('SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name').all(),
    db.prepare(`SELECT j.id, c.first_name || ' ' || c.last_name as customer_name, j.scheduled_date 
                FROM jobs j JOIN customers c ON j.customer_id = c.id 
                WHERE j.status != 'cancelled' ORDER BY j.scheduled_date DESC LIMIT 100`).all()
  ]);

  const invoiceNumber = await nextInvoiceNumber(db);
  
  const fields: FormField[] = [
    { name: 'invoice_number', label: 'Invoice Number', required: true, value: invoiceNumber },
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: (customers.results || []).map(c => ({ value: c.id as string, label: `${c.first_name} ${c.last_name}` })) },
    { name: 'job_id', label: 'Job (optional)', type: 'select', options: (jobs.results || []).map(j => ({ value: j.id as string, label: `${j.customer_name} - ${j.scheduled_date}` })) },
    { name: 'currency', label: 'Currency', type: 'select', required: true, value: 'CAD', options: [
      { value: 'CAD', label: 'CAD' },
      { value: 'USD', label: 'USD' }
    ]},
    { name: 'line_items_text', label: 'Line Items (one per line: description | qty | unit price)', type: 'textarea', placeholder: 'Tune-up | 1 | 125.00\nTire install | 2 | 35.00' },
    { name: 'tax_amount', label: 'Tax ($)', type: 'number', min: 0, step: 0.01, value: 0 },
    { name: 'discount_amount', label: 'Discount ($)', type: 'number', min: 0, step: 0.01, value: 0 },
    { name: 'total_amount', label: 'Total ($)', type: 'number', required: true, min: 0, step: 0.01 },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Payment terms, memo, or internal notes' },
    { name: 'status', label: 'Status', type: 'select', required: true, value: 'pending', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'void', label: 'Void' }
    ]}
  ];
  
  return c.html(FormView({
    title: 'Create Invoice',
    fields,
    submitUrl: '/admin/invoices',
    cancelUrl: '/admin/invoices'
  }));
});

app.post('/invoices', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  let lineItems = parseInvoiceLineItems(typeof body.line_items_text === 'string' ? body.line_items_text : null);
  if (lineItems.length === 0 && body.job_id) {
    const job = await db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(body.job_id).first<{ line_items_json: string | null }>();
    lineItems = parsePriceLines(job?.line_items_json || '[]');
  }
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const taxCents = parseMoneyToCents(body.tax_amount);
  const discountCents = parseMoneyToCents(body.discount_amount);
  const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
  const totalCents = computedTotalCents;
  const status = typeof body.status === 'string' ? body.status : 'pending';
  const paidAt = status === 'paid' ? new Date().toISOString() : null;
  
  await db.prepare(`
    INSERT INTO invoices (id, invoice_number, customer_id, job_id, currency, amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents, line_items_json, due_date, status, paid_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.invoice_number || await nextInvoiceNumber(db),
    body.customer_id,
    body.job_id || null,
    body.currency || 'CAD',
    totalCents,
    subtotalCents,
    taxCents,
    discountCents,
    totalCents,
    JSON.stringify(lineItems),
    body.due_date || null,
    status,
    paidAt,
    body.notes || null
  ).run();
  
  return c.redirect('/admin/invoices');
});

app.get('/invoices/:id', async (c) => {
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/invoices/new');
  return c.redirect(`/admin/invoices/${id}/edit`);
});

app.get('/invoices/:id/edit', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const [invoice, customers, jobs] = await Promise.all([
    db.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first(),
    db.prepare('SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name').all(),
    db.prepare(`SELECT j.id, c.first_name || ' ' || c.last_name as customer_name, j.scheduled_date 
                FROM jobs j JOIN customers c ON j.customer_id = c.id ORDER BY j.scheduled_date DESC LIMIT 100`).all()
  ]);
  
  if (!invoice) {
    return c.redirect('/admin/invoices');
  }
  
  const lineItems = parsePriceLines(invoice.line_items_json as string | null);
  return c.html(InvoiceDetailPage({
    invoice: {
      id: invoice.id as string,
      invoice_number: (invoice.invoice_number as string) || '',
      customer_id: invoice.customer_id as string,
      job_id: (invoice.job_id as string) || null,
      currency: ((invoice.currency as string) || 'CAD').toUpperCase(),
      due_date: (invoice.due_date as string) || null,
      status: (invoice.status as string) || 'pending',
      notes: (invoice.notes as string) || null,
      tax_cents: Number(invoice.tax_cents || 0),
      discount_cents: Number(invoice.discount_cents || 0),
    },
    customers: (customers.results || []).map((row) => ({
      id: row.id as string,
      first_name: row.first_name as string,
      last_name: row.last_name as string,
    })),
    jobs: (jobs.results || []).map((row) => ({
      id: row.id as string,
      customer_name: row.customer_name as string,
      scheduled_date: row.scheduled_date as string,
    })),
    lineItems,
  }));
});

app.post('/invoices/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const existingInvoice = await db.prepare('SELECT line_items_json FROM invoices WHERE id = ?').bind(id).first<{ line_items_json: string | null }>();
  if (!existingInvoice) return c.redirect('/admin/invoices');
  let lineItems = typeof body.line_items_text === 'string'
    ? parseInvoiceLineItems(body.line_items_text)
    : parsePriceLines(existingInvoice.line_items_json || '[]');
  if (lineItems.length === 0 && body.job_id) {
    const job = await db.prepare('SELECT line_items_json FROM jobs WHERE id = ?').bind(body.job_id).first<{ line_items_json: string | null }>();
    lineItems = parsePriceLines(job?.line_items_json || '[]');
  }
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const taxCents = parseMoneyToCents(body.tax_amount);
  const discountCents = parseMoneyToCents(body.discount_amount);
  const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
  const totalCents = computedTotalCents;
  const status = typeof body.status === 'string' ? body.status : 'pending';
  const paidAt = status === 'paid' ? new Date().toISOString() : null;
  
  await db.prepare(`
    UPDATE invoices 
    SET invoice_number = ?, customer_id = ?, job_id = ?, currency = ?, amount_cents = ?, subtotal_cents = ?, tax_cents = ?, discount_cents = ?, total_cents = ?, line_items_json = ?, due_date = ?, status = ?, paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, ?) ELSE NULL END, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.invoice_number,
    body.customer_id,
    body.job_id || null,
    body.currency || 'CAD',
    totalCents,
    subtotalCents,
    taxCents,
    discountCents,
    totalCents,
    JSON.stringify(lineItems),
    body.due_date || null,
    status,
    status,
    paidAt,
    body.notes || null,
    id
  ).run();
  
  return c.redirect('/admin/invoices');
});

app.post('/invoices/:id/line-items/add', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const invoice = await db.prepare('SELECT line_items_json FROM invoices WHERE id = ?').bind(id).first<{ line_items_json: string | null }>();
  if (!invoice) return c.redirect('/admin/invoices');
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const quantity = Math.max(1, Number.parseFloat(String(body.quantity || '1')) || 1);
  const unitPriceCents = parseMoneyToCents(body.unit_price);
  if (!description) return c.redirect(`/admin/invoices/${id}/edit`);
  const lines = parsePriceLines(invoice.line_items_json);
  lines.push(normalizeLine(description, quantity, unitPriceCents, 'custom', null, 1));
  await writeInvoiceLines(db, id, lines);
  return c.redirect(`/admin/invoices/${id}/edit`);
});

app.post('/invoices/:id/line-items/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const lineId = typeof body.lineId === 'string' ? body.lineId : '';
  if (!lineId) return c.redirect(`/admin/invoices/${id}/edit`);
  const invoice = await db.prepare('SELECT line_items_json FROM invoices WHERE id = ?').bind(id).first<{ line_items_json: string | null }>();
  if (!invoice) return c.redirect('/admin/invoices');
  const lines = parsePriceLines(invoice.line_items_json).filter((line) => !(line.id === lineId && line.is_custom === 1));
  await writeInvoiceLines(db, id, lines);
  return c.redirect(`/admin/invoices/${id}/edit`);
});

app.post('/invoices/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/invoices/${id}`)) {
      c.header('HX-Redirect', '/admin/invoices');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/invoices');
});

app.get('/recurring', async (c) => {
  const db = c.env.DB;
  const recurring = await db.prepare(`
    SELECT rb.id, c.first_name || ' ' || c.last_name as customer_name,
           s.name as service_name, rb.frequency, rb.is_active
    FROM recurring_bookings rb
    JOIN customers c ON rb.customer_id = c.id
    LEFT JOIN services s ON rb.service_id = s.id
    ORDER BY rb.created_at DESC
    LIMIT 50
  `).all();
  
  return c.html(TableView({
    title: 'Recurring Bookings',
    columns: ['Customer', 'Service', 'Frequency', 'Active'],
    rows: (recurring.results || []).map(r => ({
      customer: r.customer_name,
      service: r.service_name || 'N/A',
      frequency: r.frequency,
      active: r.is_active ? 'active' : 'inactive'
    })),
    createUrl: '/admin/recurring/new',
    detailUrlPrefix: '/admin/recurring',
    deleteUrlPrefix: '/admin/recurring'
  }));
});

app.get('/recurring/new', async (c) => {
  const db = c.env.DB;
  const [customers, services, territories] = await Promise.all([
    db.prepare('SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name').all(),
    db.prepare('SELECT id, name FROM services WHERE is_active = 1 ORDER BY name').all(),
    db.prepare('SELECT id, name FROM territories WHERE is_active = 1 ORDER BY name').all()
  ]);
  
  const fields: FormField[] = [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, options: (customers.results || []).map(c => ({ value: c.id as string, label: `${c.first_name} ${c.last_name}` })) },
    { name: 'service_id', label: 'Service', type: 'select', required: true, options: (services.results || []).map(s => ({ value: s.id as string, label: s.name as string })) },
    { name: 'territory_id', label: 'Territory', type: 'select', required: true, options: (territories.results || []).map(t => ({ value: t.id as string, label: t.name as string })) },
    { name: 'frequency', label: 'Frequency', type: 'select', required: true, options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'monthly', label: 'Monthly' }
    ]},
    { name: 'day_of_week', label: 'Day of Week', type: 'select', options: [
      { value: '0', label: 'Sunday' },
      { value: '1', label: 'Monday' },
      { value: '2', label: 'Tuesday' },
      { value: '3', label: 'Wednesday' },
      { value: '4', label: 'Thursday' },
      { value: '5', label: 'Friday' },
      { value: '6', label: 'Saturday' }
    ]},
    { name: 'scheduled_start_time', label: 'Start Time', type: 'time' },
    { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', required: true, value: 60, min: 1 },
    { name: 'total_price', label: 'Total Price ($)', type: 'number', required: true, value: '0.00', min: 0, step: 0.01 },
    { name: 'is_active', label: 'Active', type: 'checkbox', value: true }
  ];
  
  return c.html(FormView({
    title: 'Create Recurring Booking',
    fields,
    submitUrl: '/admin/recurring',
    cancelUrl: '/admin/recurring'
  }));
});

app.post('/recurring', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  
  const totalPriceCents = Math.round(parseFloat(body.total_price as string || '0') * 100);
  
  await db.prepare(`
    INSERT INTO recurring_bookings (id, customer_id, service_id, territory_id, frequency, day_of_week, 
                                    scheduled_start_time, duration_minutes, base_price_cents, total_price_cents, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.customer_id,
    body.service_id,
    body.territory_id,
    body.frequency,
    body.day_of_week ? parseInt(body.day_of_week as string, 10) : null,
    body.scheduled_start_time || null,
    parseInt(body.duration_minutes as string, 10) || 60,
    totalPriceCents,
    totalPriceCents,
    body.is_active === 'on' ? 1 : 0
  ).run();
  
  return c.redirect('/admin/recurring');
});

app.get('/recurring/:id', async (c) => {
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/recurring/new');
  return c.redirect(`/admin/recurring/${id}/edit`);
});

app.get('/recurring/:id/edit', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const [recurring, customers, services, territories] = await Promise.all([
    db.prepare('SELECT * FROM recurring_bookings WHERE id = ?').bind(id).first(),
    db.prepare('SELECT id, first_name, last_name FROM customers ORDER BY last_name, first_name').all(),
    db.prepare('SELECT id, name FROM services WHERE is_active = 1 ORDER BY name').all(),
    db.prepare('SELECT id, name FROM territories ORDER BY name').all()
  ]);
  
  if (!recurring) {
    return c.redirect('/admin/recurring');
  }
  
  const fields: FormField[] = [
    { name: 'customer_id', label: 'Customer', type: 'select', required: true, value: recurring.customer_id as string, options: (customers.results || []).map(c => ({ value: c.id as string, label: `${c.first_name} ${c.last_name}` })) },
    { name: 'service_id', label: 'Service', type: 'select', required: true, value: recurring.service_id as string, options: (services.results || []).map(s => ({ value: s.id as string, label: s.name as string })) },
    { name: 'territory_id', label: 'Territory', type: 'select', required: true, value: recurring.territory_id as string, options: (territories.results || []).map(t => ({ value: t.id as string, label: t.name as string })) },
    { name: 'frequency', label: 'Frequency', type: 'select', required: true, value: recurring.frequency as string, options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'monthly', label: 'Monthly' }
    ]},
    { name: 'day_of_week', label: 'Day of Week', type: 'select', value: recurring.day_of_week?.toString(), options: [
      { value: '0', label: 'Sunday' },
      { value: '1', label: 'Monday' },
      { value: '2', label: 'Tuesday' },
      { value: '3', label: 'Wednesday' },
      { value: '4', label: 'Thursday' },
      { value: '5', label: 'Friday' },
      { value: '6', label: 'Saturday' }
    ]},
    { name: 'scheduled_start_time', label: 'Start Time', type: 'time', value: recurring.scheduled_start_time as string },
    { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', required: true, value: recurring.duration_minutes as number, min: 1 },
    { name: 'total_price', label: 'Total Price ($)', type: 'number', required: true, value: ((recurring.total_price_cents as number) / 100).toFixed(2), min: 0, step: 0.01 },
    { name: 'is_active', label: 'Active', type: 'checkbox', value: Boolean(recurring.is_active) }
  ];
  
  return c.html(FormView({
    title: 'Edit Recurring Booking',
    fields,
    submitUrl: `/admin/recurring/${id}`,
    cancelUrl: '/admin/recurring',
    isEdit: true,
    deleteUrl: `/admin/recurring/${id}/delete`
  }));
});

app.post('/recurring/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  
  const totalPriceCents = Math.round(parseFloat(body.total_price as string || '0') * 100);
  
  await db.prepare(`
    UPDATE recurring_bookings 
    SET customer_id = ?, service_id = ?, territory_id = ?, frequency = ?, day_of_week = ?,
        scheduled_start_time = ?, duration_minutes = ?, total_price_cents = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.customer_id,
    body.service_id,
    body.territory_id,
    body.frequency,
    body.day_of_week ? parseInt(body.day_of_week as string, 10) : null,
    body.scheduled_start_time || null,
    parseInt(body.duration_minutes as string, 10) || 60,
    totalPriceCents,
    body.is_active === 'on' ? 1 : 0,
    id
  ).run();
  
  return c.redirect('/admin/recurring');
});

app.post('/recurring/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM recurring_bookings WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/recurring/${id}`)) {
      c.header('HX-Redirect', '/admin/recurring');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/recurring');
});

app.get('/branding', async (c) => {
  const db = c.env.DB;
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'widget_branding'").first<{ value: string }>();
  let branding = { primaryColor: '#2563eb' };
  if (row) {
    try {
      branding = { ...branding, ...JSON.parse(row.value) };
    } catch {
    }
  }
  return c.html(BrandingPage(branding));
});

app.post('/branding', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const branding = { primaryColor: (body.primaryColor as string) || '#2563eb' };
  await db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('widget_branding', ?, datetime('now'))").bind(JSON.stringify(branding)).run();
  return c.body('', 200);
});

app.get('/settings', async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare('SELECT key, value FROM settings ORDER BY key').all();
  
  return c.html(TableView({
    title: 'Settings',
    columns: ['Key', 'Value'],
    rows: (settings.results || []).map(s => ({
      id: s.key,
      key: s.key,
      value: s.value
    })),
    createUrl: '/admin/settings/new',
  }));
});

app.get('/settings/new', (c) => {
  const fields: FormField[] = [
    { name: 'key', label: 'Key', required: true },
    { name: 'value', label: 'Value', type: 'textarea', required: true }
  ];
  
  return c.html(FormView({
    title: 'Create Setting',
    fields,
    submitUrl: '/admin/settings',
    cancelUrl: '/admin/settings'
  }));
});

app.post('/settings', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  
  await db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).bind(body.key, body.value).run();
  
  return c.redirect('/admin/settings');
});

app.get('/settings/:key/edit', async (c) => {
  const db = c.env.DB;
  const key = c.req.param('key');
  const setting = await db.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first();
  
  if (!setting) {
    return c.redirect('/admin/settings');
  }
  
  const fields: FormField[] = [
    { name: 'key', label: 'Key', required: true, value: setting.key as string },
    { name: 'value', label: 'Value', type: 'textarea', required: true, value: setting.value as string }
  ];
  
  return c.html(FormView({
    title: 'Edit Setting',
    fields,
    submitUrl: `/admin/settings/${key}`,
    cancelUrl: '/admin/settings',
    isEdit: true,
    deleteUrl: `/admin/settings/${key}/delete`
  }));
});

app.post('/settings/:key', async (c) => {
  const db = c.env.DB;
  const oldKey = c.req.param('key');
  const body = await c.req.parseBody();
  
  if (oldKey !== body.key) {
    await db.prepare('DELETE FROM settings WHERE key = ?').bind(oldKey).run();
  }
  
  await db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `).bind(body.key, body.value).run();
  
  return c.redirect('/admin/settings');
});

app.post('/settings/:key/delete', async (c) => {
  const db = c.env.DB;
  const key = c.req.param('key');

  await db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/settings/${key}`)) {
      c.header('HX-Redirect', '/admin/settings');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/settings');
});

app.get('/push-settings', (c) => {
  return c.html(PushSettingsPage());
});

app.get('/manifest.webmanifest', (c) => {
  return c.text(JSON.stringify(PUSH_MANIFEST), 200, {
    'Content-Type': 'application/manifest+json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  });
});

app.get('/sw.js', (c) => {
  return c.text(PUSH_SERVICE_WORKER_SCRIPT, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  });
});

app.get('/push/vapid-public-key', async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: 'Cloudflare Access user required' }, 403);
  }

  try {
    const publicKey = await getPushVapidPublicKey(db);
    return c.json({ publicKey });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: 'getPushVapidPublicKey',
      },
      500,
    );
  }
});

app.get('/push/status', async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: 'Cloudflare Access user required' }, 403);
  }

  const endpoint = (c.req.query('endpoint') || '').trim();

  try {
    const status = await getPushSubscriptionStatus(db, email, endpoint || undefined);
    return c.json(status);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: 'getPushSubscriptionStatus',
      },
      500,
    );
  }
});

app.post('/push/subscribe', async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: 'Cloudflare Access user required' }, 403);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const subscriptionRaw = body.subscription;
  const preferencesRaw = body.preferences;

  if (!subscriptionRaw || typeof subscriptionRaw !== 'object' || Array.isArray(subscriptionRaw)) {
    return c.json({ error: 'Invalid subscription payload' }, 400);
  }

  const subscriptionRecord = subscriptionRaw as Record<string, unknown>;
  const endpoint = typeof subscriptionRecord.endpoint === 'string' ? subscriptionRecord.endpoint.trim() : '';
  const keysRaw = subscriptionRecord.keys;
  const keysRecord = (keysRaw && typeof keysRaw === 'object' && !Array.isArray(keysRaw))
    ? keysRaw as Record<string, unknown>
    : null;
  const p256dh = typeof keysRecord?.p256dh === 'string' ? keysRecord.p256dh.trim() : '';
  const auth = typeof keysRecord?.auth === 'string' ? keysRecord.auth.trim() : '';

  if (!endpoint || !p256dh || !auth) {
    return c.json({ error: 'Subscription endpoint and keys are required' }, 400);
  }

  const preferencesRecord = (preferencesRaw && typeof preferencesRaw === 'object' && !Array.isArray(preferencesRaw))
    ? preferencesRaw as Record<string, unknown>
    : {};

  try {
    await upsertPushSubscription(
      db,
      email,
      {
        endpoint,
        keys: { p256dh, auth },
      },
      {
        notifyNewJobs: preferencesRecord.notifyNewJobs !== false,
        notifyNewMessages: preferencesRecord.notifyNewMessages !== false,
      },
    );

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: 'upsertPushSubscription',
      },
      500,
    );
  }
});

app.post('/push/unsubscribe', async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: 'Cloudflare Access user required' }, 403);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  if (!endpoint) return c.json({ success: true });

  try {
    await deactivatePushSubscription(db, email, endpoint);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : String(error),
        step: 'deactivatePushSubscription',
      },
      500,
    );
  }
});

app.post('/push/test', async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ error: 'Cloudflare Access user required' }, 403);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  if (!endpoint) {
    return c.json({ error: 'Endpoint is required' }, 400);
  }

  try {
    const result = await enqueueTestPushNotificationAndPing(db, email, endpoint);
    return c.json({ success: true, ...result });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }
});

app.get('/push/pending', async (c) => {
  const db = c.env.DB;
  const email = getAuthenticatedStaffEmail(c);
  if (!email) {
    return c.json({ notifications: [] }, 403);
  }

  const endpoint = (c.req.query('endpoint') || '').trim();
  if (!endpoint) {
    return c.json({ notifications: [] });
  }

  const limitRaw = Number.parseInt(c.req.query('limit') || '6', 10);

  let notifications: Awaited<ReturnType<typeof pullPendingPushNotifications>> = [];
  try {
    notifications = await pullPendingPushNotifications(
      db,
      email,
      endpoint,
      Number.isFinite(limitRaw) ? limitRaw : 6,
    );
  } catch (error) {
    return c.json(
      {
        notifications: [],
        error: error instanceof Error ? error.message : String(error),
        step: 'pullPendingPushNotifications',
      },
      500,
    );
  }

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  return c.json({ notifications });
});

app.get('/sms-settings', async (c) => {
  const db = c.env.DB;
  const config = await getTwilioConfig(db);
  const templates = await db.prepare('SELECT * FROM sms_templates ORDER BY event_type').all();

  const smsStats = await db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as sent,
       SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as received,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
       SUM(segments) as total_segments
     FROM sms_log`
  ).first<{ total: number; sent: number; received: number; failed: number; total_segments: number }>();

  return c.html(SmsSettingsPage({
    config: config ? { accountSid: config.accountSid, authToken: config.authToken, phoneNumber: config.phoneNumber, enabled: config.enabled } : null,
    templates: (templates.results || []) as { id: string; event_type: string; label: string; body_template: string; is_active: number }[],
    stats: smsStats || null,
  }));
});

app.post('/sms-settings', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();

  const config = {
    accountSid: (body.account_sid as string || '').trim(),
    authToken: (body.auth_token as string || '').trim(),
    phoneNumber: normalizePhoneE164(body.phone_number as string) || (body.phone_number as string || '').trim(),
    enabled: body.enabled === '1',
  };

  await db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('twilio_config', ?, datetime('now'))"
  ).bind(JSON.stringify(config)).run();

  return c.redirect('/admin/sms-settings');
});

app.post('/sms-templates/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();

  const bodyTemplate = (body.body_template as string || '').trim();
  const isActive = body.is_active === '1' ? 1 : 0;

  if (bodyTemplate) {
    await db.prepare(
      "UPDATE sms_templates SET body_template = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(bodyTemplate, isActive, id).run();
  } else {
    await db.prepare(
      "UPDATE sms_templates SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(isActive, id).run();
  }

  return c.body('', 200);
});

app.get('/coupons', async (c) => {
  const db = c.env.DB;
  const coupons = await db.prepare(`
    SELECT id, code, discount_type, discount_value, max_uses, current_uses, is_active
    FROM coupons ORDER BY created_at DESC
  `).all();
  
  return c.html(TableView({
    title: 'Coupons',
    columns: ['Code', 'Type', 'Value', 'Uses', 'Active'],
    rows: (coupons.results || []).map(cp => ({
      code: cp.code,
      type: cp.discount_type,
      value: cp.discount_type === 'percentage' ? `${cp.discount_value}%` : `$${((cp.discount_value as number) / 100).toFixed(2)}`,
      uses: `${cp.current_uses} / ${cp.max_uses ?? '∞'}`,
      active: cp.is_active ? 'active' : 'inactive'
    })),
    createUrl: '/admin/coupons/new',
    detailUrlPrefix: '/admin/coupons',
    deleteUrlPrefix: '/admin/coupons'
  }));
});

app.get('/coupons/new', (c) => {
  const fields: FormField[] = [
    { name: 'code', label: 'Code', required: true, placeholder: 'SUMMER20' },
    { name: 'discount_type', label: 'Discount Type', type: 'select', required: true, options: [
      { value: 'percentage', label: 'Percentage' },
      { value: 'fixed', label: 'Fixed Amount' }
    ]},
    { name: 'discount_value', label: 'Discount Value (% or $)', type: 'number', required: true, min: 0, step: 0.01 },
    { name: 'max_uses', label: 'Max Uses (leave empty for unlimited)', type: 'number', min: 1 },
    { name: 'valid_from', label: 'Valid From', type: 'date' },
    { name: 'valid_until', label: 'Valid Until', type: 'date' },
    { name: 'is_active', label: 'Active', type: 'checkbox', value: true }
  ];
  
  return c.html(FormView({
    title: 'Create Coupon',
    fields,
    submitUrl: '/admin/coupons',
    cancelUrl: '/admin/coupons'
  }));
});

app.post('/coupons', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, valid_from, valid_until, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    (body.code as string).toUpperCase(),
    body.discount_type,
    parseInt(body.discount_value as string, 10) || 0,
    body.max_uses ? parseInt(body.max_uses as string, 10) : null,
    body.valid_from || null,
    body.valid_until || null,
    body.is_active === 'on' ? 1 : 0
  ).run();
  
  return c.redirect('/admin/coupons');
});

app.get('/coupons/:id', async (c) => {
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/coupons/new');
  return c.redirect(`/admin/coupons/${id}/edit`);
});

app.get('/coupons/:id/edit', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const coupon = await db.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first();
  
  if (!coupon) {
    return c.redirect('/admin/coupons');
  }
  
  const fields: FormField[] = [
    { name: 'code', label: 'Code', required: true, value: coupon.code as string },
    { name: 'discount_type', label: 'Discount Type', type: 'select', required: true, value: coupon.discount_type as string, options: [
      { value: 'percentage', label: 'Percentage' },
      { value: 'fixed', label: 'Fixed Amount' }
    ]},
    { name: 'discount_value', label: 'Discount Value', type: 'number', required: true, min: 0, value: coupon.discount_value as number },
    { name: 'max_uses', label: 'Max Uses', type: 'number', min: 1, value: coupon.max_uses as number },
    { name: 'valid_from', label: 'Valid From', type: 'date', value: coupon.valid_from as string },
    { name: 'valid_until', label: 'Valid Until', type: 'date', value: coupon.valid_until as string },
    { name: 'is_active', label: 'Active', type: 'checkbox', value: Boolean(coupon.is_active) }
  ];
  
  return c.html(FormView({
    title: 'Edit Coupon',
    fields,
    submitUrl: `/admin/coupons/${id}`,
    cancelUrl: '/admin/coupons',
    isEdit: true,
    deleteUrl: `/admin/coupons/${id}/delete`
  }));
});

app.post('/coupons/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  
  await db.prepare(`
    UPDATE coupons 
    SET code = ?, discount_type = ?, discount_value = ?, max_uses = ?, valid_from = ?, valid_until = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    (body.code as string).toUpperCase(),
    body.discount_type,
    parseInt(body.discount_value as string, 10) || 0,
    body.max_uses ? parseInt(body.max_uses as string, 10) : null,
    body.valid_from || null,
    body.valid_until || null,
    body.is_active === 'on' ? 1 : 0,
    id
  ).run();
  
  return c.redirect('/admin/coupons');
});

app.post('/coupons/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/coupons/${id}`)) {
      c.header('HX-Redirect', '/admin/coupons');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/coupons');
});

app.get('/webhooks', async (c) => {
  const db = c.env.DB;
  const webhooks = await db.prepare(`
    SELECT id, url, event_type, is_active FROM webhooks ORDER BY created_at DESC
  `).all();
  
  return c.html(TableView({
    title: 'Webhooks',
    columns: ['URL', 'Event Type', 'Active'],
    rows: (webhooks.results || []).map(w => ({
      url: w.url,
      eventType: w.event_type,
      active: w.is_active ? 'active' : 'inactive'
    })),
    createUrl: '/admin/webhooks/new',
    detailUrlPrefix: '/admin/webhooks',
    deleteUrlPrefix: '/admin/webhooks'
  }));
});

app.get('/webhooks/new', (c) => {
  const fields: FormField[] = [
    { name: 'url', label: 'Webhook URL', required: true, placeholder: 'https://example.com/webhook' },
    { name: 'event_type', label: 'Event Type', type: 'select', required: true, options: [
      { value: 'job.created', label: 'Job Created' },
      { value: 'job.updated', label: 'Job Updated' },
      { value: 'job.assigned', label: 'Job Assigned' },
      { value: 'job.completed', label: 'Job Completed' },
      { value: 'job.cancelled', label: 'Job Cancelled' },
      { value: 'customer.created', label: 'Customer Created' },
      { value: 'invoice.created', label: 'Invoice Created' },
      { value: 'invoice.paid', label: 'Invoice Paid' }
    ]},
    { name: 'is_active', label: 'Active', type: 'checkbox', value: true }
  ];
  
  return c.html(FormView({
    title: 'Create Webhook',
    fields,
    submitUrl: '/admin/webhooks',
    cancelUrl: '/admin/webhooks'
  }));
});

app.post('/webhooks', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const id = generateId();
  const secret = crypto.randomUUID();
  
  await db.prepare(`
    INSERT INTO webhooks (id, url, event_type, secret, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    body.url,
    body.event_type,
    secret,
    body.is_active === 'on' ? 1 : 0
  ).run();
  
  return c.redirect('/admin/webhooks');
});

app.get('/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  if (id === 'new') return c.redirect('/admin/webhooks/new');
  return c.redirect(`/admin/webhooks/${id}/edit`);
});

app.get('/webhooks/:id/edit', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const webhook = await db.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
  
  if (!webhook) {
    return c.redirect('/admin/webhooks');
  }
  
  const fields: FormField[] = [
    { name: 'url', label: 'Webhook URL', required: true, value: webhook.url as string },
    { name: 'event_type', label: 'Event Type', type: 'select', required: true, value: webhook.event_type as string, options: [
      { value: 'job.created', label: 'Job Created' },
      { value: 'job.updated', label: 'Job Updated' },
      { value: 'job.assigned', label: 'Job Assigned' },
      { value: 'job.completed', label: 'Job Completed' },
      { value: 'job.cancelled', label: 'Job Cancelled' },
      { value: 'customer.created', label: 'Customer Created' },
      { value: 'invoice.created', label: 'Invoice Created' },
      { value: 'invoice.paid', label: 'Invoice Paid' }
    ]},
    { name: 'is_active', label: 'Active', type: 'checkbox', value: Boolean(webhook.is_active) }
  ];
  
  return c.html(FormView({
    title: 'Edit Webhook',
    fields,
    submitUrl: `/admin/webhooks/${id}`,
    cancelUrl: '/admin/webhooks',
    isEdit: true,
    deleteUrl: `/admin/webhooks/${id}/delete`
  }));
});

app.post('/webhooks/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  
  await db.prepare(`
    UPDATE webhooks 
    SET url = ?, event_type = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.url,
    body.event_type,
    body.is_active === 'on' ? 1 : 0,
    id
  ).run();
  
  return c.redirect('/admin/webhooks');
});

app.post('/webhooks/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db.prepare('DELETE FROM webhooks WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/webhooks/${id}`)) {
      c.header('HX-Redirect', '/admin/webhooks');
    }
    return c.body('', 200);
  }

  return c.redirect('/admin/webhooks');
});

app.get('/inbox', async (c) => {
  const db = c.env.DB;
  const { source } = c.req.query();

  let sql = 'SELECT id, source, status, first_name, last_name, email, subject, is_read, created_at FROM messages';
  const params: unknown[] = [];

  if (source) {
    sql += ' WHERE source = ?';
    params.push(source);
  }

  sql += ' ORDER BY created_at DESC LIMIT 100';

  const stmt = db.prepare(sql);
  const messages = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

  const unreadCount = await db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_read = 0').first<{ count: number }>();

  const rows = (messages.results || []).map((m: Record<string, unknown>) => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || (m.email as string) || '-';
    const dateStr = formatTorontoDate(`${m.created_at as string}Z`, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || (m.created_at as string);
    return {
      from: m.is_read ? name : `● ${name}`,
      subject: (m.subject as string) || '-',
      source: m.source as string,
      date: dateStr,
      status: m.status as string,
    };
  });

  const title = `Inbox${(unreadCount?.count || 0) > 0 ? ` (${unreadCount?.count})` : ''}`;

  return c.html(TableView({
    title,
    columns: ['From', 'Subject', 'Source', 'Date', 'Status'],
    rows,
    rawIds: (messages.results || []).map(m => m.id as string),
    detailUrlPrefix: '/admin/inbox',
    deleteUrlPrefix: '/admin/inbox',
  }));
});

async function getInboxSmsContext(db: D1Database, messageId: string) {
  const msg = await db.prepare('SELECT phone FROM messages WHERE id = ?').bind(messageId).first<{ phone: string | null }>();
  const phoneE164 = normalizePhoneE164(msg?.phone);

  let smsHistory: SmsLogRow[] = [];
  if (phoneE164) {
    const rows = await db.prepare(
      `SELECT id, direction, body, status, created_at, segments
       FROM sms_log
       WHERE phone_to = ? OR phone_from = ?
       ORDER BY created_at ASC
       LIMIT 100`
    ).bind(phoneE164, phoneE164).all();
    smsHistory = (rows.results || []) as SmsLogRow[];
  }

  return { phoneE164, smsHistory };
}

async function getInboxJobContext(db: D1Database, messageId: string): Promise<{ jobOptions: InboxJobOption[]; selectedJobId: string | null }> {
  const msg = await db.prepare('SELECT phone, metadata FROM messages WHERE id = ?').bind(messageId).first<{ phone: string | null; metadata: string | null }>();
  if (!msg) return { jobOptions: [], selectedJobId: null };

  const meta = parseJsonObject(msg.metadata);
  const metaCustomerId = typeof meta?.customer_id === 'string' && meta.customer_id ? meta.customer_id : null;
  const metaJobId = typeof meta?.job_id === 'string' && meta.job_id ? meta.job_id : null;

  const phoneE164 = normalizePhoneE164(msg.phone);
  let customerId = metaCustomerId;
  if (!customerId && phoneE164) {
    const customer = await db.prepare(
      `SELECT id
       FROM customers
       WHERE phone_e164 = ? OR phone = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    ).bind(phoneE164, msg.phone || phoneE164).first<{ id: string }>();
    customerId = customer?.id || null;
  }

  if (!customerId) {
    return { jobOptions: [], selectedJobId: null };
  }

  const jobs = await db.prepare(
    `SELECT j.id, j.scheduled_date, j.status,
            COALESCE(s.name, j.custom_service_name, 'Service') as service_name
     FROM jobs j
     LEFT JOIN services s ON s.id = j.service_id
     WHERE j.customer_id = ?
     ORDER BY j.updated_at DESC
     LIMIT 20`
  ).bind(customerId).all<{ id: string; scheduled_date: string; status: string; service_name: string }>();

  const jobOptions = (jobs.results || []).map((job) => ({
    id: job.id,
    label: `${job.scheduled_date} • ${job.service_name} • ${job.status.replace('_', ' ')}`,
  }));

  const selectedJobId = jobOptions.some((job) => job.id === metaJobId)
    ? metaJobId
    : (jobOptions[0]?.id || null);

  return { jobOptions, selectedJobId };
}

app.get('/inbox/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const msg = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();

  if (!msg) return c.redirect('/admin/inbox');

  if (!msg.is_read) {
    await db.prepare("UPDATE messages SET is_read = 1, read_at = datetime('now'), status = CASE WHEN status = 'new' THEN 'read' ELSE status END, updated_at = datetime('now') WHERE id = ?").bind(id).run();
    msg.is_read = 1;
    if (msg.status === 'new') msg.status = 'read';
  }

  const twilioEnabled = await isTwilioEnabled(db);
  const { phoneE164, smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);

  return c.html(MessageDetailPage({
    message: msg as {
      id: string; source: string; status: string;
      first_name: string | null; last_name: string | null; email: string | null;
      phone: string | null; postal_code: string | null; reason: string | null;
      subject: string | null; body: string | null; metadata: string | null;
      is_read: number; read_at: string | null; replied_at: string | null;
      created_at: string; updated_at: string;
    },
    smsHistory,
    twilioEnabled,
    phoneE164,
    jobOptions,
    selectedJobId,
    completedTaskSmsIds,
  }));
});

app.get('/inbox/:id/sms-thread', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  return c.html(SmsHistoryList({
    smsHistory,
    messageId: id,
    canCreateTask: jobOptions.length > 0,
    jobOptions,
    selectedJobId,
    completedTaskSmsIds,
  }));
});

app.get('/inbox/:id/sms-thread-panel', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  const twilioEnabled = await isTwilioEnabled(db);
  const { phoneE164, smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');

  return c.html(SmsThreadPanel({
    messageId: id,
    smsHistory,
    twilioEnabled,
    phoneE164,
    jobOptions,
    selectedJobId,
    completedTaskSmsIds,
  }));
});

app.post('/inbox/:id/sms-reply', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const smsBody = (body.sms_body as string || '').trim();

  const { phoneE164 } = await getInboxSmsContext(db, id);

  let sendResult: { success: boolean; error?: string } | null = null;

  if (!smsBody) {
    sendResult = { success: false, error: 'Message body is required' };
  } else if (!phoneE164) {
    sendResult = { success: false, error: 'No valid phone number for this contact' };
  } else {
    const result = await sendDirectSms({ db, to: phoneE164, body: smsBody, messageId: id });
    sendResult = { success: result.success, error: result.error };

    if (result.success) {
      await db.prepare(
        "UPDATE messages SET status = 'replied', replied_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(id).run();
    }
  }

  const twilioEnabled = await isTwilioEnabled(db);
  const { smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, selectedJobId);

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  return c.html(SmsThreadPanel({ messageId: id, smsHistory, twilioEnabled, phoneE164, jobOptions, selectedJobId, completedTaskSmsIds, sendResult }));
});

app.post('/inbox/:id/sms-task', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.parseBody();
  const smsLogId = (body.sms_log_id as string || '').trim();
  const jobId = (body.job_id as string || '').trim();
  const taskTitle = toTaskTitle(body.task_title as string || '');

  const twilioEnabled = await isTwilioEnabled(db);
  const { phoneE164, smsHistory } = await getInboxSmsContext(db, id);
  const { jobOptions, selectedJobId } = await getInboxJobContext(db, id);

  let taskResult: { success: boolean; error?: string; message?: string } = { success: false, error: 'Unable to add task' };

  if (!smsLogId) {
    taskResult = { success: false, error: 'No SMS message selected' };
  } else if (!taskTitle) {
    taskResult = { success: false, error: 'Task title is required' };
  } else if (!jobId) {
    taskResult = { success: false, error: 'Select a job first' };
  } else {
    const sms = await db.prepare(
      `SELECT id, direction, body, created_at, phone_to, phone_from
       FROM sms_log
       WHERE id = ?
       LIMIT 1`
    ).bind(smsLogId).first<{ id: string; direction: string; body: string; created_at: string; phone_to: string; phone_from: string }>();

    const job = await db.prepare('SELECT notes_json FROM jobs WHERE id = ?').bind(jobId).first<{ notes_json: string | null }>();

    if (!sms) {
      taskResult = { success: false, error: 'SMS message not found' };
    } else if (!job) {
      taskResult = { success: false, error: 'Job not found' };
    } else if (phoneE164 && sms.phone_to !== phoneE164 && sms.phone_from !== phoneE164) {
      taskResult = { success: false, error: 'Selected SMS is not part of this thread' };
    } else if (sms.direction !== 'inbound') {
      taskResult = { success: false, error: 'Only customer messages can become tasks' };
    } else {
      const smsBody = (sms.body || '').trim();
      if (!smsBody) {
        taskResult = { success: false, error: 'Selected message has no text' };
      } else {
        const notes = job.notes_json ? JSON.parse(job.notes_json) as Array<Record<string, unknown>> : [];
        notes.push({
          text: taskTitle,
          timestamp: new Date().toISOString(),
          completed: 0,
          source: {
            type: 'sms',
            sms_log_id: sms.id,
            message_id: id,
            excerpt: smsBody,
            received_at: sms.created_at,
          },
        });

        await db.prepare(
          'UPDATE jobs SET notes_json = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(JSON.stringify(notes), jobId).run();

        const messageMetaRow = await db.prepare('SELECT metadata FROM messages WHERE id = ?').bind(id).first<{ metadata: string | null }>();
        const messageMeta = parseJsonObject(messageMetaRow?.metadata) || {};
        messageMeta.job_id = jobId;
        await db.prepare('UPDATE messages SET metadata = ?, updated_at = datetime("now") WHERE id = ?').bind(JSON.stringify(messageMeta), id).run();

        taskResult = { success: true, message: 'Task added to job' };
      }
    }
  }

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  const activeJobId = jobOptions.some((job) => job.id === jobId) ? jobId : selectedJobId;
  const completedTaskSmsIds = await getCompletedSmsTaskIds(db, activeJobId);
  return c.html(
    SmsThreadPanel({
      messageId: id,
      smsHistory,
      twilioEnabled,
      phoneE164,
      jobOptions,
      selectedJobId: jobId || selectedJobId,
      completedTaskSmsIds,
      taskResult,
    })
  );
});

app.post('/inbox/:id/archive', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  await db.prepare("UPDATE messages SET status = 'archived', updated_at = datetime('now') WHERE id = ?").bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    c.header('HX-Redirect', '/admin/inbox');
    return c.body('', 200);
  }
  return c.redirect('/admin/inbox');
});

app.post('/inbox/:id/delete', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();

  const isHtmx = Boolean(c.req.header('HX-Request'));
  if (isHtmx) {
    const from = c.req.header('HX-Current-URL') || '';
    if (from.includes(`/inbox/${id}`)) {
      c.header('HX-Redirect', '/admin/inbox');
    }
    return c.body('', 200);
  }
  return c.redirect('/admin/inbox');
});

export default app;
