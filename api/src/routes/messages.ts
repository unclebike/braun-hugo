import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const contactSchema = z.object({
  source: z.literal('contact'),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  postal_code: z.string().min(1),
  reason: z.enum(['bike fitting', 'repair', 'inquiry', 'other']),
  body: z.string().min(1),
});

const newsletterSchema = z.object({
  source: z.literal('newsletter'),
  email: z.string().email(),
});

const registrationSchema = z.object({
  source: z.literal('registration'),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  postal_code: z.string().min(1),
  metadata: z.object({
    street_address: z.string().optional(),
    apt_suite: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    company: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
});

const messageSchema = z.discriminatedUnion('source', [
  contactSchema,
  newsletterSchema,
  registrationSchema,
]);

app.post('/submit', zValidator('json', messageSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid('json');
  const id = crypto.randomUUID();

  const subject = data.source === 'contact'
    ? `${data.reason.charAt(0).toUpperCase() + data.reason.slice(1)} — ${data.first_name} ${data.last_name}`
    : data.source === 'newsletter'
      ? 'Newsletter Signup'
      : `Registration — ${data.first_name} ${data.last_name}`;

  await db.prepare(`
    INSERT INTO messages (id, source, first_name, last_name, email, phone, postal_code, reason, subject, body, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.source,
    'first_name' in data ? data.first_name : null,
    'last_name' in data ? data.last_name : null,
    data.email,
    'phone' in data ? data.phone : null,
    'postal_code' in data ? data.postal_code : null,
    'reason' in data ? data.reason : null,
    subject,
    'body' in data ? data.body : null,
    'metadata' in data && data.metadata ? JSON.stringify(data.metadata) : null,
  ).run();

  return c.json({ id, message: 'Message received' }, 201);
});

app.get('/', async (c) => {
  const db = c.env.DB;
  const { source, status, cursor, limit = '50' } = c.req.query();

  let sql = 'SELECT * FROM messages WHERE 1=1';
  const params: unknown[] = [];

  if (source) {
    sql += ' AND source = ?';
    params.push(source);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (cursor) {
    sql += ' AND created_at < ?';
    params.push(cursor);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const stmt = db.prepare(sql);
  const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

  return c.json({
    messages: result.results,
    next_cursor: result.results.length > 0
      ? (result.results[result.results.length - 1] as { created_at: string }).created_at
      : null,
  });
});

app.get('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const msg = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  if (!msg) return c.json({ error: 'Not found' }, 404);
  return c.json(msg);
});

app.patch('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json<{ status?: string; is_read?: boolean }>();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.status) {
    fields.push('status = ?');
    values.push(body.status);
    if (body.status === 'replied') {
      fields.push('replied_at = datetime(\'now\')');
    }
  }
  if (body.is_read !== undefined) {
    fields.push('is_read = ?');
    values.push(body.is_read ? 1 : 0);
    if (body.is_read) {
      fields.push('read_at = datetime(\'now\')');
      if (!body.status) {
        fields.push('status = ?');
        values.push('read');
      }
    }
  }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  const updated = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  await db.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  return c.json({ deleted: true });
});

export default app;
