const toHex = (bytes) => {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};
const signPayload = async (secret, payload) => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return toHex(new Uint8Array(signature));
};
export async function triggerWebhook(db, eventType, payload) {
    const result = await db.prepare(`SELECT id, url, event_type, secret
     FROM webhooks
     WHERE is_active = 1
       AND event_type = ?`).bind(eventType).all();
    const body = JSON.stringify({ event_type: eventType, payload, sent_at: new Date().toISOString() });
    for (const hook of result.results || []) {
        try {
            const signature = hook.secret ? await signPayload(hook.secret, body) : '';
            await fetch(hook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': hook.event_type,
                    'X-Webhook-Signature': signature,
                },
                body,
            });
        }
        catch (error) {
            console.error('Webhook delivery failed', {
                webhook_id: hook.id,
                event_type: eventType,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
//# sourceMappingURL=webhooks.js.map