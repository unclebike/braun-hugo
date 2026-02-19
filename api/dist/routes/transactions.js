import { Hono } from 'hono';
const app = new Hono();
app.get('/', async (c) => {
    try {
        const transactions = await c.env.DB.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all();
        return c.json({ transactions: transactions.results || [] });
    }
    catch (error) {
        console.error('transactions list error', error);
        return c.json({ error: 'Failed to list transactions' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const transaction = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(c.req.param('id')).first();
        if (!transaction)
            return c.json({ error: 'Not found' }, 404);
        return c.json(transaction);
    }
    catch (error) {
        console.error('transactions get error', error);
        return c.json({ error: 'Failed to get transaction' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`INSERT INTO transactions
       (id, invoice_id, customer_id, amount_cents, type, payment_method, reference, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`).bind(id, body.invoice_id || null, body.customer_id || null, body.amount_cents || 0, body.type || 'charge', body.payment_method || null, body.reference || null).run();
        const created = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('transactions create error', error);
        return c.json({ error: 'Failed to create transaction' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        for (const key of ['invoice_id', 'customer_id', 'amount_cents', 'type', 'payment_method', 'reference']) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(body[key]);
            }
        }
        if (fields.length === 0)
            return c.json({ error: 'No fields to update' }, 400);
        values.push(id);
        await c.env.DB.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        const updated = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('transactions patch error', error);
        return c.json({ error: 'Failed to update transaction' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        await c.env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(c.req.param('id')).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('transactions delete error', error);
        return c.json({ error: 'Failed to delete transaction' }, 500);
    }
});
export default app;
//# sourceMappingURL=transactions.js.map