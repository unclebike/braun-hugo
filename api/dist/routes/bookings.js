import { Hono } from 'hono';
import { checkServiceArea } from '../geo/service-area';
import { calculateAdjustedPrice } from '../scheduling/pricing';
import { normalizePhoneE164, sendJobSms } from '../services/twilio';
import { buildServiceBaseLine, normalizeLine } from '../utils/line-items';
const app = new Hono();
const asStringArray = (value) => {
    if (Array.isArray(value))
        return value.map((v) => String(v));
    if (typeof value === 'string' && value)
        return [value];
    return [];
};
app.post('/create', async (c) => {
    try {
        const db = c.env.DB;
        const body = await c.req.json();
        let territoryId = typeof body.territory_id === 'string' ? body.territory_id : '';
        if (!territoryId) {
            const territories = await db.prepare('SELECT id, service_area_type, service_area_data FROM territories WHERE is_active = 1').all();
            for (const territory of territories.results || []) {
                const result = checkServiceArea(territory.service_area_type, territory.service_area_data, {
                    postalCode: typeof body.postal_code === 'string' ? body.postal_code : undefined,
                    lat: typeof body.lat === 'number' ? body.lat : undefined,
                    lng: typeof body.lng === 'number' ? body.lng : undefined,
                });
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
        const service = await db.prepare(`SELECT s.id, s.name, s.base_price_cents, s.base_duration_minutes
       FROM services s
       JOIN territory_services ts ON ts.service_id = s.id
       WHERE s.id = ? AND ts.territory_id = ? AND s.is_active = 1`).bind(serviceId, territoryId).first();
        if (!service) {
            return c.json({ error: 'Service unavailable for selected territory' }, 400);
        }
        let customer = null;
        if (typeof body.email === 'string' && body.email.trim()) {
            customer = await db.prepare('SELECT id FROM customers WHERE email = ?').bind(body.email.trim()).first();
        }
        if (!customer && typeof body.phone === 'string' && body.phone.trim()) {
            customer = await db.prepare('SELECT id FROM customers WHERE phone = ? ORDER BY created_at DESC LIMIT 1').bind(body.phone.trim()).first();
        }
        const phoneE164 = normalizePhoneE164(typeof body.phone === 'string' ? body.phone : null);
        const smsConsent = body.sms_consent === true || body.sms_consent === 1 ? 1 : 0;
        let customerId = customer?.id;
        if (!customerId) {
            customerId = crypto.randomUUID();
            await db.prepare(`INSERT INTO customers (id, first_name, last_name, email, phone, phone_e164, sms_consent, sms_consent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).bind(customerId, body.first_name, body.last_name, body.email || null, body.phone || null, phoneE164, smsConsent, smsConsent ? new Date().toISOString() : null).run();
        }
        else if (smsConsent || phoneE164) {
            await db.prepare(`UPDATE customers SET
         phone_e164 = COALESCE(?, phone_e164),
         sms_consent = CASE WHEN ? = 1 THEN 1 ELSE sms_consent END,
         sms_consent_at = CASE WHEN ? = 1 AND sms_consent = 0 THEN datetime('now') ELSE sms_consent_at END,
         updated_at = datetime('now')
         WHERE id = ?`).bind(phoneE164, smsConsent, smsConsent, customerId).run();
        }
        const addressId = crypto.randomUUID();
        await db.prepare(`INSERT INTO customer_addresses
       (id, customer_id, line_1, line_2, city, state, postal_code, lat, lng, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).bind(addressId, customerId, body.address_line1, body.address_line2 || null, body.city, body.province, body.postal_code, body.lat ?? null, body.lng ?? null, 1).run();
        const selectedModifierIds = asStringArray(body.selected_modifiers);
        let totalPrice = Number(service.base_price_cents || 0);
        let totalDuration = Number(body.duration_minutes || service.base_duration_minutes || 60);
        const jobLineItems = [buildServiceBaseLine(service.name, Number(service.base_price_cents || 0))];
        if (selectedModifierIds.length > 0) {
            const modifierRows = await db.prepare(`SELECT id, name, price_adjustment_cents, duration_adjustment_minutes
         FROM service_modifiers
         WHERE service_id = ?
            AND id IN (${selectedModifierIds.map(() => '?').join(', ')})`).bind(serviceId, ...selectedModifierIds).all();
            for (const modifier of modifierRows.results || []) {
                const delta = Number(modifier.price_adjustment_cents || 0);
                totalPrice += delta;
                totalDuration += Number(modifier.duration_adjustment_minutes || 0);
                jobLineItems.push(normalizeLine(modifier.name || 'Modifier', 1, delta, 'modifier', jobLineItems[0].id, 0));
            }
        }
        const pricing = await calculateAdjustedPrice(db, serviceId, totalPrice, territoryId, String(body.scheduled_date || ''), String(body.scheduled_start_time || ''));
        totalPrice = pricing.total_price;
        for (const adjustment of pricing.rule_adjustments) {
            const delta = Number(adjustment.delta || 0);
            if (!delta)
                continue;
            const kind = String(adjustment.rule_type || 'rule').replace(/_/g, ' ');
            const direction = delta > 0 ? '+' : '-';
            jobLineItems.push(normalizeLine(`Rule (${kind}) ${direction}`, 1, delta, 'rule', jobLineItems[0].id, 0));
        }
        const jobId = crypto.randomUUID();
        await db.prepare(`INSERT INTO jobs
        (id, customer_id, service_id, territory_id, customer_address_id, scheduled_date, scheduled_start_time,
         duration_minutes, base_price_cents, total_price_cents, line_items_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', datetime('now'), datetime('now'))`).bind(jobId, customerId, serviceId, territoryId, addressId, body.scheduled_date, body.scheduled_start_time, totalDuration, service.base_price_cents, totalPrice, JSON.stringify(jobLineItems)).run();
        const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
        const templateVars = {
            first_name: typeof body.first_name === 'string' ? body.first_name : '',
            last_name: typeof body.last_name === 'string' ? body.last_name : '',
            service_name: service.name,
            date: typeof body.scheduled_date === 'string' ? body.scheduled_date : '',
            time: typeof body.scheduled_start_time === 'string' ? body.scheduled_start_time : '',
            total: (totalPrice / 100).toFixed(2),
        };
        const baseUrl = new URL(c.req.url).origin;
        c.executionCtx.waitUntil(sendJobSms({
            db,
            jobId,
            customerId,
            eventType: 'booking.confirmed',
            vars: templateVars,
            statusCallbackUrl: `${baseUrl}/webhooks/twilio/status`,
        }));
        return c.json(job, 201);
    }
    catch (error) {
        console.error('booking create error', error);
        return c.json({ error: 'Failed to create booking' }, 500);
    }
});
export default app;
//# sourceMappingURL=bookings.js.map