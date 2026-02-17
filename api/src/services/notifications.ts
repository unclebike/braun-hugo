import { webcrypto } from 'crypto';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPreferences {
  notifyNewJobs: boolean;
  notifyNewMessages: boolean;
}

export interface PushEvent {
  type: 'new_job' | 'new_message';
  title: string;
  body?: string;
  url: string;
}

export async function getPushVapidPublicKey(db: D1Database): Promise<string> {
  const setting = await db.prepare("SELECT value FROM settings WHERE key = 'web_push_vapid'").first<{ value: string }>();
  if (!setting?.value) throw new Error('VAPID keys not configured');
  
  try {
    const vapid = JSON.parse(setting.value) as { publicKey?: string };
    if (!vapid.publicKey) throw new Error('Missing publicKey');
    return vapid.publicKey;
  } catch {
    throw new Error('Invalid VAPID configuration');
  }
}

export async function upsertPushSubscription(
  db: D1Database,
  userEmail: string,
  subscription: PushSubscription,
  preferences: PushPreferences
): Promise<void> {
  const id = crypto.randomUUID();
  
  await db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions
    (id, user_email, endpoint, p256dh, auth, notify_new_jobs, notify_new_messages, is_active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).bind(
    id,
    userEmail,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    preferences.notifyNewJobs ? 1 : 0,
    preferences.notifyNewMessages ? 1 : 0
  ).run();
}

export async function deactivatePushSubscription(
  db: D1Database,
  userEmail: string,
  endpoint: string
): Promise<void> {
  await db.prepare(`
    UPDATE push_subscriptions
    SET is_active = 0, updated_at = datetime('now')
    WHERE user_email = ? AND endpoint = ?
  `).bind(userEmail, endpoint).run();
}

export async function getPushSubscriptionStatus(
  db: D1Database,
  userEmail: string,
  endpoint?: string
): Promise<{ subscribed: boolean; preferences?: PushPreferences }> {
  let query = 'SELECT notify_new_jobs, notify_new_messages FROM push_subscriptions WHERE user_email = ? AND is_active = 1';
  let params: any[] = [userEmail];
  
  if (endpoint) {
    query += ' AND endpoint = ?';
    params.push(endpoint);
  }
  
  const result = await db.prepare(query).bind(...params).first<{ notify_new_jobs: number; notify_new_messages: number }>();
  
  if (!result) {
    return { subscribed: false };
  }
  
  return {
    subscribed: true,
    preferences: {
      notifyNewJobs: result.notify_new_jobs === 1,
      notifyNewMessages: result.notify_new_messages === 1,
    },
  };
}

export async function pullPendingPushNotifications(
  db: D1Database,
  userEmail: string,
  endpoint: string,
  limit: number = 6
): Promise<Array<{ id: string; title: string; body?: string; url: string }>> {
  const subscriptions = await db.prepare(`
    SELECT id FROM push_subscriptions
    WHERE user_email = ? AND endpoint = ? AND is_active = 1
  `).bind(userEmail, endpoint).all<{ id: string }>();
  
  if (!subscriptions.results || subscriptions.results.length === 0) {
    return [];
  }
  
  const subIds = subscriptions.results.map(s => s.id);
  
  const notifications = await db.prepare(`
    SELECT id, title, body, target_url as url
    FROM push_notification_queue
    WHERE subscription_id IN (${subIds.map(() => '?').join(',')})
    AND delivered_at IS NULL
    LIMIT ?
  `).bind(...subIds, limit).all<{ id: string; title: string; body?: string; url: string }>();
  
  // Mark as delivered
  if (notifications.results && notifications.results.length > 0) {
    const notifIds = notifications.results.map(n => n.id);
    await db.prepare(`
      UPDATE push_notification_queue
      SET delivered_at = datetime('now')
      WHERE id IN (${notifIds.map(() => '?').join(',')})
    `).bind(...notifIds).run();
  }
  
  return notifications.results || [];
}

export async function enqueueAndDispatchPushEvent(db: D1Database, event: PushEvent): Promise<void> {
  const subscriptions = await db.prepare(`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE is_active = 1
    AND (
      (? = 'new_job' AND notify_new_jobs = 1)
      OR (? = 'new_message' AND notify_new_messages = 1)
    )
  `).bind(event.type, event.type).all<{ id: string; endpoint: string; p256dh: string; auth: string }>();
  
  if (!subscriptions.results) return;
  
  for (const sub of subscriptions.results) {
    const notifId = crypto.randomUUID();
    
    await db.prepare(`
      INSERT INTO push_notification_queue
      (id, subscription_id, event_type, title, body, target_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      notifId,
      sub.id,
      event.type,
      event.title,
      event.body || null,
      event.url
    ).run();
    
    await dispatchWebPushPing(sub.endpoint, sub.p256dh, sub.auth);
  }
}

async function dispatchWebPushPing(endpoint: string, p256dh: string, auth: string): Promise<void> {
  try {
    const vapidSetting = await globalThis.VAPID_KEYS;
    if (!vapidSetting) return;
    
    let vapid: any;
    try {
      vapid = JSON.parse(vapidSetting);
    } catch {
      return;
    }
    
    if (!vapid.publicKey || !vapid.privateKey) return;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Length': '0',
    };
    
    headers['Authorization'] = `vapid t=${vapid.publicKey},k=${vapid.privateKey}`;
    
    await fetch(endpoint, {
      method: 'POST',
      headers,
      body: '',
    });
  } catch {
    console.error('[push] ping failed');
  }
}

export async function enqueueTestPushNotificationAndPing(
  db: D1Database,
  userEmail: string,
  endpoint: string
): Promise<{ status: number; message: string }> {
  const sub = await db.prepare(`
    SELECT id, p256dh, auth FROM push_subscriptions
    WHERE user_email = ? AND endpoint = ? AND is_active = 1
  `).bind(userEmail, endpoint).first<{ id: string; p256dh: string; auth: string }>();
  
  if (!sub) {
    return { status: 404, message: 'Subscription not found' };
  }
  
  const notifId = crypto.randomUUID();
  
  await db.prepare(`
    INSERT INTO push_notification_queue
    (id, subscription_id, event_type, title, body, target_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    notifId,
    sub.id,
    'new_message',
    'Test Notification',
    'This is a test push notification',
    '/admin'
  ).run();
  
  await dispatchWebPushPing(endpoint, sub.p256dh, sub.auth);
  
  return { status: 200, message: 'Test notification queued and ping sent' };
}
