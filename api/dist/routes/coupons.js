import { Hono } from 'hono';
const app = new Hono();
app.get('/validate', async (c) => {
    try {
        const db = c.env.DB;
        const code = (c.req.query('code') || '').toUpperCase();
        const subtotalCents = Number(c.req.query('subtotal_cents') || 0);
        if (!code)
            return c.json({ valid: false, message: 'Coupon code is required' }, 400);
        const coupon = await db.prepare(`SELECT * FROM coupons
       WHERE code = ?
         AND is_active = 1
         AND (valid_from IS NULL OR valid_from <= date('now'))
         AND (valid_until IS NULL OR valid_until >= date('now'))`).bind(code).first();
        if (!coupon)
            return c.json({ valid: false, message: 'Invalid or expired coupon' }, 404);
        if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
            return c.json({ valid: false, message: 'Coupon usage limit reached' }, 400);
        }
        const discount = coupon.discount_type === 'percentage'
            ? Math.round(subtotalCents * (coupon.discount_value / 100))
            : Math.round(coupon.discount_value);
        return c.json({
            valid: true,
            coupon,
            discount_cents: Math.max(0, discount),
            total_cents: Math.max(0, subtotalCents - discount),
        });
    }
    catch (error) {
        console.error('coupon validate error', error);
        return c.json({ error: 'Failed to validate coupon' }, 500);
    }
});
app.get('/', async (c) => {
    try {
        const coupons = await c.env.DB.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
        return c.json({ coupons: coupons.results || [] });
    }
    catch (error) {
        console.error('coupons list error', error);
        return c.json({ error: 'Failed to list coupons' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const coupon = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(c.req.param('id')).first();
        if (!coupon)
            return c.json({ error: 'Not found' }, 404);
        return c.json(coupon);
    }
    catch (error) {
        console.error('coupons get error', error);
        return c.json({ error: 'Failed to get coupon' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`INSERT INTO coupons
       (id, code, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, datetime('now'), datetime('now'))`).bind(id, String(body.code || '').toUpperCase(), body.discount_type || 'percentage', body.discount_value || 0, body.max_uses ?? null, body.valid_from || null, body.valid_until || null, body.is_active === false ? 0 : 1).run();
        const created = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('coupons create error', error);
        return c.json({ error: 'Failed to create coupon' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        for (const key of ['code', 'discount_type', 'discount_value', 'max_uses', 'current_uses', 'valid_from', 'valid_until', 'is_active']) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'code')
                    values.push(String(body[key]).toUpperCase());
                else if (key === 'is_active')
                    values.push(body[key] ? 1 : 0);
                else
                    values.push(body[key]);
            }
        }
        if (fields.length === 0)
            return c.json({ error: 'No fields to update' }, 400);
        fields.push("updated_at = datetime('now')");
        values.push(id);
        await c.env.DB.prepare(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        const updated = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('coupons patch error', error);
        return c.json({ error: 'Failed to update coupon' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        await c.env.DB.prepare('DELETE FROM coupons WHERE id = ?').bind(c.req.param('id')).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('coupons delete error', error);
        return c.json({ error: 'Failed to delete coupon' }, 500);
    }
});
export default app;
//# sourceMappingURL=coupons.js.map