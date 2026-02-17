import { Hono } from 'hono';
import { enqueueAndDispatchPushEvent } from '../services/notifications';
import {
  ensureSmsInboxMessage,
  getTwilioConfig,
  logSms,
  normalizePhoneE164,
  touchSmsInboxMessage,
  updateSmsStatus,
  validateTwilioSignature,
} from '../services/twilio';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

const parseFormParams = (rawBody: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const parsed = new URLSearchParams(rawBody);
  for (const [key, value] of parsed.entries()) {
    params[key] = value;
  }
  return params;
};

app.post('/status', async (c) => {
  const db = c.env.DB;
  const config = await getTwilioConfig(db);
  if (!config) return c.text('Not configured', 200);

  const rawBody = await c.req.raw.clone().text();
  const params = parseFormParams(rawBody);

  const signature = c.req.header('X-Twilio-Signature') || '';
  const url = new URL(c.req.url);
  const fullUrl = `${url.origin}${url.pathname}`;

  const valid = await validateTwilioSignature(config.authToken, signature, fullUrl, params);
  if (!valid) {
    console.warn('[twilio-webhook] Invalid signature on status callback');
    return c.text('Invalid signature', 403);
  }

  const messageSid = params.MessageSid || params.SmsSid;
  const messageStatus = params.MessageStatus || params.SmsStatus || '';
  const errorCode = params.ErrorCode || '';
  const errorMessage = params.ErrorMessage || '';

  if (messageSid && messageStatus) {
    await updateSmsStatus(db, messageSid, messageStatus, errorCode || undefined, errorMessage || undefined);
  }

  return c.text('', 200);
});

app.post('/inbound', async (c) => {
  const db = c.env.DB;
  const config = await getTwilioConfig(db);
  if (!config) return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, { 'Content-Type': 'text/xml' });

  const rawBody = await c.req.raw.clone().text();
  const params = parseFormParams(rawBody);

  const signature = c.req.header('X-Twilio-Signature') || '';
  const url = new URL(c.req.url);
  const fullUrl = `${url.origin}${url.pathname}`;

  const valid = await validateTwilioSignature(config.authToken, signature, fullUrl, params);
  if (!valid) {
    console.warn('[twilio-webhook] Invalid signature on inbound SMS');
    return c.text('Invalid signature', 403);
  }

  const from = params.From || '';
  const to = params.To || '';
  const body = params.Body || '';
  const messageSid = params.MessageSid || '';
  const numSegments = parseInt(params.NumSegments || '1', 10);

  const phoneE164 = normalizePhoneE164(from);
  if (!phoneE164) {
    console.warn(`[twilio-webhook] Could not normalize inbound phone: ${from}`);
    return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, { 'Content-Type': 'text/xml' });
  }

  const customer = await db.prepare(
    'SELECT id, first_name, last_name, email FROM customers WHERE phone_e164 = ? OR phone = ? ORDER BY updated_at DESC LIMIT 1'
  ).bind(phoneE164, from).first<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>();

  const latestJob = customer?.id
    ? await db.prepare(
      `SELECT id FROM jobs
       WHERE customer_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    ).bind(customer.id).first<{ id: string }>()
    : null;

  const inboxMessageId = await ensureSmsInboxMessage({
    db,
    phoneE164,
    customerId: customer?.id || null,
    jobId: latestJob?.id || null,
    firstName: customer?.first_name || null,
    lastName: customer?.last_name || null,
    email: customer?.email || null,
  });

  await touchSmsInboxMessage(db, inboxMessageId, body);

  const upperBody = body.toUpperCase().trim();
  if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(upperBody)) {
    if (customer) {
      await db.prepare(
        "UPDATE customers SET sms_opted_out = 1, sms_opted_out_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(customer.id).run();
      console.log(`[twilio-webhook] Customer ${customer.id} opted out via ${upperBody}`);
    }
  }

  if (['START', 'YES', 'UNSTOP'].includes(upperBody)) {
    if (customer) {
      await db.prepare(
        "UPDATE customers SET sms_opted_out = 0, sms_opted_out_at = NULL, updated_at = datetime('now') WHERE id = ?"
      ).bind(customer.id).run();
      console.log(`[twilio-webhook] Customer ${customer.id} opted back in via ${upperBody}`);
    }
  }

  await logSms(db, {
    customerId: customer?.id || null,
    jobId: latestJob?.id || null,
    messageId: inboxMessageId,
    direction: 'inbound',
    phoneTo: to,
    phoneFrom: phoneE164,
    body,
    twilioSid: messageSid,
    status: 'received',
    segments: numSegments,
  });

  const senderLabel = customer
    ? [customer.first_name || '', customer.last_name || ''].filter(Boolean).join(' ').trim() || phoneE164
    : phoneE164;
  const preview = body.replace(/\s+/g, ' ').trim().slice(0, 160);
  c.executionCtx.waitUntil(
    enqueueAndDispatchPushEvent(db, {
      type: 'new_message',
      title: `New SMS from ${senderLabel}`,
      body: preview || 'New inbound SMS received.',
      targetUrl: `/admin/inbox/${inboxMessageId}`,
    })
  );

  return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, { 'Content-Type': 'text/xml' });
});

export default app;
