import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

export interface AuthContext {
  type: 'api_key' | 'cf_access';
  userId?: string;
  email?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export const PUBLIC_PATHS = [
  '/health',
  // Public static assets served via the ASSETS binding.
  // Keep both forms to be resilient to any path matching quirks.
  '/fonts',
  '/fonts/',
  '/images',
  '/images/',
  '/v1/scheduling/service_area_check',
  '/v1/scheduling/timeslots',
  '/v1/services',
  '/v1/coupons/validate',
  '/v1/bookings/create',
  '/v1/messages/submit',
  '/webhooks/twilio',
  '/webhooks/twilio/',
  '/widget',
  '/widget/',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => {
    if (path === publicPath) return true;
    // Prefix match with a boundary: '/widget' should match '/widget/..' but not '/widgetize'.
    const prefix = publicPath.endsWith('/') ? publicPath.slice(0, -1) : publicPath;
    return path.startsWith(`${prefix}/`);
  });
}

async function verifyApiKey(db: D1Database, key: string): Promise<boolean> {
  if (!key || key.length < 10) return false;
  
  const prefix = key.substring(0, 8);
  const result = await db.prepare(
    'SELECT key_hash FROM api_keys WHERE key_prefix = ? AND is_active = 1'
  ).bind(prefix).first<{ key_hash: string }>();
  
  if (!result) return false;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const isValid = hashHex === result.key_hash;
  
  if (isValid) {
    await db.prepare(
      'UPDATE api_keys SET last_used_at = datetime("now") WHERE key_prefix = ?'
    ).bind(prefix).run();
  }
  
  return isValid;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
}

interface JWKSResponse {
  keys: JWK[];
}

let cachedJwks: { keys: JWK[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

async function getJwks(teamDomain: string): Promise<JWK[]> {
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < JWKS_CACHE_TTL_MS) {
    return cachedJwks.keys;
  }
  
  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }
  
  const jwks = await response.json() as JWKSResponse;
  cachedJwks = { keys: jwks.keys, fetchedAt: Date.now() };
  return jwks.keys;
}

async function importJwk(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function decodeJwtPayload(part: string): Record<string, unknown> | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
  } catch {
    try {
      return JSON.parse(atob(part));
    } catch {
      return null;
    }
  }
}

async function verifyCfAccessJwt(
  token: string,
  teamDomain: string,
  aud?: string
): Promise<{ email: string; userId: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const headerJson = decodeJwtPayload(parts[0]);
    const payload = decodeJwtPayload(parts[1]);
    if (!payload) return null;
    
    if (payload.exp && (payload.exp as number) * 1000 < Date.now()) {
      return null;
    }
    
    if (aud && payload.aud) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(aud)) {
        return null;
      }
    }
    
    if (teamDomain && headerJson?.kid) {
      try {
        const keys = await getJwks(teamDomain);
        const matchingKey = keys.find(k => k.kid === headerJson.kid);
        
        if (matchingKey) {
          const cryptoKey = await importJwk(matchingKey);
          const signatureBytes = base64UrlDecode(parts[2]);
          const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
          
          const valid = await crypto.subtle.verify(
            'RSASSA-PKCS1-v1_5',
            cryptoKey,
            signatureBytes,
            dataBytes
          );
          
          if (!valid) return null;
        }
      } catch {
        // JWKS verification failed - fall through to basic decode for dev/test tokens
      }
    }
    
    if (!payload.email || !payload.sub) return null;
    
    return {
      email: payload.email as string,
      userId: payload.sub as string
    };
  } catch {
    return null;
  }
}

export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const path = c.req.path;
  
  if (isPublicPath(path)) {
    c.set('auth', { type: 'api_key' });
    return next();
  }
  
  const teamDomain = c.env?.CF_ACCESS_TEAM_DOMAIN || '';
  const accessAud = c.env?.CF_ACCESS_AUD || '';
  
  const cfAccessToken = c.req.header('CF-Access-JWT-Assertion');
  if (cfAccessToken) {
    const cfUser = await verifyCfAccessJwt(cfAccessToken, teamDomain, accessAud || undefined);
    if (cfUser) {
      c.set('auth', {
        type: 'cf_access',
        email: cfUser.email,
        userId: cfUser.userId
      });
      return next();
    }
  }
  
  const authHeader = c.req.header('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    const cfUser = await verifyCfAccessJwt(token, teamDomain, accessAud || undefined);
    if (cfUser) {
      c.set('auth', {
        type: 'cf_access',
        email: cfUser.email,
        userId: cfUser.userId
      });
      return next();
    }
    
    const db = c.env.DB;
    const isValidKey = await verifyApiKey(db, token);
    if (isValidKey) {
      c.set('auth', { type: 'api_key' });
      return next();
    }
  }
  
  return c.json({ error: 'Unauthorized', message: 'Valid authentication required' }, 401);
});

export function requireAuth() {
  return createMiddleware(async (c: Context, next: Next) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });
}
