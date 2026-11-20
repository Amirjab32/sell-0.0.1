import { constantTimeEqual, extractAdminSyncToken, verifySyncAuth } from './auth';
import type { D1DatabaseLike } from './db-types';

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 256;
const SESSION_BYTES = 32;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const textEncoder = new TextEncoder();

interface AdminCredentialRow {
  id: string;
  password_hash: string;
  salt: string;
  iterations: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function derivePasswordHashHex(
  password: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltCopy = new Uint8Array(saltBytes.length);
  saltCopy.set(saltBytes);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltCopy,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    DERIVED_KEY_BITS
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

async function hashSessionToken(rawToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(rawToken));
  return bytesToHex(new Uint8Array(digest));
}

export async function ensureAdminAuthTables(db: D1DatabaseLike): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_credentials (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        iterations INTEGER NOT NULL DEFAULT 100000,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT DEFAULT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at)')
    .run();
}

export async function isAdminPasswordConfigured(db: D1DatabaseLike): Promise<boolean> {
  await ensureAdminAuthTables(db);
  const row = await db
    .prepare('SELECT id FROM admin_credentials WHERE id = ? LIMIT 1')
    .bind('primary')
    .first<{ id: string }>();
  return Boolean(row);
}

function validatePasswordPolicy(rawPassword: unknown): { ok: true; password: string } | { ok: false; error: string } {
  if (typeof rawPassword !== 'string' || !rawPassword) {
    return { ok: false, error: 'وارد کردن رمز عبور الزامی است.' };
  }
  if (rawPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' };
  }
  if (rawPassword.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: 'طول رمز عبور بیش از حد مجاز است.' };
  }
  return { ok: true, password: rawPassword };
}

async function createSession(db: D1DatabaseLike): Promise<{ sessionToken: string; expiresAt: string }> {
  const rawBytes = new Uint8Array(SESSION_BYTES);
  crypto.getRandomValues(rawBytes);
  const sessionToken = bytesToBase64Url(rawBytes);
  const tokenHash = await hashSessionToken(sessionToken);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  // Prune expired sessions opportunistically
  await db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now.toISOString()).run();

  await db
    .prepare('INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, now.toISOString(), expiresAt)
    .run();

  return { sessionToken, expiresAt };
}

export async function setupInitialAdminPassword(
  db: D1DatabaseLike,
  rawPassword: unknown
): Promise<
  | { ok: true; sessionToken: string; expiresAt: string }
  | { ok: false; status: 400 | 409; error: string }
> {
  await ensureAdminAuthTables(db);

  const policy = validatePasswordPolicy(rawPassword);
  if (policy.ok === false) {
    return { ok: false, status: 400, error: policy.error };
  }

  const saltBytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(saltBytes);
  const saltHex = bytesToHex(saltBytes);
  const passwordHashHex = await derivePasswordHashHex(policy.password, saltBytes, PBKDF2_ITERATIONS);
  const now = new Date().toISOString();

  // Atomic insert ensures an already-configured password can never be overwritten via setup
  const insertRes = await db
    .prepare(
      `INSERT OR IGNORE INTO admin_credentials (
        id, password_hash, salt, iterations, failed_attempts, locked_until, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`
    )
    .bind('primary', passwordHashHex, saltHex, PBKDF2_ITERATIONS, now, now)
    .run();

  if (Number(insertRes.meta.changes ?? 0) === 0) {
    return {
      ok: false,
      status: 409,
      error: 'رمز عبور مدیر قبلاً تنظیم شده است. لطفاً با رمز خود وارد شوید.',
    };
  }

  const session = await createSession(db);
  return { ok: true, ...session };
}

export async function loginWithAdminPassword(
  db: D1DatabaseLike,
  rawPassword: unknown
): Promise<
  | { ok: true; sessionToken: string; expiresAt: string }
  | { ok: false; status: 400 | 401 | 429; error: string }
