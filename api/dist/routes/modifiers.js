import { Hono } from 'hono';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const serviceId = c.req.query('service_id');
        const sql = serviceId
            ? 'SELECT * FROM service_modifiers WHERE service_id = ? ORDER BY sort_order, name'
            : 'SELECT * FROM service_modifiers ORDER BY created_at DESC';
        const result = serviceId
            ? await c.env.DB.prepare(sql).bind(serviceId).all()
            : await c.env.DB.prepare(sql).all();
        return c.json({ modifiers: result.results || [] });
    }
    catch (error) {
        console.error('modifiers list error', error);
        return c.json({ error: 'Failed to list modifiers' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const modifier = await c.env.DB.prepare('SELECT * FROM service_modifiers WHERE id = ?').bind(c.req.param('id')).first();
        if (!modifier)
            return c.json({ error: 'Not found' }, 404);
        return c.json(modifier);
    }
    catch (error) {
        console.error('modifiers get error', error);
        return c.json({ error: 'Failed to get modifier' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`INSERT INTO service_modifiers
       (id, service_id, name, description, price_adjustment_cents, duration_adjustment_minutes, is_required, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).bind(id, body.service_id, body.name, body.description || null, body.price_adjustment_cents || 0, body.duration_adjustment_minutes || 0, body.is_required ? 1 : 0, body.sort_order || 0).run();
        const created = await c.env.DB.prepare('SELECT * FROM service_modifiers WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('modifiers create error', error);
        return c.json({ error: 'Failed to create modifier' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        const allowed = [
            'service_id',
            'name',
            'description',
            'price_adjustment_cents',
            'duration_adjustment_minutes',
            'is_required',
            'sort_order',
        ];
        for (const key of allowed) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(key === 'is_required' ? (body[key] ? 1 : 0) : body[key]);
            }
        }
        if (fields.length === 0)
            return c.json({ error: 'No fields to update' }, 400);
        values.push(id);
        await c.env.DB.prepare(`UPDATE service_modifiers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        const updated = await c.env.DB.prepare('SELECT * FROM service_modifiers WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('modifiers patch error', error);
        return c.json({ error: 'Failed to update modifier' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        await c.env.DB.prepare('DELETE FROM service_modifiers WHERE id = ?').bind(c.req.param('id')).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('modifiers delete error', error);
        return c.json({ error: 'Failed to delete modifier' }, 500);
    }
});
export default app;
//# sourceMappingURL=modifiers.js.map