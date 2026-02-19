import { Hono } from 'hono';
const app = new Hono();
const asStringArray = (value) => {
    if (Array.isArray(value))
        return value.map((v) => String(v));
    if (typeof value === 'string' && value)
        return [value];
    return [];
};
const asObjectArray = (value) => {
    if (Array.isArray(value))
        return value.filter((v) => Boolean(v && typeof v === 'object'));
    return [];
};
app.get('/', async (c) => {
    try {
        const db = c.env.DB;
        const team = await db.prepare('SELECT * FROM team_members ORDER BY last_name, first_name').all();
        const ids = (team.results || []).map((m) => m.id);
        if (ids.length === 0)
            return c.json({ team_members: [] });
        const placeholders = ids.map(() => '?').join(', ');
        const [hoursRes, skillsRes, territoriesRes] = await Promise.all([
            db.prepare(`SELECT * FROM provider_weekly_hours WHERE team_member_id IN (${placeholders}) ORDER BY day_of_week`).bind(...ids).all(),
            db.prepare(`SELECT tms.team_member_id, sk.id, sk.name
         FROM team_member_skills tms
         JOIN skills sk ON sk.id = tms.skill_id
         WHERE tms.team_member_id IN (${placeholders})`).bind(...ids).all(),
            db.prepare(`SELECT tmt.team_member_id, t.id, t.name
         FROM team_member_territories tmt
         JOIN territories t ON t.id = tmt.territory_id
         WHERE tmt.team_member_id IN (${placeholders})`).bind(...ids).all(),
        ]);
        const byMember = (rows, key) => {
            const map = new Map();
            for (const row of rows) {
                const id = String(row[key]);
                const list = map.get(id) || [];
                list.push(row);
                map.set(id, list);
            }
            return map;
        };
        const hoursMap = byMember(hoursRes.results || [], 'team_member_id');
        const skillsMap = byMember(skillsRes.results || [], 'team_member_id');
        const territoriesMap = byMember(territoriesRes.results || [], 'team_member_id');
        return c.json({
            team_members: (team.results || []).map((member) => ({
                ...member,
                provider_weekly_hours: hoursMap.get(member.id) || [],
                skills: (skillsMap.get(member.id) || []).map((row) => ({ id: row.id, name: row.name })),
                territories: (territoriesMap.get(member.id) || []).map((row) => ({ id: row.id, name: row.name })),
            })),
        });
    }
    catch (error) {
        console.error('team list error', error);
        return c.json({ error: 'Failed to list team members' }, 500);
    }
});
app.get('/:id', async (c) => {
    try {
        const db = c.env.DB;
        const id = c.req.param('id');
        const member = await db.prepare('SELECT * FROM team_members WHERE id = ?').bind(id).first();
        if (!member)
            return c.json({ error: 'Not found' }, 404);
        const [hours, skills, territories] = await Promise.all([
            db.prepare('SELECT * FROM provider_weekly_hours WHERE team_member_id = ? ORDER BY day_of_week').bind(id).all(),
            db.prepare(`SELECT sk.id, sk.name
         FROM team_member_skills tms
         JOIN skills sk ON sk.id = tms.skill_id
         WHERE tms.team_member_id = ?`).bind(id).all(),
            db.prepare(`SELECT t.id, t.name
         FROM team_member_territories tmt
         JOIN territories t ON t.id = tmt.territory_id
         WHERE tmt.team_member_id = ?`).bind(id).all(),
        ]);
        return c.json({
            ...member,
            provider_weekly_hours: hours.results || [],
            skills: skills.results || [],
            territories: territories.results || [],
        });
    }
    catch (error) {
        console.error('team get error', error);
        return c.json({ error: 'Failed to get team member' }, 500);
    }
});
app.post('/', async (c) => {
    try {
        const db = c.env.DB;
        const body = await c.req.json();
        const id = crypto.randomUUID();
        await db.prepare(`INSERT INTO team_members
       (id, first_name, last_name, email, phone, role, is_active, can_be_auto_assigned, can_edit_availability, auto_assign_priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).bind(id, body.first_name, body.last_name, body.email, body.phone || null, body.role || 'provider', body.is_active === false ? 0 : 1, body.can_be_auto_assigned === false ? 0 : 1, body.can_edit_availability ? 1 : 0, body.auto_assign_priority || 100).run();
        for (const skillId of asStringArray(body.skill_ids)) {
            await db.prepare('INSERT INTO team_member_skills (team_member_id, skill_id) VALUES (?, ?)').bind(id, skillId).run();
        }
        for (const territoryId of asStringArray(body.territory_ids)) {
            await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(id, territoryId).run();
        }
        for (const hour of asObjectArray(body.provider_weekly_hours)) {
            await db.prepare(`INSERT INTO provider_weekly_hours (id, team_member_id, day_of_week, start_time, end_time)
         VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), id, hour.day_of_week, hour.start_time, hour.end_time).run();
        }
        const created = await db.prepare('SELECT * FROM team_members WHERE id = ?').bind(id).first();
        return c.json(created, 201);
    }
    catch (error) {
        console.error('team create error', error);
        return c.json({ error: 'Failed to create team member' }, 500);
    }
});
app.patch('/:id', async (c) => {
    try {
        const db = c.env.DB;
        const id = c.req.param('id');
        const body = await c.req.json();
        const fields = [];
        const values = [];
        const updatable = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'role',
            'is_active',
            'can_be_auto_assigned',
            'can_edit_availability',
            'auto_assign_priority',
        ];
        for (const key of updatable) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                if (['is_active', 'can_be_auto_assigned', 'can_edit_availability'].includes(key)) {
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
            await db.prepare(`UPDATE team_members SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
        }
        if (body.skill_ids !== undefined) {
            await db.prepare('DELETE FROM team_member_skills WHERE team_member_id = ?').bind(id).run();
            for (const skillId of asStringArray(body.skill_ids)) {
                await db.prepare('INSERT INTO team_member_skills (team_member_id, skill_id) VALUES (?, ?)').bind(id, skillId).run();
            }
        }
        if (body.territory_ids !== undefined) {
            await db.prepare('DELETE FROM team_member_territories WHERE team_member_id = ?').bind(id).run();
            for (const territoryId of asStringArray(body.territory_ids)) {
                await db.prepare('INSERT INTO team_member_territories (team_member_id, territory_id) VALUES (?, ?)').bind(id, territoryId).run();
            }
        }
        if (body.provider_weekly_hours !== undefined) {
            await db.prepare('DELETE FROM provider_weekly_hours WHERE team_member_id = ?').bind(id).run();
            for (const hour of asObjectArray(body.provider_weekly_hours)) {
                await db.prepare(`INSERT INTO provider_weekly_hours (id, team_member_id, day_of_week, start_time, end_time)
           VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), id, hour.day_of_week, hour.start_time, hour.end_time).run();
            }
        }
        const updated = await db.prepare('SELECT * FROM team_members WHERE id = ?').bind(id).first();
        if (!updated)
            return c.json({ error: 'Not found' }, 404);
        return c.json(updated);
    }
    catch (error) {
        console.error('team patch error', error);
        return c.json({ error: 'Failed to update team member' }, 500);
    }
});
app.delete('/:id', async (c) => {
    try {
        const db = c.env.DB;
        const id = c.req.param('id');
        await db.prepare('DELETE FROM provider_weekly_hours WHERE team_member_id = ?').bind(id).run();
        await db.prepare('DELETE FROM provider_date_overrides WHERE team_member_id = ?').bind(id).run();
        await db.prepare('DELETE FROM team_member_skills WHERE team_member_id = ?').bind(id).run();
        await db.prepare('DELETE FROM team_member_territories WHERE team_member_id = ?').bind(id).run();
        await db.prepare('DELETE FROM team_members WHERE id = ?').bind(id).run();
        return c.json({ deleted: true });
    }
    catch (error) {
        console.error('team delete error', error);
        return c.json({ error: 'Failed to delete team member' }, 500);
    }
});
export default app;
//# sourceMappingURL=team.js.map