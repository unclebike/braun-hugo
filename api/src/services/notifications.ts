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

  // Cloudflare Workers returns ECDSA signatures in JOSE (raw R||S) format (64 bytes for P-256).
  // Some runtimes return ASN.1 DER. Support both.
  let sigJose: Uint8Array;
  if (sigDer.length === 64) {
    sigJose = sigDer;
  } else if (sigDer.length > 0 && sigDer[0] === 0x30) {
    sigJose = derToJose(sigDer);
  } else {
    throw new Error('Unsupported ECDSA signature format');
  }

  const sigB64 = base64UrlEncode(sigJose);
  return `${signingInput}.${sigB64}`;
}

async function ensurePushTables(db: D1Database): Promise<void> {
  // Best-effort table creation so deployments don't depend on migrations.
  // Keep this aligned with `migrations/0010_add_push_notifications.sql`.
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      notify_new_jobs INTEGER NOT NULL DEFAULT 1,
      notify_new_messages INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();

  await db.prepare(
    `CREATE TABLE IF NOT EXISTS push_notification_queue (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('new_job', 'new_message')),
      title TEXT NOT NULL,
      body TEXT,
      target_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at TEXT,
      FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
    )`
  ).run();

  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email ON push_subscriptions(user_email)'
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint)'
  ).run();
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_push_queue_subscription_id ON push_notification_queue(subscription_id)'
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
  const endpoint = subscription.endpoint.trim();
  const auth = subscription.keys.auth.trim();
  const p256dh = subscription.keys.p256dh.trim();
  if (!endpoint || !auth || !p256dh) throw new Error('endpoint and keys are required');

  await ensurePushTables(db);

  const userEmail = staffEmail.trim().toLowerCase();
  const notifyNewJobs = _preferences.notifyNewJobs ? 1 : 0;
  const notifyNewMessages = _preferences.notifyNewMessages ? 1 : 0;

  await db.prepare(
    `INSERT INTO push_subscriptions (
       id, user_email, endpoint, p256dh, auth,
       notify_new_jobs, notify_new_messages,
       is_active, last_seen_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET
       user_email = excluded.user_email,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       notify_new_jobs = excluded.notify_new_jobs,
       notify_new_messages = excluded.notify_new_messages,
       is_active = 1,
       last_seen_at = datetime('now'),
       updated_at = datetime('now')`
  ).bind(
    crypto.randomUUID(),
    userEmail,
    endpoint,
    p256dh,
    auth,
    notifyNewJobs,
    notifyNewMessages,
  ).run();
}

export async function deactivatePushSubscription(
  db: D1Database,
  staffEmail: string,
  endpoint: string,
): Promise<void> {
  const trimmed = endpoint.trim();
  if (!trimmed) return;

  await ensurePushTables(db);

  const userEmail = staffEmail.trim().toLowerCase();
  await db.prepare(
    `UPDATE push_subscriptions
     SET is_active = 0, updated_at = datetime('now')
     WHERE user_email = ? AND endpoint = ?`
  ).bind(userEmail, trimmed).run();
}