> {
  await ensureAdminAuthTables(db);

  const cred = await db
    .prepare(
      'SELECT id, password_hash, salt, iterations, failed_attempts, locked_until, created_at, updated_at FROM admin_credentials WHERE id = ? LIMIT 1'
    )
    .bind('primary')
    .first<AdminCredentialRow>();

  if (!cred) {
    return {
      ok: false,
      status: 400,
      error: 'هنوز رمز عبور مدیر تنظیم نشده است.',
    };
  }

  const nowMs = Date.now();
  if (cred.locked_until) {
    const lockedUntilMs = Date.parse(cred.locked_until);
    if (Number.isFinite(lockedUntilMs) && lockedUntilMs > nowMs) {
      const remainingMinutes = Math.max(1, Math.ceil((lockedUntilMs - nowMs) / 60000));
      return {
        ok: false,
        status: 429,
        error: `به دلیل تلاش‌های ناموفق متعدد، ورود موقتاً مسدود است. لطفاً ${remainingMinutes} دقیقه دیگر تلاش کنید.`,
      };
    }
  }

  if (typeof rawPassword !== 'string' || !rawPassword) {
    return { ok: false, status: 401, error: 'لطفاً رمز عبور را وارد کنید.' };
  }

  const candidateHashHex = await derivePasswordHashHex(
    rawPassword,
    hexToBytes(cred.salt),
    cred.iterations
  );

  if (!constantTimeEqual(candidateHashHex, cred.password_hash)) {
    const nextAttempts = Number(cred.failed_attempts ?? 0) + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
    const nextLockedUntil = shouldLock
      ? new Date(nowMs + LOCKOUT_DURATION_MS).toISOString()
      : null;

    await db
      .prepare('UPDATE admin_credentials SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?')
      .bind(shouldLock ? 0 : nextAttempts, nextLockedUntil, new Date(nowMs).toISOString(), 'primary')
      .run();

    if (shouldLock) {
      return {
        ok: false,
        status: 429,
        error: 'به دلیل ۵ بار رمز اشتباه، ورود برای ۱۵ دقیقه مسدود شد.',
      };
    }

    return { ok: false, status: 401, error: 'رمز عبور اشتباه است.' };
  }

  // Successful login resets brute-force counters
  await db
    .prepare('UPDATE admin_credentials SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?')
    .bind(new Date(nowMs).toISOString(), 'primary')
    .run();

  const session = await createSession(db);
  return { ok: true, ...session };
}

export async function changeAdminPassword(
  db: D1DatabaseLike,
  rawCurrentPassword: unknown,
  rawNewPassword: unknown,
  keepSessionToken?: string | null
): Promise<{ ok: true } | { ok: false; status: 400 | 401; error: string }> {
  await ensureAdminAuthTables(db);

  const cred = await db
    .prepare('SELECT id, password_hash, salt, iterations FROM admin_credentials WHERE id = ? LIMIT 1')
    .bind('primary')
    .first<Pick<AdminCredentialRow, 'id' | 'password_hash' | 'salt' | 'iterations'>>();

  if (!cred) {
    return { ok: false, status: 400, error: 'رمز عبور مدیر هنوز تنظیم نشده است.' };
  }

  if (typeof rawCurrentPassword !== 'string' || !rawCurrentPassword) {
    return { ok: false, status: 401, error: 'رمز عبور فعلی را وارد کنید.' };
  }

  const currentHashHex = await derivePasswordHashHex(
    rawCurrentPassword,
    hexToBytes(cred.salt),
    cred.iterations
  );
  if (!constantTimeEqual(currentHashHex, cred.password_hash)) {
    return { ok: false, status: 401, error: 'رمز عبور فعلی نادرست است.' };
  }

  const policy = validatePasswordPolicy(rawNewPassword);
  if (policy.ok === false) {
    return { ok: false, status: 400, error: policy.error };
  }

  const newSaltBytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(newSaltBytes);
  const newSaltHex = bytesToHex(newSaltBytes);
  const newHashHex = await derivePasswordHashHex(policy.password, newSaltBytes, PBKDF2_ITERATIONS);
  const now = new Date().toISOString();

  await db
    .prepare(
      'UPDATE admin_credentials SET password_hash = ?, salt = ?, iterations = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?'
    )
    .bind(newHashHex, newSaltHex, PBKDF2_ITERATIONS, now, 'primary')
    .run();

  // Revoke all other active sessions
  if (keepSessionToken) {
    const keepHash = await hashSessionToken(keepSessionToken);
    await db.prepare('DELETE FROM admin_sessions WHERE token_hash != ?').bind(keepHash).run();
  } else {
    await db.prepare('DELETE FROM admin_sessions').run();
  }

  return { ok: true };
}

export function extractSessionToken(headers: Headers): string | null {
  const xSession = headers.get('X-Admin-Session');
  if (xSession && xSession.trim()) {
    return xSession.trim();
  }
  return extractAdminSyncToken(headers);
}

export async function logoutAdminSession(db: D1DatabaseLike, headers: Headers): Promise<void> {
  await ensureAdminAuthTables(db);
  const token = extractSessionToken(headers);
  if (!token) return;
  const tokenHash = await hashSessionToken(token);
  await db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function verifyAdminAccess(
  headers: Headers,
  db: D1DatabaseLike,
  configuredSyncToken?: string
): Promise<{ authorized: true } | { authorized: false; status: 401; error: string }> {
  await ensureAdminAuthTables(db);

  const candidateToken = extractSessionToken(headers);
  if (candidateToken) {
    const tokenHash = await hashSessionToken(candidateToken);
    const nowIso = new Date().toISOString();
    const sessionRow = await db
      .prepare('SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1')
      .bind(tokenHash, nowIso)
      .first<{ token_hash: string }>();

    if (sessionRow) {
      return { authorized: true };
    }
  }

  // Also allow configured server-to-server ADMIN_SYNC_TOKEN if present
  if (configuredSyncToken?.trim()) {
    const syncCheck = verifySyncAuth(headers, configuredSyncToken);
    if (syncCheck.authorized) {
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    status: 401,
    error: 'دسترسی غیرمجاز: لطفاً ابتدا وارد پنل مدیریت شوید.',
  };
}
