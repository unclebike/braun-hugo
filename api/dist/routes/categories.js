import { Hono } from 'hono';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const categories = await c.env.DB.prepare('SELECT * FROM service_categories ORDER BY sort_order, name').all();
        return c.json({ categories: categories.results || [] });
    }
    catch (error) {
        console.error('categories list error', error);
        return c.json({ error: 'Failed to list categories' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const category = await c.env.DB.prepare('SELECT * FROM service_categories WHERE id = ?').bind(c.req.param('id')).first();
        if (!category)
            return c.json({ error: 'Not found' }, 404);
        return c.json(category);
    }
    catch (error) {
        console.error('categories get error', error);
        return c.json({ error: 'Failed to get category' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`INSERT INTO service_categories (id, name, sort_order, created_at)
       VALUES (?, ?, ?, datetime('now'))`).bind(id, body.name, body.sort_order || 0).run();
        const created = await c.env.DB.prepare('SELECT * FROM service_categories WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('categories create error', error);
        return c.json({ error: 'Failed to create category' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        if (body.name !== undefined) {
            fields.push('name = ?');
            values.push(body.name);
        }
        if (body.sort_order !== undefined) {
            fields.push('sort_order = ?');
            values.push(body.sort_order);
        }
        if (fields.length === 0)
            return c.json({ error: 'No fields to update' }, 400);
        values.push(id);
        await c.env.DB.prepare(`UPDATE service_categories SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        const updated = await c.env.DB.prepare('SELECT * FROM service_categories WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('categories patch error', error);
        return c.json({ error: 'Failed to update category' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await c.env.DB.prepare('UPDATE services SET category_id = NULL WHERE category_id = ?').bind(id).run();
        await c.env.DB.prepare('DELETE FROM service_categories WHERE id = ?').bind(id).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('categories delete error', error);
        return c.json({ error: 'Failed to delete category' }, 500);
    }
});
export default app;
//# sourceMappingURL=categories.js.map