export async function getPushSubscriptionStatus(
  db: D1Database,
  staffEmail: string,
  endpoint?: string,
): Promise<{ subscribed: boolean; notifyNewJobs: boolean; notifyNewMessages: boolean }>{
  await ensurePushTables(db);

  const userEmail = staffEmail.trim().toLowerCase();
  const endpointTrimmed = (endpoint || '').trim();

  const row = endpointTrimmed
    ? await db.prepare(
        `SELECT notify_new_jobs, notify_new_messages
         FROM push_subscriptions
         WHERE user_email = ? AND endpoint = ? AND is_active = 1`
      ).bind(userEmail, endpointTrimmed).first<{ notify_new_jobs: number; notify_new_messages: number }>()
    : await db.prepare(
        `SELECT notify_new_jobs, notify_new_messages
         FROM push_subscriptions
         WHERE user_email = ? AND is_active = 1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      ).bind(userEmail).first<{ notify_new_jobs: number; notify_new_messages: number }>();

  if (!row) {
    return { subscribed: false, notifyNewJobs: true, notifyNewMessages: true };
  }

  return {
    subscribed: true,
    notifyNewJobs: row.notify_new_jobs === 1,
    notifyNewMessages: row.notify_new_messages === 1,
  };
}

export async function pullPendingPushNotifications(
  db: D1Database,
  staffEmail: string,
  endpoint: string,
  limit = 6,
): Promise<PendingPushNotification[]> {
  const trimmed = endpoint.trim();
  if (!trimmed) return [];
  await ensurePushTables(db);

  const userEmail = staffEmail.trim().toLowerCase();
  const limitClamped = Math.max(1, Math.min(20, limit));

  const sub = await db.prepare(
    `SELECT id
     FROM push_subscriptions
     WHERE user_email = ? AND endpoint = ? AND is_active = 1`
  ).bind(userEmail, trimmed).first<{ id: string }>();

  if (!sub?.id) return [];

  const pending = await db.prepare(
    `SELECT id, title, body, target_url, created_at
     FROM push_notification_queue
     WHERE subscription_id = ?
       AND delivered_at IS NULL
     ORDER BY datetime(created_at) ASC
     LIMIT ?`
  ).bind(sub.id, limitClamped).all<{ id: string; title: string; body: string | null; target_url: string; created_at: string }>();

  const rows = pending.results || [];
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    await db.prepare(
      `UPDATE push_notification_queue
       SET delivered_at = datetime('now')
       WHERE id IN (${ids.map(() => '?').join(',')})`
    ).bind(...ids).run();
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body || '',
    url: row.target_url,
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

  await ensurePushTables(db);

  const userEmail = staffEmail.trim().toLowerCase();
  const sub = await db.prepare(
    `SELECT id
     FROM push_subscriptions
     WHERE user_email = ? AND endpoint = ? AND is_active = 1`
  ).bind(userEmail, trimmed).first<{ id: string }>();

  if (!sub?.id) {
    return { ok: false, status: 404, queued: false };
  }

  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO push_notification_queue (id, subscription_id, event_type, title, body, target_url)
     VALUES (?, ?, 'new_message', ?, ?, ?)`
  ).bind(
    id,
    sub.id,
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
  await ensurePushTables(db);

  const type = event.type === 'test' ? 'new_message' : event.type;
  const title = event.title.trim() || 'Zenbooker update';
  const body = (event.body || '').trim() || 'Open the app for details.';
  const targetUrl = event.targetUrl.trim() || '/admin';

  const subs = await db.prepare(
    `SELECT id, endpoint
     FROM push_subscriptions
     WHERE is_active = 1
       AND (
         (? = 'new_job' AND notify_new_jobs = 1)
         OR (? = 'new_message' AND notify_new_messages = 1)
       )
     ORDER BY datetime(updated_at) DESC
     LIMIT 200`
  ).bind(type, type).all<{ id: string; endpoint: string }>();

  const rows = (subs.results || [])
    .map((r) => ({ id: (r.id || '').trim(), endpoint: (r.endpoint || '').trim() }))
    .filter((r) => r.id && r.endpoint);

  if (!rows.length) return;

  const inserts: D1PreparedStatement[] = [];
  for (const row of rows) {
    inserts.push(db.prepare(
      `INSERT INTO push_notification_queue (id, subscription_id, event_type, title, body, target_url)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      row.id,
      type,
      title,
      body,
      targetUrl,
    ));
  }
  await db.batch(inserts);

  await Promise.all(rows.map((row) => pingPushEndpoint(db, row.endpoint).catch(() => null)));
}

export async function sendNotification(type: string, data: unknown): Promise<void> {
  console.log('[notifications] send', { type, data });
}
