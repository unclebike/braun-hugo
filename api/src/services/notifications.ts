type VapidConfig = {
  publicKey: string;
  privateKeyJwk: JsonWebKey;
  subject: string;
};

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionPreferences {
  notifyNewJobs: boolean;
  notifyNewMessages: boolean;
}

export type PushEvent = {
  type: 'new_message' | 'new_job' | 'test';
  title: string;
  body: string;
  targetUrl: string;
};

export interface PendingPushNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function derToJose(signatureDer: Uint8Array, size = 32): Uint8Array {
  // Convert ASN.1 DER encoded ECDSA signature to JOSE (raw R||S) format.
  // DER format: 30 len 02 lenR R 02 lenS S
  if (signatureDer.length < 8 || signatureDer[0] !== 0x30) {
    throw new Error('Invalid DER signature');
  }

  let offset = 2;
  if (signatureDer[1] & 0x80) {
    const lenBytes = signatureDer[1] & 0x7f;
    offset = 2 + lenBytes;
  }

  if (signatureDer[offset] !== 0x02) throw new Error('Invalid DER signature');
  const rLen = signatureDer[offset + 1];
  const r = signatureDer.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;

  if (signatureDer[offset] !== 0x02) throw new Error('Invalid DER signature');
  const sLen = signatureDer[offset + 1];
  const s = signatureDer.slice(offset + 2, offset + 2 + sLen);

  const rOut = new Uint8Array(size);
  const sOut = new Uint8Array(size);

  // Trim possible leading 0x00 for positive integer.
  const rTrim = (r.length > size) ? r.slice(r.length - size) : r;
  const sTrim = (s.length > size) ? s.slice(s.length - size) : s;

  rOut.set(rTrim, size - rTrim.length);
  sOut.set(sTrim, size - sTrim.length);
  return concatBytes(rOut, sOut);
}

async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).bind(key, value).run();
}

async function ensureVapidConfig(db: D1Database): Promise<VapidConfig> {
  const existing = await getSetting(db, 'web_push_vapid');
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const rec = parsed as Record<string, unknown>;
        if (typeof rec.publicKey === 'string' && rec.privateKeyJwk && typeof rec.subject === 'string') {
          return {
            publicKey: rec.publicKey,
            privateKeyJwk: rec.privateKeyJwk as JsonWebKey,
            subject: rec.subject,
          };
        }
      }
    } catch {
      // fall through to regenerate
    }
  }

  const subject = 'mailto:ops@unclebike.xyz';
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  if (!publicJwk.x || !publicJwk.y) throw new Error('Failed to export VAPID public key');

  // Uncompressed EC point format: 0x04 || X || Y
  const publicBytes = concatBytes(
    new Uint8Array([0x04]),
    base64UrlDecode(publicJwk.x),
    base64UrlDecode(publicJwk.y),
  );

  const publicKey = base64UrlEncode(publicBytes);

  const config: VapidConfig = {
    publicKey,
    privateKeyJwk: privateJwk,
    subject,
  };

  await setSetting(db, 'web_push_vapid', JSON.stringify(config));
  return config;
}

async function createVapidJwt(audOrigin: string, subject: string, privateKeyJwk: JsonWebKey): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (12 * 60 * 60);
  const payload = { aud: audOrigin, exp, sub: subject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const sigDer = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  ));
  const sigJose = derToJose(sigDer);
  const sigB64 = base64UrlEncode(sigJose);
  return `${signingInput}.${sigB64}`;
}

async function ensureQueueTable(db: D1Database): Promise<void> {
  // Best-effort table creation so deployments don't depend on migrations.
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS push_notification_queue (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      staff_email TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_push_queue_endpoint_created ON push_notification_queue(endpoint, created_at)'
  ).run();
}

async function pingPushEndpoint(db: D1Database, endpoint: string): Promise<{ ok: boolean; status: number }>{
  const cfg = await ensureVapidConfig(db);
  const origin = new URL(endpoint).origin;
  const jwt = await createVapidJwt(origin, cfg.subject, cfg.privateKeyJwk);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '60',
      Authorization: `vapid t=${jwt}, k=${cfg.publicKey}`,
      'Crypto-Key': `p256ecdsa=${cfg.publicKey}`,
      'Content-Length': '0',
    },
  });

  return { ok: response.ok, status: response.status };
}

export async function getPushVapidPublicKey(db: D1Database): Promise<string> {
  const cfg = await ensureVapidConfig(db);
  return cfg.publicKey;
}

