/**
 * Twilio SMS service for Cloudflare Workers.
 * Uses fetch-based REST API calls (no Node SDK needed).
 *
 * Twilio credentials are stored in the settings table (key: 'twilio_config')
 * as JSON: { accountSid, authToken, phoneNumber, enabled }
 *
 * All phone numbers stored/compared in E.164 format: +1XXXXXXXXXX
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;  // E.164 format
  enabled: boolean;
}

export interface SendSmsResult {
  success: boolean;
  twilioSid?: string;
  error?: string;
  errorCode?: string;
}

export interface TwilioWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumSegments: string;
  NumMedia: string;
  MessageStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  SmsStatus?: string;
}

export interface TemplateVars {
  first_name?: string;
  last_name?: string;
  service_name?: string;
  date?: string;
  time?: string;
  provider_name?: string;
  total?: string;
  [key: string]: string | undefined;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export async function getTwilioConfig(db: D1Database): Promise<TwilioConfig | null> {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'twilio_config'").first<{ value: string }>();
    if (!row) return null;
    const config = JSON.parse(row.value) as TwilioConfig;
    if (!config.accountSid || !config.authToken || !config.phoneNumber) return null;
    return config;
  } catch {
    return null;
  }
}

export async function isTwilioEnabled(db: D1Database): Promise<boolean> {
  const config = await getTwilioConfig(db);
  return !!config?.enabled;
}

// ─── Phone Normalization ────────────────────────────────────────────────────

/**
 * Normalize a phone number to E.164 format (+1XXXXXXXXXX) for North America.
 * Strips all non-digit characters, handles common formats:
 *   (613) 555-1234 → +16135551234
 *   613-555-1234   → +16135551234
 *   1-613-555-1234 → +16135551234
 *   +16135551234   → +16135551234
 *   6135551234     → +16135551234
 *
 * Returns null if the number can't be normalized to a valid NANP number.
 */
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Strip everything except digits and leading +
  const stripped = raw.replace(/[^\d+]/g, '');
  const digits = stripped.replace(/\+/g, '');

  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // 10-digit NANP number — prepend country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Already E.164 with +
  if (stripped.startsWith('+1') && digits.length === 11) {
    return `+${digits}`;
  }

  return null; // Can't normalize
}

/**
 * Validate that a string is a valid E.164 phone number (North America).
 */
export function isValidE164(phone: string): boolean {
  return /^\+1\d{10}$/.test(phone);
}

// ─── Template Rendering ─────────────────────────────────────────────────────

/**
 * Render a template string with {{variable}} substitution.
 * Unknown variables are replaced with empty string.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });
}

/**
 * Count SMS segments. GSM-7 = 160 chars/segment, UCS-2 = 70 chars/segment.
 * Multipart: GSM-7 = 153 chars/segment, UCS-2 = 67 chars/segment.
 */
export function countSegments(text: string): number {
  const isGsm7 = /^[\x20-\x7e\r\n]*$/.test(text);

  const charLimit = isGsm7 ? 160 : 70;
  const multipartLimit = isGsm7 ? 153 : 67;

  if (text.length <= charLimit) return 1;
  return Math.ceil(text.length / multipartLimit);
}

// ─── Send SMS ───────────────────────────────────────────────────────────────

/**
 * Send an SMS via Twilio REST API.
 * Returns the Twilio MessageSid on success.
 */
