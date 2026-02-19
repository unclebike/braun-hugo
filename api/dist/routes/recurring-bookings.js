import { Hono } from 'hono';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const recurring = await c.env.DB.prepare('SELECT * FROM recurring_bookings ORDER BY created_at DESC').all();
        return c.json({ recurring_bookings: recurring.results || [] });
    }
    catch (error) {
        console.error('recurring list error', error);
        return c.json({ error: 'Failed to list recurring bookings' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const recurring = await c.env.DB.prepare('SELECT * FROM recurring_bookings WHERE id = ?').bind(c.req.param('id')).first();
        if (!recurring)
            return c.json({ error: 'Not found' }, 404);
        return c.json(recurring);
    }
    catch (error) {
        console.error('recurring get error', error);
        return c.json({ error: 'Failed to get recurring booking' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`INSERT INTO recurring_bookings
       (id, customer_id, service_id, territory_id, frequency, day_of_week, scheduled_start_time,
        duration_minutes, base_price_cents, total_price_cents, is_active, next_scheduled_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).bind(id, body.customer_id, body.service_id, body.territory_id, body.frequency, body.day_of_week ?? null, body.scheduled_start_time || null, body.duration_minutes || 60, body.base_price_cents || 0, body.total_price_cents || body.base_price_cents || 0, body.is_active === false ? 0 : 1, body.next_scheduled_date || null).run();
        const created = await c.env.DB.prepare('SELECT * FROM recurring_bookings WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('recurring create error', error);
        return c.json({ error: 'Failed to create recurring booking' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        const allowed = [
            'customer_id',
            'service_id',
            'territory_id',
            'frequency',
            'day_of_week',
            'scheduled_start_time',
            'duration_minutes',
            'base_price_cents',
            'total_price_cents',
            'is_active',
            'next_scheduled_date',
        ];
        for (const key of allowed) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(key === 'is_active' ? (body[key] ? 1 : 0) : body[key]);
            }
        }
        if (fields.length === 0)
            return c.json({ error: 'No fields to update' }, 400);
        fields.push("updated_at = datetime('now')");
        values.push(id);
        await c.env.DB.prepare(`UPDATE recurring_bookings SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        const updated = await c.env.DB.prepare('SELECT * FROM recurring_bookings WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('recurring patch error', error);
        return c.json({ error: 'Failed to update recurring booking' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        await c.env.DB.prepare('DELETE FROM recurring_bookings WHERE id = ?').bind(c.req.param('id')).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('recurring delete error', error);
        return c.json({ error: 'Failed to delete recurring booking' }, 500);
    }
});
export default app;
//# sourceMappingURL=recurring-bookings.js.map