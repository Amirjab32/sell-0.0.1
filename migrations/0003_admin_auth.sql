-- Private Admin Authentication & Session tables
-- Stores only salted PBKDF2-SHA256 password hashes and SHA-256 session token hashes (never plaintext secrets).

CREATE TABLE IF NOT EXISTS admin_credentials (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 100000,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