export async function sendSms(
  config: TwilioConfig,
  to: string,
  body: string,
  statusCallbackUrl?: string
): Promise<SendSmsResult> {
  if (!config.enabled) {
    return { success: false, error: 'Twilio is not enabled' };
  }

  if (!isValidE164(to)) {
    return { success: false, error: `Invalid phone number: ${to}` };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: config.phoneNumber,
    Body: body,
  });

  if (statusCallbackUrl) {
    params.set('StatusCallback', statusCallbackUrl);
  }

  const token = btoa(`${config.accountSid}:${config.authToken}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const result = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: (result.message as string) || `HTTP ${response.status}`,
        errorCode: String(result.code || ''),
      };
    }

    return {
      success: true,
      twilioSid: result.sid as string,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending SMS',
    };
  }
}

// ─── Log SMS ────────────────────────────────────────────────────────────────

export interface SmsLogEntry {
  id?: string;
  customerId?: string | null;
  jobId?: string | null;
  messageId?: string | null;
  direction: 'outbound' | 'inbound';
  phoneTo: string;
  phoneFrom: string;
  body: string;
  templateEvent?: string | null;
  twilioSid?: string | null;
  status: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  segments?: number;
}

export interface EnsureSmsInboxMessageParams {
  db: D1Database;
  phoneE164: string;
  customerId?: string | null;
  jobId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export async function ensureSmsInboxMessage(params: EnsureSmsInboxMessageParams): Promise<string> {
  const { db, phoneE164, customerId, jobId, firstName, lastName, email } = params;

  const existingByJob = jobId
    ? await db.prepare(
      `SELECT id FROM messages
       WHERE source = 'sms'
         AND json_extract(metadata, '$.job_id') = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    ).bind(jobId).first<{ id: string }>()
    : null;

  if (existingByJob?.id) return existingByJob.id;

  const existingByPhone = await db.prepare(
    `SELECT id, json_extract(metadata, '$.job_id') as existing_job_id
     FROM messages
     WHERE source = 'sms' AND phone = ?
     ORDER BY updated_at DESC
     LIMIT 1`
  ).bind(phoneE164).first<{ id: string; existing_job_id: string | null }>();

  if (existingByPhone?.id) {
    const existingJobId = existingByPhone.existing_job_id || null;
    const canReuseByPhone =
      (jobId && existingJobId === jobId) ||
      (!jobId && !existingJobId);

    if (!canReuseByPhone) {
      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO messages
         (id, source, status, first_name, last_name, email, phone, reason, subject, body, metadata, is_read, created_at, updated_at)
         VALUES (?, 'sms', 'new', ?, ?, ?, ?, 'sms', ?, ?, ?, 0, datetime('now'), datetime('now'))`
      ).bind(
        id,
        firstName || null,
        lastName || null,
        email || null,
        phoneE164,
        `SMS thread - ${phoneE164}`,
        '',
        JSON.stringify({ type: 'sms_thread', phone_e164: phoneE164, customer_id: customerId || null, job_id: jobId || null }),
      ).run();
      return id;
    }

    await db.prepare(
      `UPDATE messages
       SET metadata = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      JSON.stringify({ type: 'sms_thread', phone_e164: phoneE164, customer_id: customerId || null, job_id: jobId || null }),
      existingByPhone.id,
    ).run();
    return existingByPhone.id;
  }

  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO messages
     (id, source, status, first_name, last_name, email, phone, reason, subject, body, metadata, is_read, created_at, updated_at)
     VALUES (?, 'sms', 'new', ?, ?, ?, ?, 'sms', ?, ?, ?, 0, datetime('now'), datetime('now'))`
  ).bind(
    id,
    firstName || null,
    lastName || null,
    email || null,
    phoneE164,
    `SMS thread - ${phoneE164}`,
    '',
    JSON.stringify({ type: 'sms_thread', phone_e164: phoneE164, customer_id: customerId || null, job_id: jobId || null }),
  ).run();

  return id;
}

export async function touchSmsInboxMessage(db: D1Database, messageId: string, previewText: string): Promise<void> {
  await db.prepare(
    `UPDATE messages
     SET status = 'new',
         is_read = 0,
         read_at = NULL,
         body = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(previewText, messageId).run();
}

