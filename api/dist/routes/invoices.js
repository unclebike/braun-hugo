import { Hono } from 'hono';
const app = new Hono();
const parseMoneyToCents = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(0, Math.round(value));
    if (typeof value !== 'string')
        return 0;
    const cleaned = value.trim().replace(/[$,]/g, '');
    if (!cleaned)
        return 0;
    const parsed = Number.parseFloat(cleaned);
    if (!Number.isFinite(parsed))
        return 0;
    return Math.max(0, Math.round(parsed * 100));
};
const parseCentsInt = (value) => {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(0, Math.round(value));
    if (typeof value !== 'string')
        return 0;
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed))
        return 0;
    return Math.max(0, parsed);
};
const parseLineItems = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((entry) => Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)))
        .map((entry) => {
        const description = typeof entry.description === 'string' && entry.description.trim()
            ? entry.description.trim()
            : 'Line item';
        const quantity = typeof entry.quantity === 'number' ? entry.quantity : Number.parseFloat(String(entry.quantity || 0));
        const unitPriceCents = typeof entry.unit_price_cents === 'number'
            ? Math.max(0, Math.round(entry.unit_price_cents))
            : parseCentsInt(entry.unit_price_cents);
        const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        return {
            description,
            quantity: safeQty,
            unit_price_cents: unitPriceCents,
            total_cents: Math.round(safeQty * unitPriceCents),
        };
    });
};
const nextInvoiceNumber = async (db) => {
    const row = await db.prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1")
        .first();
    const suffix = row?.invoice_number ? Number.parseInt(row.invoice_number.replace('INV-', ''), 10) : 0;
    const next = Number.isFinite(suffix) ? suffix + 1 : 1;
    return `INV-${String(next).padStart(6, '0')}`;
};
app.get('/', async (c) => {
    try {
        const invoices = await c.env.DB.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all();
        return c.json({ invoices: invoices.results || [] });
    }
    catch (error) {
        console.error('invoices list error', error);
        return c.json({ error: 'Failed to list invoices' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const invoice = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(c.req.param('id')).first();
        if (!invoice)
            return c.json({ error: 'Not found' }, 404);
        return c.json(invoice);
    }
    catch (error) {
        console.error('invoices get error', error);
        return c.json({ error: 'Failed to get invoice' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const id = crypto.randomUUID();
        if (typeof body.customer_id !== 'string' || !body.customer_id.trim()) {
            return c.json({ error: 'customer_id is required' }, 400);
        }
        const lineItems = parseLineItems(body.line_items);
        const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
        const taxCents = body.tax_cents !== undefined ? parseCentsInt(body.tax_cents) : parseMoneyToCents(body.tax_amount);
        const discountCents = body.discount_cents !== undefined ? parseCentsInt(body.discount_cents) : parseMoneyToCents(body.discount_amount);
        const bodyTotalCents = body.total_cents !== undefined
            ? parseCentsInt(body.total_cents)
            : (body.amount_cents !== undefined ? parseCentsInt(body.amount_cents) : 0);
        const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
        const totalCents = bodyTotalCents > 0 ? bodyTotalCents : computedTotalCents;
        const status = typeof body.status === 'string' ? body.status : 'pending';
        const paidAt = status === 'paid'
            ? (typeof body.paid_at === 'string' && body.paid_at ? body.paid_at : new Date().toISOString())
            : null;
        await c.env.DB.prepare(`INSERT INTO invoices (
         id, invoice_number, job_id, customer_id, currency,
         amount_cents, subtotal_cents, tax_cents, discount_cents, total_cents,
         line_items_json, due_date, status, paid_at, sent_at, notes,
         external_provider, external_reference, external_sync_status,
         created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).bind(id, (typeof body.invoice_number === 'string' && body.invoice_number.trim()) ? body.invoice_number.trim() : await nextInvoiceNumber(c.env.DB), body.job_id || null, body.customer_id, (typeof body.currency === 'string' && body.currency.trim()) ? body.currency.trim().toUpperCase() : 'CAD', totalCents, subtotalCents, taxCents, discountCents, totalCents, JSON.stringify(lineItems), body.due_date || null, status, paidAt, status === 'sent' ? new Date().toISOString() : null, (typeof body.notes === 'string' && body.notes.trim()) ? body.notes.trim() : null, (typeof body.external_provider === 'string' && body.external_provider.trim()) ? body.external_provider.trim() : null, (typeof body.external_reference === 'string' && body.external_reference.trim()) ? body.external_reference.trim() : null, (typeof body.external_sync_status === 'string' && body.external_sync_status.trim()) ? body.external_sync_status.trim() : 'local_only').run();
        const created = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('invoices create error', error);
        return c.json({ error: 'Failed to create invoice' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const existing = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
        if (!existing)
            return c.json({ error: 'Not found' }, 404);
        const mergedCustomerId = typeof body.customer_id === 'string' ? body.customer_id : String(existing.customer_id || '');
        if (!mergedCustomerId)
            return c.json({ error: 'customer_id is required' }, 400);
        let existingLineItemsRaw = [];
        try {
            existingLineItemsRaw = JSON.parse(String(existing.line_items_json || '[]'));
        }
        catch {
            existingLineItemsRaw = [];
        }
        const lineItems = body.line_items !== undefined
            ? parseLineItems(body.line_items)
            : parseLineItems(existingLineItemsRaw);
        const subtotalCents = lineItems.reduce((sum, item) => sum + item.total_cents, 0);
        const taxCents = body.tax_cents !== undefined
            ? parseCentsInt(body.tax_cents)
            : (body.tax_amount !== undefined ? parseMoneyToCents(body.tax_amount) : parseCentsInt(existing.tax_cents));
        const discountCents = body.discount_cents !== undefined
            ? parseCentsInt(body.discount_cents)
            : (body.discount_amount !== undefined ? parseMoneyToCents(body.discount_amount) : parseCentsInt(existing.discount_cents));
        const bodyTotalCents = body.total_cents !== undefined
            ? parseCentsInt(body.total_cents)
            : (body.amount_cents !== undefined ? parseCentsInt(body.amount_cents) : 0);
        const computedTotalCents = Math.max(0, subtotalCents + taxCents - discountCents);
        const totalCents = bodyTotalCents > 0 ? bodyTotalCents : computedTotalCents;
        const status = typeof body.status === 'string' ? body.status : String(existing.status || 'pending');
        const paidAt = status === 'paid'
            ? (typeof body.paid_at === 'string' && body.paid_at ? body.paid_at : String(existing.paid_at || new Date().toISOString()))
            : null;
        const sentAt = status === 'sent'
            ? String(existing.sent_at || new Date().toISOString())
            : null;
        await c.env.DB.prepare(`UPDATE invoices
       SET invoice_number = ?,
           job_id = ?,
           customer_id = ?,
           currency = ?,
           amount_cents = ?,
           subtotal_cents = ?,
           tax_cents = ?,
           discount_cents = ?,
           total_cents = ?,
           line_items_json = ?,
           due_date = ?,
           status = ?,
           paid_at = ?,
           sent_at = ?,
           notes = ?,
           external_provider = ?,
           external_reference = ?,
           external_sync_status = ?,
           updated_at = datetime('now')
       WHERE id = ?`).bind((typeof body.invoice_number === 'string' && body.invoice_number.trim()) ? body.invoice_number.trim() : String(existing.invoice_number || await nextInvoiceNumber(c.env.DB)), body.job_id !== undefined ? (body.job_id || null) : (existing.job_id || null), mergedCustomerId, (typeof body.currency === 'string' && body.currency.trim()) ? body.currency.trim().toUpperCase() : String(existing.currency || 'CAD'), totalCents, subtotalCents, taxCents, discountCents, totalCents, JSON.stringify(lineItems), body.due_date !== undefined ? (body.due_date || null) : (existing.due_date || null), status, paidAt, sentAt, body.notes !== undefined ? (body.notes || null) : (existing.notes || null), body.external_provider !== undefined ? (body.external_provider || null) : (existing.external_provider || null), body.external_reference !== undefined ? (body.external_reference || null) : (existing.external_reference || null), body.external_sync_status !== undefined ? (body.external_sync_status || 'local_only') : (existing.external_sync_status || 'local_only'), id).run();
        const updated = await c.env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
        return c.json(updated);
    }
    catch (error) {
        console.error('invoices patch error', error);
        return c.json({ error: 'Failed to update invoice' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        await c.env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(c.req.param('id')).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('invoices delete error', error);
        return c.json({ error: 'Failed to delete invoice' }, 500);
    }
});
export default app;
//# sourceMappingURL=invoices.js.map