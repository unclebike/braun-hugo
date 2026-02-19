import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import adminRoutes from './routes/admin';
import bookingsRoutes from './routes/bookings';
import categoriesRoutes from './routes/categories';
import couponsRoutes from './routes/coupons';
import customersRoutes from './routes/customers';
import invoicesRoutes from './routes/invoices';
import jobsRoutes from './routes/jobs';
import modifiersRoutes from './routes/modifiers';
import recurringBookingsRoutes from './routes/recurring-bookings';
import schedulingRoutes from './routes/scheduling';
import servicesRoutes from './routes/services';
import skillsRoutes from './routes/skills';
import teamRoutes from './routes/team';
import territoriesRoutes from './routes/territories';
import transactionsRoutes from './routes/transactions';
import messagesRoutes from './routes/messages';
import webhooksRoutes from './routes/webhooks';
import twilioWebhooksRoutes from './routes/twilio-webhooks';
import { BOOKING_WIDGET_DEMO, BOOKING_WIDGET_JS, BOOKING_WIDGET_POPUP } from './widget/embed';
const app = new Hono();
app.onError((err, c) => {
    console.error('Unhandled error:', err.message, err.stack);
    return c.text(`Error: ${err.message}`, 500);
});
app.use('/v1/*', cors());
app.use('/widget/*', cors());
app.get('/fonts/*', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/images/*', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/admin.js', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/admin.webmanifest', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/admin-sw.js', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/admin-offline.html', (c) => c.env.ASSETS.fetch(c.req.raw));
app.use('/admin/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
});
app.use('*', authMiddleware);
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const getWidgetPrimaryColor = async (db) => {
    let primaryColor = '#2563eb';
    try {
        const row = await db.prepare("SELECT value FROM settings WHERE key = 'widget_branding'").first();
        if (row) {
            const branding = JSON.parse(row.value);
            if (branding.primaryColor)
                primaryColor = branding.primaryColor;
        }
    }
    catch {
    }
    return primaryColor;
};
const normalizeWidgetFeature = (f) => {
    const properties = f.properties || {};
    const context = properties.context || {};
    const rawRegion = context.region?.region_code || '';
    const normalizedRegion = rawRegion.startsWith('CA-') ? rawRegion.slice(3) : rawRegion;
    return {
        properties: {
            full_address: properties.full_address || '',
            name: properties.name || '',
            context: {
                place: { name: context.place?.name || '' },
                region: { region_code: normalizedRegion },
                postcode: { name: context.postcode?.name || '' },
            },
        },
        geometry: {
            coordinates: Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [0, 0],
        },
    };
};
const normalizeProximity = (raw) => {
    if (!raw)
        return 'ip';
    if (raw === 'ip')
        return 'ip';
    if (/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(raw))
        return raw;
    return 'ip';
};
app.get('/widget/booking-widget.js', async (c) => {
    const primaryColor = await getWidgetPrimaryColor(c.env.DB);
    const js = BOOKING_WIDGET_JS.replace(/'#2563eb'/g, `'${primaryColor}'`);
    return c.text(js, 200, {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, must-revalidate',
    });
});
app.get('/widget/popup.js', async (c) => {
    const primaryColor = await getWidgetPrimaryColor(c.env.DB);
    const js = BOOKING_WIDGET_POPUP.replace(/'#2563eb'/g, `'${primaryColor}'`);
    return c.text(js, 200, {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, must-revalidate',
    });
});
app.get('/widget/branding.js', async (c) => {
    const primaryColor = await getWidgetPrimaryColor(c.env.DB);
    const js = `(function(){var c='${primaryColor}';document.documentElement.style.setProperty('--brand-color',c);window.GOATkitBranding={primaryColor:c};var cfg=window.GOATkitPopupConfig;if(cfg)cfg.primaryColor=c;})();`;
    return c.text(js, 200, {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, must-revalidate',
    });
});
app.get('/widget/demo', async (c) => {
    const primaryColor = await getWidgetPrimaryColor(c.env.DB);
    const html = BOOKING_WIDGET_DEMO.replace(/'#2563eb'/g, `'${primaryColor}'`);
    return c.html(html);
});
app.get('/widget/address/search', async (c) => {
    const q = (c.req.query('q') || '').trim();
    const proximity = normalizeProximity((c.req.query('proximity') || '').trim());
    if (q.length < 3) {
        return c.json({ features: [] });
    }
    const token = c.env.MAPBOX_ACCESS_TOKEN || '';
    if (!token) {
        return c.json({ features: [] });
    }
    try {
        const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=ca&types=address&limit=5&proximity=${encodeURIComponent(proximity)}&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
            return c.json({ features: [] });
        }
        const data = await res.json();
        const features = (data.features || []).map(normalizeWidgetFeature);
        return c.json({ features });
    }
    catch {
        return c.json({ features: [] });
    }
});
const api = new Hono();
api.route('/territories', territoriesRoutes);
api.route('/scheduling', schedulingRoutes);
api.route('/services', servicesRoutes);
api.route('/categories', categoriesRoutes);
api.route('/modifiers', modifiersRoutes);
api.route('/customers', customersRoutes);
api.route('/team', teamRoutes);
api.route('/skills', skillsRoutes);
api.route('/jobs', jobsRoutes);
api.route('/recurring-bookings', recurringBookingsRoutes);
api.route('/invoices', invoicesRoutes);
api.route('/transactions', transactionsRoutes);
api.route('/coupons', couponsRoutes);
api.route('/webhooks', webhooksRoutes);
api.route('/bookings', bookingsRoutes);
api.route('/messages', messagesRoutes);
app.route('/v1', api);
app.route('/webhooks/twilio', twilioWebhooksRoutes);
app.route('/admin', adminRoutes);
async function sendReminders(db) {
    const { sendJobSms, isTwilioEnabled } = await import('./services/twilio');
    if (!(await isTwilioEnabled(db)))
        return;
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const todayStr = eastern.toISOString().split('T')[0];
    const tomorrow = new Date(eastern);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const jobs = await db.prepare(`SELECT j.id, j.customer_id, j.scheduled_date, j.scheduled_start_time, j.total_price_cents,
            c.first_name, c.last_name,
            COALESCE(s.name, j.custom_service_name, 'Service') as service_name
     FROM jobs j
     JOIN customers c ON c.id = j.customer_id
     LEFT JOIN services s ON s.id = j.service_id
     WHERE j.status IN ('created', 'assigned')
       AND j.scheduled_date IN (?, ?)
       AND c.sms_consent = 1
       AND c.sms_opted_out = 0
       AND c.phone_e164 IS NOT NULL`).bind(todayStr, tomorrowStr).all();
    for (const job of jobs.results || []) {
        const eventType = job.scheduled_date === todayStr ? 'reminder.morning_of' : 'reminder.day_before';
        const vars = {
            first_name: job.first_name,
            last_name: job.last_name,
            service_name: job.service_name,
            date: job.scheduled_date,
            time: job.scheduled_start_time,
            total: (job.total_price_cents / 100).toFixed(2),
        };
        await sendJobSms({
            db,
            jobId: job.id,
            customerId: job.customer_id,
            eventType,
            vars,
            skipQuietHours: true,
        });
    }
}
export default {
    fetch: app.fetch,
    async scheduled(event, env, ctx) {
        ctx.waitUntil(sendReminders(env.DB));
    },
};
//# sourceMappingURL=index.js.map