const textEncoder = new TextEncoder();

/**
 * Constant-time string comparison over UTF-8 byte sequences.
 * Works identically in Cloudflare Workers V8 and Node.js without leaking token length.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bytesA = textEncoder.encode(a);
  const bytesB = textEncoder.encode(b);
  const maxLen = Math.max(bytesA.length, bytesB.length);
  let diff = bytesA.length ^ bytesB.length;
  for (let i = 0; i < maxLen; i++) {
    const byteA = i < bytesA.length ? bytesA[i] : 0;
    const byteB = i < bytesB.length ? bytesB[i] : 0;
    diff |= byteA ^ byteB;
  }
  return diff === 0;
}

export function extractAdminSyncToken(headers: Headers): string | null {
  const xAdminToken = headers.get('X-Admin-Sync-Token');
  if (xAdminToken && xAdminToken.trim()) {
    return xAdminToken.trim();
  }

  const authHeader = headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }

  return null;
}

export type SyncAuthCheckResult =
  | { authorized: true }
  | { authorized: false; status: 401 | 503; error: string };

export function verifySyncAuth(
  headers: Headers,
  configuredAdminToken?: string
): SyncAuthCheckResult {
  const expected = configuredAdminToken?.trim();
  if (!expected) {
    return {
      authorized: false,
      status: 503,
      error: 'ADMIN_SYNC_TOKEN is not configured on the server.',
    };
  }

  const provided = extractAdminSyncToken(headers);
  if (!provided || !constantTimeEqual(provided, expected)) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: invalid or missing sync token.',
    };
  }

  return { authorized: true };
}
