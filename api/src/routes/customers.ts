import { Hono } from 'hono';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const asArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value.filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object'));
  return [];
};

app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const customers = await db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
    const ids = (customers.results || []).map((cst) => cst.id as string);
    if (ids.length === 0) return c.json({ customers: [] });

    const addressRows = await db.prepare(
      `SELECT * FROM customer_addresses
       WHERE customer_id IN (${ids.map(() => '?').join(', ')})
       ORDER BY is_default DESC, created_at DESC`
    ).bind(...ids).all();

    const addressesByCustomer = new Map<string, unknown[]>();
    for (const row of addressRows.results || []) {
      const key = row.customer_id as string;
      const list = addressesByCustomer.get(key) || [];
      list.push(row);
      addressesByCustomer.set(key, list);
    }

    return c.json({
      customers: (customers.results || []).map((row) => ({
        ...row,
        customer_addresses: addressesByCustomer.get(row.id as string) || [],
      })),
    });
  } catch (error) {
    console.error('customers list error', error);
    return c.json({ error: 'Failed to list customers' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
    if (!customer) return c.json({ error: 'Not found' }, 404);
    const addresses = await db.prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC').bind(id).all();
    return c.json({ ...customer, customer_addresses: addresses.results || [] });
  } catch (error) {
    console.error('customers get error', error);
    return c.json({ error: 'Failed to get customer' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json<Record<string, unknown>>();
    const id = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(id, body.first_name, body.last_name, body.email || null, body.phone || null).run();

    for (const address of asArray(body.customer_addresses)) {
      await db.prepare(
        `INSERT INTO customer_addresses
         (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        crypto.randomUUID(),
        id,
        address.line_1,
        address.line_2 || null,
        address.city,
        address.state,
        address.postal_code,
        address.lat ?? null,
        address.lng ?? null,
        address.is_default ? 1 : 0
      ).run();
    }

    const created = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error('customers create error', error);
    return c.json({ error: 'Failed to create customer' }, 500);
  }
});

app.patch('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>();
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of ['first_name', 'last_name', 'email', 'phone']) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    if (body.customer_addresses !== undefined) {
      await db.prepare('DELETE FROM customer_addresses WHERE customer_id = ?').bind(id).run();
      for (const address of asArray(body.customer_addresses)) {
        await db.prepare(
          `INSERT INTO customer_addresses
           (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          crypto.randomUUID(),
          id,
          address.line_1,
          address.line_2 || null,
          address.city,
          address.state,
          address.postal_code,
          address.lat ?? null,
          address.lng ?? null,
          address.is_default ? 1 : 0
        ).run();
      }
    }

    const updated = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  } catch (error) {
    console.error('customers patch error', error);
    return c.json({ error: 'Failed to update customer' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    await db.prepare('DELETE FROM customer_addresses WHERE customer_id = ?').bind(id).run();
    await db.prepare('DELETE FROM customers WHERE id = ?').bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error('customers delete error', error);
    return c.json({ error: 'Failed to delete customer' }, 500);
  }
});

export default app;
