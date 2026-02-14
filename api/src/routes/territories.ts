import { Hono } from 'hono';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const asArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string' && value) return [value];
  return [];
};

app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const active = c.req.query('active');
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (active !== undefined) {
      clauses.push('t.is_active = ?');
      params.push(active === 'true' ? 1 : 0);
    }

    const sql = `SELECT * FROM territories t ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY t.name`;
    const territories = await (params.length ? c.env.DB.prepare(sql).bind(...params) : c.env.DB.prepare(sql)).all();

    const ids = (territories.results || []).map((row) => row.id as string);
    if (ids.length === 0) return c.json({ territories: [] });

    const placeholders = ids.map(() => '?').join(', ');
    const [serviceRows, providerRows] = await Promise.all([
      db.prepare(
        `SELECT ts.territory_id, s.id as service_id, s.name
         FROM territory_services ts
         JOIN services s ON s.id = ts.service_id
         WHERE ts.territory_id IN (${placeholders})`
      ).bind(...ids).all<{ territory_id: string; service_id: string; name: string }>(),
      db.prepare(
        `SELECT tmt.territory_id, tm.id as team_member_id, tm.first_name, tm.last_name
         FROM team_member_territories tmt
         JOIN team_members tm ON tm.id = tmt.team_member_id
         WHERE tmt.territory_id IN (${placeholders})`
      ).bind(...ids).all<{ territory_id: string; team_member_id: string; first_name: string; last_name: string }>(),
    ]);

    const servicesByTerritory = new Map<string, Array<Record<string, unknown>>>();
    for (const row of serviceRows.results || []) {
      const list = servicesByTerritory.get(row.territory_id) || [];
      list.push({ id: row.service_id, name: row.name });
      servicesByTerritory.set(row.territory_id, list);
    }

    const providersByTerritory = new Map<string, Array<Record<string, unknown>>>();
    for (const row of providerRows.results || []) {
      const list = providersByTerritory.get(row.territory_id) || [];
      list.push({ id: row.team_member_id, first_name: row.first_name, last_name: row.last_name });
      providersByTerritory.set(row.territory_id, list);
    }

    return c.json({
      territories: (territories.results || []).map((row) => ({
        ...row,
        territory_services: servicesByTerritory.get(row.id as string) || [],
        team_member_territories: providersByTerritory.get(row.id as string) || [],
      })),
    });
  } catch (error) {
    console.error('territories list error', error);
    return c.json({ error: 'Failed to list territories' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    const territory = await db.prepare('SELECT * FROM territories WHERE id = ?').bind(id).first();
    if (!territory) return c.json({ error: 'Not found' }, 404);

    const [services, providers] = await Promise.all([
      db.prepare(
        `SELECT s.id, s.name
         FROM territory_services ts
         JOIN services s ON s.id = ts.service_id
         WHERE ts.territory_id = ?`
      ).bind(id).all(),
      db.prepare(
        `SELECT tm.id, tm.first_name, tm.last_name
         FROM team_member_territories tmt
         JOIN team_members tm ON tm.id = tmt.team_member_id
         WHERE tmt.territory_id = ?`
      ).bind(id).all(),
    ]);

    return c.json({
      ...territory,
      territory_services: services.results || [],
      team_member_territories: providers.results || [],
    });
  } catch (error) {
    console.error('territories get error', error);
    return c.json({ error: 'Failed to get territory' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json<Record<string, unknown>>();
    const id = crypto.randomUUID();
    const serviceIds = asArray(body.service_ids);
    const providerIds = asArray(body.provider_ids);

    await db.prepare(
      `INSERT INTO territories
       (id, name, timezone, service_area_type, service_area_data, operating_hours, scheduling_policy, max_concurrent_jobs, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      body.name,
      body.timezone || 'America/Toronto',
      body.service_area_type || 'zip',
      body.service_area_data || '{}',
      body.operating_hours || '{}',
      body.scheduling_policy || 'provider_based',
      body.max_concurrent_jobs ?? null,
      body.is_active === false ? 0 : 1
    ).run();

    for (const serviceId of serviceIds) {
      await db.prepare('INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)').bind(id, serviceId).run();
    }
    for (const providerId of providerIds) {
      await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(providerId, id).run();
    }

    const created = await db.prepare('SELECT * FROM territories WHERE id = ?').bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error('territories create error', error);
    return c.json({ error: 'Failed to create territory' }, 500);
  }
});

app.patch('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>();
    const fields: string[] = [];
    const values: unknown[] = [];

    const updatable = [
      'name',
      'timezone',
      'service_area_type',
      'service_area_data',
      'operating_hours',
      'scheduling_policy',
      'max_concurrent_jobs',
      'is_active',
    ];

    for (const key of updatable) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_active' ? (body[key] ? 1 : 0) : body[key]);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await db.prepare(`UPDATE territories SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    }

    if (body.service_ids !== undefined) {
      await db.prepare('DELETE FROM territory_services WHERE territory_id = ?').bind(id).run();
      for (const serviceId of asArray(body.service_ids)) {
        await db.prepare('INSERT INTO territory_services (territory_id, service_id) VALUES (?, ?)').bind(id, serviceId).run();
      }
    }

    if (body.provider_ids !== undefined) {
      await db.prepare('DELETE FROM team_member_territories WHERE territory_id = ?').bind(id).run();
      for (const providerId of asArray(body.provider_ids)) {
        await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(providerId, id).run();
      }
    }

    const updated = await db.prepare('SELECT * FROM territories WHERE id = ?').bind(id).first();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  } catch (error) {
    console.error('territories patch error', error);
    return c.json({ error: 'Failed to update territory' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param('id');
    await db.prepare('DELETE FROM territory_services WHERE territory_id = ?').bind(id).run();
    await db.prepare('DELETE FROM team_member_territories WHERE territory_id = ?').bind(id).run();
    await db.prepare('DELETE FROM territories WHERE id = ?').bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error('territories delete error', error);
    return c.json({ error: 'Failed to delete territory' }, 500);
  }
});

export default app;
