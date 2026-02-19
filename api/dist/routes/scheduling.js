import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { checkServiceArea } from '../geo/service-area';
import { generateTimeslots } from '../scheduling/timeslots';
import { calculateAdjustedPrice } from '../scheduling/pricing';
const serviceAreaSchema = z.object({
    postal_code: z.string().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    address: z.string().optional()
});
const timeslotSchema = z.object({
    territory_id: z.string(),
    date_from: z.string(),
    date_to: z.string(),
    duration_minutes: z.coerce.number(),
    service_id: z.string().optional()
});
const app = new Hono();
app.get('/service_area_check', zValidator('query', serviceAreaSchema), async (c) => {
    try {
        const db = c.env?.DB;
        if (!db) {
            return c.json({ error: 'Database not available' }, 500);
        }
        const { postal_code, lat, lng } = c.req.valid('query');
        let resolvedLat = lat;
        let resolvedLng = lng;
        let resolvedCity;
        let resolvedProvince;
        if (postal_code && (resolvedLat === undefined || resolvedLng === undefined)) {
            const token = c.env?.MAPBOX_ACCESS_TOKEN;
            if (token) {
                try {
                    const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(postal_code)}&country=ca&types=postcode,place&limit=1&access_token=${token}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.features && data.features.length > 0) {
                            const f = data.features[0];
                            resolvedLng = f.geometry.coordinates[0];
                            resolvedLat = f.geometry.coordinates[1];
                            const ctx = f.properties.context || {};
                            resolvedCity = ctx.place?.name;
                            resolvedProvince = ctx.region?.region_code;
                        }
                    }
                }
                catch { }
            }
        }
        const territories = await db.prepare('SELECT * FROM territories WHERE is_active = 1').all();
        let matchingTerritory = null;
        let closestTerritory = null;
        let minDistance = Infinity;
        const postalCodeBufferKm = 5;
        for (const territory of territories.results || []) {
            const result = checkServiceArea(territory.service_area_type, territory.service_area_data, { postalCode: postal_code, lat: resolvedLat, lng: resolvedLng }, postalCodeBufferKm);
            if (result.within) {
                matchingTerritory = territory;
                break;
            }
            if (result.distance !== undefined && result.distance < minDistance) {
                minDistance = result.distance;
                closestTerritory = territory;
            }
        }
        return c.json({
            within_service_area: matchingTerritory !== null,
            territory: matchingTerritory,
            closest_territory: !matchingTerritory ? closestTerritory : null,
            distance_km: !matchingTerritory && minDistance !== Infinity ? Math.round(minDistance * 100) / 100 : null,
            resolved_city: resolvedCity || null,
            resolved_province: resolvedProvince || null,
            resolved_lat: resolvedLat ?? null,
            resolved_lng: resolvedLng ?? null
        });
    }
    catch (error) {
        console.error('Service area check error:', error);
        return c.json({ error: 'Service area check failed' }, 500);
    }
});
app.get('/timeslots', zValidator('query', timeslotSchema), async (c) => {
    try {
        const db = c.env?.DB;
        if (!db) {
            return c.json({ error: 'Database not available' }, 500);
        }
        const { territory_id, date_from, date_to, duration_minutes, service_id } = c.req.valid('query');
        let requiredProviderCount = 1;
        let requiredSkills = [];
        let serviceBasePrice = 0;
        if (service_id) {
            const service = await db.prepare(`
        SELECT required_provider_count, base_price_cents FROM services WHERE id = ?
      `).bind(service_id).first();
            if (service) {
                requiredProviderCount = service.required_provider_count;
                serviceBasePrice = service.base_price_cents;
            }
            const skills = await db.prepare(`
        SELECT skill_id FROM service_required_skills WHERE service_id = ?
      `).bind(service_id).all();
            requiredSkills = (skills.results || []).map(s => s.skill_id);
        }
        let hasAdjustmentRules = false;
        if (service_id && serviceBasePrice > 0) {
            const ruleCount = await db.prepare('SELECT COUNT(*) as cnt FROM price_adjustment_rules WHERE is_active = 1 AND (service_id = ? OR service_id IS NULL)').bind(service_id).first();
            hasAdjustmentRules = (ruleCount?.cnt || 0) > 0;
        }
        const allTimeslots = [];
        const startDate = new Date(date_from);
        const endDate = new Date(date_to);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const timeslots = await generateTimeslots(db, territory_id, dateStr, duration_minutes, requiredProviderCount, requiredSkills);
            for (const slot of timeslots) {
                if (slot.available) {
                    slot.price = serviceBasePrice;
                }
            }
            if (service_id && serviceBasePrice > 0 && hasAdjustmentRules) {
                for (const slot of timeslots) {
                    if (slot.available) {
                        const pricing = await calculateAdjustedPrice(db, service_id, serviceBasePrice, territory_id, dateStr, slot.start_time);
                        slot.price = pricing.total_price;
                        slot.price_adjustment = pricing.rule_adjustments;
                    }
                }
            }
            allTimeslots.push(...timeslots);
        }
        return c.json({ timeslots: allTimeslots });
    }
    catch (error) {
        console.error('Timeslots error:', error);
        return c.json({ error: 'Timeslots query failed' }, 500);
    }
});
export default app;
//# sourceMappingURL=scheduling.js.map