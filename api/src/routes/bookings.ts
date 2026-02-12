import { Hono } from 'hono';
import { checkServiceArea } from '../geo/service-area';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string' && value) return [value];
  return [];
};

type TerritoryRow = {
  id: string;
  service_area_type: string;
  service_area_data: string;
};

app.post('/create', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json<Record<string, unknown>>();

    let territoryId = typeof body.territory_id === 'string' ? body.territory_id : '';
    if (!territoryId) {
      const territories = await db.prepare(
        'SELECT id, service_area_type, service_area_data FROM territories WHERE is_active = 1'
      ).all<TerritoryRow>();

      for (const territory of territories.results || []) {
        const result = checkServiceArea(
          territory.service_area_type,
          territory.service_area_data,
          {
            postalCode: typeof body.postal_code === 'string' ? body.postal_code : undefined,
            lat: typeof body.lat === 'number' ? body.lat : undefined,
            lng: typeof body.lng === 'number' ? body.lng : undefined,
          }
        );
        if (result.within) {
          territoryId = territory.id;
          break;
        }
      }
    }

    if (!territoryId) {
      return c.json({ error: 'Address is outside of service area' }, 400);
    }

    const serviceId = String(body.service_id || '');
    const service = await db.prepare(
      `SELECT s.id, s.name, s.base_price_cents, s.base_duration_minutes
       FROM services s
       JOIN territory_services ts ON ts.service_id = s.id
       WHERE s.id = ? AND ts.territory_id = ? AND s.is_active = 1`
    ).bind(serviceId, territoryId).first<{ id: string; name: string; base_price_cents: number; base_duration_minutes: number }>();

    if (!service) {
      return c.json({ error: 'Service unavailable for selected territory' }, 400);
    }

    let customer = null as null | { id: string };
    if (typeof body.email === 'string' && body.email.trim()) {
      customer = await db.prepare('SELECT id FROM customers WHERE email = ?').bind(body.email.trim()).first<{ id: string }>();
    }
    if (!customer && typeof body.phone === 'string' && body.phone.trim()) {
      customer = await db.prepare('SELECT id FROM customers WHERE phone = ? ORDER BY created_at DESC LIMIT 1').bind(body.phone.trim()).first<{ id: string }>();
    }

    let customerId = customer?.id;
    if (!customerId) {
      customerId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO customers (id, first_name, last_name, email, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        customerId,
        body.first_name,
        body.last_name,
        body.email || null,
        body.phone || null
      ).run();
    }

    const addressId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO customer_addresses
       (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      addressId,
      customerId,
      body.address_line1,
      body.address_line2 || null,
      body.city,
      body.province,
      body.postal_code,
      body.lat ?? null,
      body.lng ?? null,
      1
    ).run();

    const selectedModifierIds = asStringArray(body.selected_modifiers);
    let totalPrice = Number(service.base_price_cents || 0);
    let totalDuration = Number(body.duration_minutes || service.base_duration_minutes || 60);

    if (selectedModifierIds.length > 0) {
      const modifierRows = await db.prepare(
        `SELECT id, price_adjustment_cents, duration_adjustment_minutes
         FROM service_modifiers
         WHERE service_id = ?
           AND id IN (${selectedModifierIds.map(() => '?').join(', ')})`
      ).bind(serviceId, ...selectedModifierIds).all<{ id: string; price_adjustment_cents: number; duration_adjustment_minutes: number }>();

      for (const modifier of modifierRows.results || []) {
        totalPrice += Number(modifier.price_adjustment_cents || 0);
        totalDuration += Number(modifier.duration_adjustment_minutes || 0);
      }
    }

    const jobId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO jobs
       (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
        duration_minutes, base_price_cents, total_price_cents, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', datetime('now'), datetime('now'))`
    ).bind(
      jobId,
      customerId,
      serviceId,
      territoryId,
      addressId,
      body.scheduled_date,
      body.scheduled_start_time,
      totalDuration,
      service.base_price_cents,
      totalPrice
    ).run();

    const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
    return c.json(job, 201);
  } catch (error) {
    console.error('booking create error', error);
    return c.json({ error: 'Failed to create booking' }, 500);
  }
});

export default app;
