/**
 * Administrator authentication.
 *
 * - The admin password comes from ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH).
 *   There is no default password: if neither variable is set, login is
 *   disabled and the API reports a setup requirement.
 * - Sessions are stateless, HMAC-signed, httpOnly cookies with an expiry.
 */
import crypto from 'node:crypto';

export const ADMIN_COOKIE = 'meher_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const LOGIN_MAX_ATTEMPTS = 8;

function scrypt(password, salt) {
  return crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
}

function parseHash(value) {
  // Format: scrypt:<saltHex>:<hashHex>
  const parts = String(value).split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return null;
  return { salt: Buffer.from(parts[1], 'hex'), hash: Buffer.from(parts[2], 'hex') };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scrypt(password, salt).toString('hex')}`;
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      out[key] = part.slice(idx + 1).trim();
    }
  }
  return out;
}

export function createAuth(env = process.env) {
  const configuredSecret = typeof env.SESSION_SECRET === 'string' ? env.SESSION_SECRET.trim() : '';
  const secret = configuredSecret.length >= 16 ? configuredSecret : crypto.randomBytes(32).toString('hex');
  const ephemeralSecret = configuredSecret.length < 16;

  const rawPassword = typeof env.ADMIN_PASSWORD === 'string' ? env.ADMIN_PASSWORD : '';
  const rawHash = typeof env.ADMIN_PASSWORD_HASH === 'string' ? env.ADMIN_PASSWORD_HASH.trim() : '';

  let credential = null;
  let setupMessage = '';
  if (rawHash) {
    credential = parseHash(rawHash);
    if (!credential) setupMessage = 'ADMIN_PASSWORD_HASH is not a valid scrypt hash.';
  } else if (rawPassword) {
    if (rawPassword.length < 10) {
      setupMessage = 'ADMIN_PASSWORD must be at least 10 characters long.';
    } else {
      credential = { salt: crypto.randomBytes(16), hash: null, plain: rawPassword };
    }
  } else {
    setupMessage =
      'Administrator login is not configured. Set ADMIN_PASSWORD (10+ characters) and SESSION_SECRET in the environment.';
  }

  const loginAttempts = new Map();

  function verifyPassword(password) {
    if (!credential || typeof password !== 'string' || password.length === 0) return false;
    let candidate;
    let expected;
    if (credential.plain !== undefined) {
      candidate = crypto.createHash('sha256').update(password).digest();
      expected = crypto.createHash('sha256').update(credential.plain).digest();
    } else {
      candidate = scrypt(password, credential.salt);
      expected = credential.hash;
    }
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  }

  function sign(value) {
    return crypto.createHmac('sha256', secret).update(value).digest('base64url');
  }

  function issueToken() {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'admin', iat: Date.now(), exp: Date.now() + SESSION_TTL_MS }),
    ).toString('base64url');
    return `${payload}.${sign(payload)}`;
  }

  function verifyToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (!data || data.sub !== 'admin' || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
      return data;
    } catch {
      return null;
    }
  }

  function sessionFromRequest(req) {
    const cookies = parseCookies(req.headers?.cookie);
    return verifyToken(cookies[ADMIN_COOKIE]);
  }

  function rateLimit(ip) {
    const now = Date.now();
    const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + LOGIN_WINDOW_MS;
    }
    entry.count += 1;
    loginAttempts.set(ip, entry);
    return entry.count <= LOGIN_MAX_ATTEMPTS;
  }

  function resetRateLimit(ip) {
    loginAttempts.delete(ip);
  }

  function cookieOptions(req) {
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: Boolean(secure),
      path: '/',
    };
  }

  function setSessionCookie(req, res, token) {
    res.cookie(ADMIN_COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_TTL_MS });
  }

  function clearSessionCookie(req, res) {
    res.clearCookie(ADMIN_COOKIE, cookieOptions(req));
  }

  return {
    isConfigured: Boolean(credential),
    setupMessage,
    ephemeralSecret,
    verifyPassword,
    issueToken,
    verifyToken,
    sessionFromRequest,
    rateLimit,
    resetRateLimit,
    setSessionCookie,
    clearSessionCookie,
    requireAdmin(req, res, next) {
      if (!sessionFromRequest(req)) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      next();
    },
  };
}