export async function logSms(db: D1Database, entry: SmsLogEntry): Promise<string> {
  const id = entry.id || crypto.randomUUID();
  await db.prepare(
    `INSERT INTO sms_log
     (id, customer_id, job_id, message_id, direction, phone_to, phone_from, body, template_event, twilio_sid, status, error_code, error_message, segments, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    id,
    entry.customerId || null,
    entry.jobId || null,
    entry.messageId || null,
    entry.direction,
    entry.phoneTo,
    entry.phoneFrom,
    entry.body,
    entry.templateEvent || null,
    entry.twilioSid || null,
    entry.status,
    entry.errorCode || null,
    entry.errorMessage || null,
    entry.segments || 1
  ).run();
  return id;
}

export async function updateSmsStatus(
  db: D1Database,
  twilioSid: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  await db.prepare(
    `UPDATE sms_log SET status = ?, error_code = ?, error_message = ?, updated_at = datetime('now') WHERE twilio_sid = ?`
  ).bind(status, errorCode || null, errorMessage || null, twilioSid).run();
}

// ─── Webhook Validation ─────────────────────────────────────────────────────

/**
 * Validate that an incoming webhook request is actually from Twilio.
 * Uses HMAC-SHA1 signature verification with auth token as key.
 *
 * For Cloudflare Workers: uses Web Crypto API (no node:crypto).
 *
 * @param authToken - Twilio auth token (HMAC key)
 * @param signature - Value of X-Twilio-Signature header
 * @param url - The full URL Twilio is hitting (must match exactly what Twilio has configured)
 * @param params - The POST body parameters as key-value pairs
 */
export async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // Build the data string: URL + sorted params concatenated
  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  return computedSignature === signature;
}

// ─── Quiet Hours ────────────────────────────────────────────────────────────

/**
 * Check if current time is within quiet hours (9pm - 9am Eastern).
 * Returns true if it's currently quiet hours and SMS should be deferred.
 */
export function isQuietHours(): boolean {
  const now = new Date();
  // Convert to Eastern Time
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const hour = eastern.getHours();
  return hour < 9 || hour >= 21;
}

// ─── Consent Check ──────────────────────────────────────────────────────────

export interface CustomerSmsStatus {
  hasConsent: boolean;
  isOptedOut: boolean;
  phoneE164: string | null;
}

export async function getCustomerSmsStatus(db: D1Database, customerId: string): Promise<CustomerSmsStatus> {
  const row = await db.prepare(
    'SELECT sms_consent, sms_opted_out, phone_e164 FROM customers WHERE id = ?'
  ).bind(customerId).first<{ sms_consent: number; sms_opted_out: number; phone_e164: string | null }>();

  if (!row) {
    return { hasConsent: false, isOptedOut: false, phoneE164: null };
  }

  return {
    hasConsent: row.sms_consent === 1,
    isOptedOut: row.sms_opted_out === 1,
    phoneE164: row.phone_e164,
  };
}

/**
 * Check if we're allowed to send an automated SMS to this customer.
 * Requires: consent given, not opted out, valid phone.
 */
export function canSendAutomatedSms(status: CustomerSmsStatus): boolean {
  return status.hasConsent && !status.isOptedOut && !!status.phoneE164;
}

// ─── High-Level Send ────────────────────────────────────────────────────────

export interface SendJobSmsParams {
  db: D1Database;
  jobId: string;
  customerId: string;
  eventType: string;
  vars: TemplateVars;
  statusCallbackUrl?: string;
  messageId?: string | null;
  skipConsentCheck?: boolean;  // For admin-initiated replies
  skipQuietHours?: boolean;    // For admin-initiated replies
}

/**
 * High-level function to send a templated SMS for a job event.
 * Handles: config check, consent check, quiet hours, template lookup, send, and logging.
 * Returns the sms_log id on success, or null if skipped/failed.
 */
export async function sendJobSms(params: SendJobSmsParams): Promise<string | null> {
  const { db, jobId, customerId, eventType, vars, statusCallbackUrl, messageId, skipConsentCheck, skipQuietHours } = params;

  // 1. Check Twilio config
  const config = await getTwilioConfig(db);
  if (!config?.enabled) {
    console.log(`[sms] Twilio not configured/enabled, skipping ${eventType}`);
    return null;
  }

  // 2. Check consent + opt-out
  if (!skipConsentCheck) {
    const smsStatus = await getCustomerSmsStatus(db, customerId);
    if (!canSendAutomatedSms(smsStatus)) {
      console.log(`[sms] Customer ${customerId} not eligible for SMS (consent=${smsStatus.hasConsent}, optedOut=${smsStatus.isOptedOut}, phone=${smsStatus.phoneE164})`);
      return null;
    }
  }

  // 3. Quiet hours check
  if (!skipQuietHours && isQuietHours()) {
    console.log(`[sms] Quiet hours active, skipping ${eventType} for job ${jobId}`);
    // TODO: Queue for later delivery when we add scheduled sending
    return null;
  }

  // 4. Look up template
  const template = await db.prepare(
    'SELECT body_template, is_active FROM sms_templates WHERE event_type = ?'
  ).bind(eventType).first<{ body_template: string; is_active: number }>();

  if (!template || !template.is_active) {
    console.log(`[sms] Template ${eventType} not found or disabled`);
    return null;
  }

  // 5. Get customer phone
  const customer = await db.prepare(
    'SELECT phone_e164, phone FROM customers WHERE id = ?'
  ).bind(customerId).first<{ phone_e164: string | null; phone: string | null }>();

  const phoneTo = customer?.phone_e164 || normalizePhoneE164(customer?.phone);
  if (!phoneTo) {
    console.log(`[sms] No valid phone for customer ${customerId}`);
    return null;
  }

  // 6. Render template
  const body = renderTemplate(template.body_template, vars);
  const segments = countSegments(body);

  // 7. Send
  const result = await sendSms(config, phoneTo, body, statusCallbackUrl);

  // 8. Log
  const logId = await logSms(db, {
    customerId,
    jobId,
    messageId: messageId || null,
    direction: 'outbound',
    phoneTo,
    phoneFrom: config.phoneNumber,
    body,
    templateEvent: eventType,
    twilioSid: result.twilioSid || null,
    status: result.success ? 'sent' : 'failed',
    errorCode: result.errorCode || null,
    errorMessage: result.error || null,
    segments,
  });

  if (!result.success) {
    console.error(`[sms] Failed to send ${eventType} for job ${jobId}: ${result.error}`);
  }

  return logId;
}

// ─── Admin Direct Send ──────────────────────────────────────────────────────

export interface SendDirectSmsParams {
  db: D1Database;
  to: string;           // E.164 phone number
  body: string;         // Raw message body
  customerId?: string;
  jobId?: string;
  messageId?: string;   // Link back to inbox message if replying
  statusCallbackUrl?: string;
}

/**
 * Send a direct SMS (admin reply). Bypasses template system and consent check.
 * Still requires Twilio to be configured and enabled.
 */
export async function sendDirectSms(params: SendDirectSmsParams): Promise<{ logId: string; success: boolean; error?: string }> {
  const { db, to, body, customerId, jobId, messageId, statusCallbackUrl } = params;

  const config = await getTwilioConfig(db);
  if (!config?.enabled) {
    return { logId: '', success: false, error: 'Twilio is not configured or enabled' };
  }

  const result = await sendSms(config, to, body, statusCallbackUrl);
  const segments = countSegments(body);

  const logId = await logSms(db, {
    customerId: customerId || null,
    jobId: jobId || null,
    messageId: messageId || null,
    direction: 'outbound',
    phoneTo: to,
    phoneFrom: config.phoneNumber,
    body,
    twilioSid: result.twilioSid || null,
    status: result.success ? 'sent' : 'failed',
    errorCode: result.errorCode || null,
    errorMessage: result.error || null,
    segments,
  });

  return { logId, success: result.success, error: result.error };
}
