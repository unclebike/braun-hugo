import { Hono } from 'hono';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.get('/', async (c) => {
  try {
    const skills = await c.env.DB.prepare('SELECT * FROM skills ORDER BY name').all();
    return c.json({ skills: skills.results || [] });
  } catch (error) {
    console.error('skills list error', error);
    return c.json({ error: 'Failed to list skills' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const skill = await c.env.DB.prepare('SELECT * FROM skills WHERE id = ?').bind(c.req.param('id')).first();
    if (!skill) return c.json({ error: 'Not found' }, 404);
    return c.json(skill);
  } catch (error) {
    console.error('skills get error', error);
    return c.json({ error: 'Failed to get skill' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO skills (id, name, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(id, body.name, body.description || null).run();
    const created = await c.env.DB.prepare('SELECT * FROM skills WHERE id = ?').bind(id).first();
    return c.json(created, 201);
  } catch (error) {
    console.error('skills create error', error);
    return c.json({ error: 'Failed to create skill' }, 500);
  }
});

app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<Record<string, unknown>>();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) {
      fields.push('name = ?');
      values.push(body.name);
    }
    if (body.description !== undefined) {
      fields.push('description = ?');
      values.push(body.description);
    }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare('SELECT * FROM skills WHERE id = ?').bind(id).first();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  } catch (error) {
    console.error('skills patch error', error);
    return c.json({ error: 'Failed to update skill' }, 500);
  }
});

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM service_required_skills WHERE skill_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM team_member_skills WHERE skill_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM skills WHERE id = ?').bind(id).run();
    return c.json({ deleted: true });
  } catch (error) {
    console.error('skills delete error', error);
    return c.json({ error: 'Failed to delete skill' }, 500);
  }
});

export default app;
