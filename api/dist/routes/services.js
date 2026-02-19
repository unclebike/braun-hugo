import { Hono } from 'hono';
const app = new Hono();
const asArray = (value) => {
    if (Array.isArray(value))
        return value.map((v) => String(v));
    if (typeof value === 'string' && value)
        return [value];
    return [];
};
app.get('/', async (c) => {
    try {
        const db = c.env.DB;
        const territoryId = c.req.query('territory_id');
        const active = c.req.query('active');
        let sql = `SELECT s.*, sc.name as category_name
               FROM services s
               LEFT JOIN service_categories sc ON sc.id = s.category_id`;
        const clauses = [];
        const params = [];
        if (territoryId) {
            sql += ' JOIN territory_services ts ON ts.service_id = s.id';
            clauses.push('ts.territory_id = ?');
            params.push(territoryId);
        }
        if (active !== undefined) {
            clauses.push('s.is_active = ?');
            params.push(active === 'true' ? 1 : 0);
        }
        if (clauses.length)
            sql += ` WHERE ${clauses.join(' AND ')}`;
        sql += ' ORDER BY s.name';
        const servicesRes = await (params.length ? db.prepare(sql).bind(...params) : db.prepare(sql)).all();
        const serviceIds = (servicesRes.results || []).map((row) => row.id);
        if (serviceIds.length === 0)
            return c.json({ services: [] });
        const placeholders = serviceIds.map(() => '?').join(', ');
        const [modifiersRes, skillsRes] = await Promise.all([
            db.prepare(`SELECT * FROM service_modifiers WHERE service_id IN (${placeholders}) ORDER BY sort_order, name`).bind(...serviceIds).all(),
            db.prepare(`SELECT srs.service_id, sk.id, sk.name, sk.description
         FROM service_required_skills srs
         JOIN skills sk ON sk.id = srs.skill_id
         WHERE srs.service_id IN (${placeholders})`).bind(...serviceIds).all(),
        ]);
        const modifiersByService = new Map();
        for (const row of modifiersRes.results || []) {
            const key = row.service_id;
            const list = modifiersByService.get(key) || [];
            list.push(row);
            modifiersByService.set(key, list);
        }
        const skillsByService = new Map();
        for (const row of skillsRes.results || []) {
            const key = row.service_id;
            const list = skillsByService.get(key) || [];
            list.push({ id: row.id, name: row.name, description: row.description });
            skillsByService.set(key, list);
        }
        return c.json({
            services: (servicesRes.results || []).map((row) => ({
                ...row,
                modifiers: modifiersByService.get(row.id) || [],
                required_skills: skillsByService.get(row.id) || [],
            })),
        });
    }
    catch (error) {
        console.error('services list error', error);
        return c.json({ error: 'Failed to list services' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const db = c.env.DB;
        const id = c.req.param('id');
        const service = await db.prepare(`SELECT s.*, sc.name as category_name
       FROM services s
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.id = ?`).bind(id).first();
        if (!service)
            return c.json({ error: 'Not found' }, 404);
        const [modifiers, skills] = await Promise.all([
            db.prepare('SELECT * FROM service_modifiers WHERE service_id = ? ORDER BY sort_order, name').bind(id).all(),
            db.prepare(`SELECT sk.id, sk.name, sk.description
         FROM service_required_skills srs
         JOIN skills sk ON sk.id = srs.skill_id
         WHERE srs.service_id = ?`).bind(id).all(),
        ]);
        return c.json({
            ...service,
            modifiers: modifiers.results || [],
            required_skills: skills.results || [],
        });
    }
    catch (error) {
        console.error('services get error', error);
        return c.json({ error: 'Failed to get service' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const db = c.env.DB;
        const body = await c.req.json();
        const id = crypto.randomUUID();
        const skillIds = asArray(body.required_skill_ids);
        await db.prepare(`INSERT INTO services
       (id, name, description, category_id, base_price_cents, base_duration_minutes, required_provider_count, auto_assign_enabled, auto_assign_method, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).bind(id, body.name, body.description || null, body.category_id || null, body.base_price_cents || 0, body.base_duration_minutes || 60, body.required_provider_count || 1, body.auto_assign_enabled ? 1 : 0, body.auto_assign_method || 'balanced', body.is_active === false ? 0 : 1).run();
        for (const skillId of skillIds) {
            await db.prepare('INSERT INTO service_required_skills (service_id, skill_id) VALUES (?, ?)').bind(id, skillId).run();
        }
        const created = await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('services create error', error);
        return c.json({ error: 'Failed to create service' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const db = c.env.DB;
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        const allowed = [
            'name',
            'description',
            'category_id',
            'base_price_cents',
            'base_duration_minutes',
            'required_provider_count',
            'auto_assign_enabled',
            'auto_assign_method',
            'is_active',
        ];
        for (const key of allowed) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                if (key === 'auto_assign_enabled' || key === 'is_active') {
                    values.push(body[key] ? 1 : 0);
                }
                else {
                    values.push(body[key]);
                }
            }
        }
        if (fields.length > 0) {
            fields.push("updated_at = datetime('now')");
            values.push(id);
            await db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        }
        if (body.required_skill_ids !== undefined) {
            await db.prepare('DELETE FROM service_required_skills WHERE service_id = ?').bind(id).run();
            for (const skillId of asArray(body.required_skill_ids)) {
                await db.prepare('INSERT INTO service_required_skills (service_id, skill_id) VALUES (?, ?)').bind(id, skillId).run();
            }
        }
        const updated = await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('services patch error', error);
        return c.json({ error: 'Failed to update service' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        const db = c.env.DB;
        const id = c.req.param('id');
        await db.prepare('DELETE FROM service_required_skills WHERE service_id = ?').bind(id).run();
        await db.prepare('DELETE FROM service_modifiers WHERE service_id = ?').bind(id).run();
        await db.prepare('DELETE FROM territory_services WHERE service_id = ?').bind(id).run();
        await db.prepare('DELETE FROM services WHERE id = ?').bind(id).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('services delete error', error);
        return c.json({ error: 'Failed to delete service' }, 500);
    }
});
export default app;
//# sourceMappingURL=services.js.map