import { Hono } from 'hono';
import { buildServiceBaseLine, parsePriceLines, subtotalFromLines } from '../utils/line-items';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string' && value) return [value];
  return [];
};

const maybeAutoCreateInvoice = async (db: D1Database, jobId: string): Promise<void> => {
  const job = await db.prepare('SELECT customer_id, total_price_cents, line_items_json FROM jobs WHERE id = ?').bind(jobId).first<{ customer_id: string; total_price_cents: number; line_items_json: string | null }>();
  if (!job) return;
  const existing = await db.prepare('SELECT id FROM invoices WHERE job_id = ?').bind(jobId).first();
  if (existing) return;

  const lastInvoice = await db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1")
    .first<{ invoice_number: string | null }>();
  const lastNumber = lastInvoice?.invoice_number
    ? Number.parseInt(lastInvoice.invoice_number.replace('INV-', ''), 10)
    : 0;
  const invoiceNumber = `INV-${String((Number.isFinite(lastNumber) ? lastNumber : 0) + 1).padStart(6, '0')}`;

  const storedLines = parsePriceLines(job.line_items_json);
  const effectiveLines = storedLines.length > 0 ? storedLines : [buildServiceBaseLine('Service', job.total_price_cents)];
  const subtotal = subtotalFromLines(effectiveLines);

  const due = new Date();
  due.setDate(due.getDate() + 14);
  await db.prepare(
    `INSERT INTO invoices (id, invoice_number, job_id, customer_id, currency, amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents, line_items_json, due_date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'CAD', ?, ?, 0, 0, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    invoiceNumber,
    jobId,
    job.customer_id,
    subtotal,
    subtotal,
    subtotal,
    JSON.stringify(effectiveLines),
    due.toISOString().split('T')[0],
  ).run();
};

app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const status = c.req.query('status');
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (status) {
      clauses.push('j.status = ?');
      params.push(status);
    }

    const jobs = await (params.length
      ? db.prepare(
          `SELECT j.*, c.first_name || ' ' || c.last_name as customer_name, s.name as service_name
           FROM jobs j
           JOIN customers c ON c.id = j.customer_id
           LEFT JOIN services s ON s.id = j.service_id
           ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
           ORDER BY j.scheduled_date DESC, j.scheduled_start_time DESC`
        ).bind(...params).all()
      : db.prepare(
          `SELECT j.*, c.first_name || ' ' || c.last_name as customer_name, s.name as service_name
           FROM jobs j
           JOIN customers c ON c.id = j.customer_id
           LEFT JOIN services s ON s.id = j.service_id
           ORDER BY j.scheduled_date DESC, j.scheduled_start_time DESC`
        ).all());

    const ids = (jobs.results || []).map((j) => j.id as string);
    if (ids.length === 0) return c.json({ jobs: [] });

    const [providers, notes] = await Promise.all([
      db.prepare(
        `SELECT jp.job_id, tm.id, tm.first_name, tm.last_name
         FROM job_providers jp
         JOIN team_members tm ON tm.id = jp.team_member_id
         WHERE jp.job_id IN (${ids.map(() => '?').join(', ')})`
      ).bind(...ids).all(),
      db.prepare(
        `SELECT id, job_id, content, created_at
         FROM job_notes
         WHERE job_id IN (${ids.map(() => '?').join(', ')})
         ORDER BY created_at DESC`
      ).bind(...ids).all(),
    ]);

    const providersByJob = new Map<string, unknown[]>();
    for (const row of providers.results || []) {
      const key = row.job_id as string;
      const list = providersByJob.get(key) || [];
      list.push({ id: row.id, first_name: row.first_name, last_name: row.last_name });
      providersByJob.set(key, list);
    }

    const notesByJob = new Map<string, unknown[]>();
    for (const row of notes.results || []) {
      const key = row.job_id as string;
      const list = notesByJob.get(key) || [];
      list.push(row);
      notesByJob.set(key, list);
    }

    return c.json({
      jobs: (jobs.results || []).map((row) => ({
        ...row,
        job_providers: providersByJob.get(row.id as string) || [],
        job_notes: notesByJob.get(row.id as string) || [],
      })),
    });
  } catch (error) {
    console.error('jobs list error', error);
    return c.json({ error: 'Failed to list jobs' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
    if (!job) return c.json({ error: 'Not found' }, 404);

    const [providers, notes] = await Promise.all([
      db.prepare(
        `SELECT tm.id, tm.first_name, tm.last_name
         FROM job_providers jp
         JOIN team_members tm ON tm.id = jp.team_member_id
         WHERE jp.job_id = ?`
      ).bind(id).all(),
      db.prepare('SELECT id, content, created_at FROM job_notes WHERE job_id = ? ORDER BY created_at DESC').bind(id).all(),
    ]);

    return c.json({ ...job, job_providers: providers.results || [], job_notes: notes.results || [] });
  } catch (error) {
    console.error('jobs get error', error);
    return c.json({ error: 'Failed to get job' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json<Record<string, unknown>>();
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO jobs
       (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
        duration_minutes, base_price_cents, total_price_cents, line_items_json, custom_service_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.customer_id,
      body.service_id || null,
      body.territory_id || null,
      body.customer_address_id || null,
      body.scheduled_date,
      body.scheduled_start_time,
      body.duration_minutes || 60,
      body.base_price_cents || 0,
      body.total_price_cents || body.base_price_cents || 0,
      JSON.stringify([buildServiceBaseLine(String(body.custom_service_name || 'Service'), Number(body.total_price_cents || body.base_price_cents || 0))]),
      body.custom_service_name || null,
      body.status || 'created'
    ).run();

    for (const providerId of asStringArray(body.provider_ids)) {
      await db.prepare('INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)').bind(id, providerId).run();
    }

    for (const note of asStringArray(body.notes)) {
      await db.prepare('INSERT INTO job_notes (id, job_id, content, created_at) VALUES (?, ?, ?, datetime(\'now\'))').bind(crypto.randomUUID(), id, note).run();
    }

    if (body.status === 'complete') {
      await maybeAutoCreateInvoice(db, id);
    }

    const created = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error('jobs create error', error);
    return c.json({ error: 'Failed to create job' }, 500);
  }
});

app.patch('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>();
    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = [
      'customer_id',
      'service_id',
      'territory_id',
      'customer_address_id',
      'scheduled_date',
      'scheduled_start_time',
      'duration_minutes',
      'base_price_cents',
      'total_price_cents',
      'custom_service_name',
      'status',
      'assigned_at',
      'started_at',
      'completed_at',
      'cancelled_at',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (body.total_price_cents !== undefined || body.custom_service_name !== undefined) {
      const current = await db.prepare('SELECT total_price_cents, custom_service_name, line_items_json FROM jobs WHERE id = ?').bind(id).first<{
        total_price_cents: number;
        custom_service_name: string | null;
        line_items_json: string | null;
      }>();
      if (current) {
        const customLines = parsePriceLines(current.line_items_json).filter((line) => line.is_custom === 1);
        const total = body.total_price_cents !== undefined ? Number(body.total_price_cents || 0) : Number(current.total_price_cents || 0);
        const serviceName = body.custom_service_name !== undefined
          ? String(body.custom_service_name || 'Service')
          : (current.custom_service_name || 'Service');
        fields.push('line_items_json = ?');
        values.push(JSON.stringify([buildServiceBaseLine(serviceName, total), ...customLines]));
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    if (body.provider_ids !== undefined) {
      await db.prepare('DELETE FROM job_providers WHERE job_id = ?').bind(id).run();
      for (const providerId of asStringArray(body.provider_ids)) {
        await db.prepare('INSERT INTO job_providers (job_id, team_member_id) VALUES (?, ?)').bind(id, providerId).run();
      }
    }

    if (body.note !== undefined && typeof body.note === 'string' && body.note.trim()) {
      await db.prepare('INSERT INTO job_notes (id, job_id, content, created_at) VALUES (?, ?, ?, datetime(\'now\'))').bind(crypto.randomUUID(), id, body.note).run();
    }

    if (body.status === 'complete') {
      await maybeAutoCreateInvoice(db, id);
    }

    const updated = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  } catch (error) {
    console.error('jobs patch error', error);
    return c.json({ error: 'Failed to update job' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = c.env.DB;
    await db.prepare('DELETE FROM job_notes WHERE job_id = ?').bind(id).run();
    await db.prepare('DELETE FROM job_providers WHERE job_id = ?').bind(id).run();
    await db.prepare('DELETE FROM invoices WHERE job_id = ?').bind(id).run();
    await db.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error('jobs delete error', error);
    return c.json({ error: 'Failed to delete job' }, 500);
  }
});

export default app;
