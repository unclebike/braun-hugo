import { Hono } from 'hono';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.get('/', async (c) => {
  try {
    const invoices = await c.env.DB.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all();
    return c.json({ invoices: invoices.results || [] });
  } catch (error) {
    console.error('invoices list error', error);
    return c.json({ error: 'Failed to list invoices' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const invoice = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(c.req.param('id')).first();
    if (!invoice) return c.json({ error: 'Not found' }, 404);
    return c.json(invoice);
  } catch (error) {
    console.error('invoices get error', error);
    return c.json({ error: 'Failed to get invoice' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO invoices (id, job_id, customer_id, amount_cents, due_date, status, paid_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.job_id || null,
      body.customer_id,
      body.amount_cents || 0,
      body.due_date || null,
      body.status || 'pending',
      body.paid_at || null
    ).run();
    const created = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error('invoices create error', error);
    return c.json({ error: 'Failed to create invoice' }, 500);
  }
});

app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>();
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of ['job_id', 'customer_id', 'amount_cents', 'due_date', 'status', 'paid_at']) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await c.env.DB.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  } catch (error) {
    console.error('invoices patch error', error);
    return c.json({ error: 'Failed to update invoice' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error('invoices delete error', error);
    return c.json({ error: 'Failed to delete invoice' }, 500);
  }
});

export default app;
