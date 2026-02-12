import { Hono } from 'hono';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.get('/', async (c) => {
  try {
    const webhooks = await c.env.DB.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
    return c.json({ webhooks: webhooks.results || [] });
  } catch (error) {
    console.error('webhooks list error', error);
    return c.json({ error: 'Failed to list webhooks' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const webhook = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(c.req.param('id')).first();
    if (!webhook) return c.json({ error: 'Not found' }, 404);
    return c.json(webhook);
  } catch (error) {
    console.error('webhooks get error', error);
    return c.json({ error: 'Failed to get webhook' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO webhooks (id, url, event_type, secret, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.url,
      body.event_type,
      body.secret || crypto.randomUUID(),
      body.is_active === false ? 0 : 1
    ).run();
    const created = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error('webhooks create error', error);
    return c.json({ error: 'Failed to create webhook' }, 500);
  }
});

app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>();
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of ['url', 'event_type', 'secret', 'is_active']) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_active' ? (body[key] ? 1 : 0) : body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await c.env.DB.prepare(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  } catch (error) {
    console.error('webhooks patch error', error);
    return c.json({ error: 'Failed to update webhook' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM webhooks WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error('webhooks delete error', error);
    return c.json({ error: 'Failed to delete webhook' }, 500);
  }
});

export default app;