export async function upsertPushSubscription(
  db: D1Database,
  staffEmail: string,
  subscription: PushSubscriptionInput,
  _preferences: PushSubscriptionPreferences,
): Promise<void> {
  // Current migration only stores endpoint + keys. Keep schema flexible; staffEmail/preferences are
  // used for future targeting but won't block subscription persistence.
  const endpoint = subscription.endpoint.trim();
  const auth = subscription.keys.auth.trim();
  const p256dh = subscription.keys.p256dh.trim();
  if (!endpoint || !auth || !p256dh) throw new Error('endpoint and keys are required');

  await db.prepare(
    `INSERT INTO push_subscriptions (id, endpoint, auth_key, p256dh_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET
       auth_key = excluded.auth_key,
       p256dh_key = excluded.p256dh_key,
       updated_at = datetime('now')`
  ).bind(crypto.randomUUID(), endpoint, auth, p256dh).run();

  // Store last-known preferences per staff email (best-effort, JSON value).
  // This avoids schema changes while letting /push/status reflect checkbox state.
  const prefsKey = `push_prefs:${staffEmail.trim().toLowerCase()}`;
  try {
    await setSetting(db, prefsKey, JSON.stringify(_preferences));
  } catch {
    // ignore
  }
}

export async function deactivatePushSubscription(
  db: D1Database,
  _staffEmail: string,
  endpoint: string,
): Promise<void> {
  const trimmed = endpoint.trim();
  if (!trimmed) return;
  await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(trimmed).run();
}

export async function getPushSubscriptionStatus(
  db: D1Database,
  staffEmail: string,
  endpoint?: string,
): Promise<{ subscribed: boolean; notifyNewJobs: boolean; notifyNewMessages: boolean }>{
  const endpointTrimmed = (endpoint || '').trim();
  let subscribed = false;
  if (endpointTrimmed) {
    const row = await db.prepare('SELECT endpoint FROM push_subscriptions WHERE endpoint = ?').bind(endpointTrimmed).first();
    subscribed = Boolean(row);
  } else {
    const row = await db.prepare('SELECT endpoint FROM push_subscriptions LIMIT 1').first();
    subscribed = Boolean(row);
  }

  const prefsKey = `push_prefs:${staffEmail.trim().toLowerCase()}`;
  const stored = await getSetting(db, prefsKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const rec = parsed as Record<string, unknown>;
        const notifyNewJobs = typeof rec.notifyNewJobs === 'boolean' ? rec.notifyNewJobs : true;
        const notifyNewMessages = typeof rec.notifyNewMessages === 'boolean' ? rec.notifyNewMessages : true;
        return { subscribed, notifyNewJobs, notifyNewMessages };
      }
    } catch {
      // ignore
    }
  }

  return { subscribed, notifyNewJobs: true, notifyNewMessages: true };
}

export async function pullPendingPushNotifications(
  db: D1Database,
  _staffEmail: string,
  endpoint: string,
  limit = 6,
): Promise<PendingPushNotification[]> {
  const trimmed = endpoint.trim();
  if (!trimmed) return [];
  await ensureQueueTable(db);
  const result = await db.prepare(
    `SELECT id, title, body, url, created_at
     FROM push_notification_queue
     WHERE endpoint = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(trimmed, Math.max(1, Math.min(20, limit))).all<{ id: string; title: string; body: string; url: string; created_at: string }>();

  return (result.results || []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    url: row.url,
    createdAt: row.created_at,
  }));
}

export async function enqueueTestPushNotificationAndPing(
  db: D1Database,
  staffEmail: string,
  endpoint: string,
): Promise<{ ok: boolean; status: number; queued: boolean }>{
  const trimmed = endpoint.trim();
  if (!trimmed) throw new Error('endpoint is required');

  await ensureQueueTable(db);
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO push_notification_queue (id, endpoint, staff_email, title, body, url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    trimmed,
    staffEmail.trim().toLowerCase(),
    'Zenbooker test notification',
    'If you can see this, push delivery is working.',
    '/admin',
  ).run();

  const delivered = await pingPushEndpoint(db, trimmed);
  return { ...delivered, queued: true };
}

export async function enqueueAndDispatchPushEvent(
  db: D1Database,
  event: PushEvent,
): Promise<void> {
  await ensureQueueTable(db);

  const subscriptions = await db.prepare(
    'SELECT endpoint FROM push_subscriptions ORDER BY updated_at DESC LIMIT 100'
  ).all<{ endpoint: string }>();

  const endpoints = (subscriptions.results || [])
    .map((row) => (row.endpoint || '').trim())
    .filter(Boolean);

  if (!endpoints.length) return;

  const title = event.title.trim() || 'Zenbooker update';
  const body = event.body.trim() || 'Open the app for details.';
  const url = event.targetUrl.trim() || '/admin';

  // Insert a notification row per endpoint, then ping each endpoint to trigger the service worker.
  const inserts: D1PreparedStatement[] = [];
  for (const endpoint of endpoints) {
    inserts.push(db.prepare(
      `INSERT INTO push_notification_queue (id, endpoint, staff_email, title, body, url)
       VALUES (?, ?, NULL, ?, ?, ?)`
    ).bind(crypto.randomUUID(), endpoint, title, body, url));
  }
  await db.batch(inserts);

  await Promise.all(endpoints.map((endpoint) => pingPushEndpoint(db, endpoint).catch(() => null)));
}

export async function sendNotification(type: string, data: unknown): Promise<void> {
  console.log('[notifications] send', { type, data });
}
