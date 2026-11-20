export const DEFAULT_PRODUCT_PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
      <rect width="400" height="400" fill="#F8FAFC"/>
      <rect x="32" y="32" width="336" height="336" rx="16" stroke="#E2E8F0" stroke-width="1.5" fill="#FFFFFF"/>
      <rect x="135" y="138" width="130" height="86" rx="10" stroke="#CBD5E1" stroke-width="2" fill="#F8FAFC"/>
      <circle cx="175" cy="181" r="20" stroke="#059669" stroke-width="2" stroke-opacity="0.55"/>
      <circle cx="225" cy="181" r="20" stroke="#059669" stroke-width="2" stroke-opacity="0.35"/>
      <path d="M150 248H250" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>
      <path d="M172 262H228" stroke="#E2E8F0" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  );

/**
 * Modular image URL resolver (R2-free Phase 1).
 * Centralizes image URL normalization so future CDN/proxy rules can be added in one place.
 */
export function getProductImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_PRODUCT_PLACEHOLDER_SVG;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return DEFAULT_PRODUCT_PLACEHOLDER_SVG;
  }
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }
  return DEFAULT_PRODUCT_PLACEHOLDER_SVG;
}

export function getProductGallery(primaryUrl?: string | null, gallery?: string[] | null): string[] {
  const seen = new Set<string>();
  const resolved: string[] = [];

  const pushIfValid = (url?: string | null) => {
    if (!url || typeof url !== 'string' || !url.trim()) return;
    const normalized = getProductImageUrl(url);
    if (normalized !== DEFAULT_PRODUCT_PLACEHOLDER_SVG && !seen.has(normalized)) {
      seen.add(normalized);
      resolved.push(normalized);
    }
  };

  pushIfValid(primaryUrl);
  if (Array.isArray(gallery)) {
    for (const item of gallery) {
      pushIfValid(item);
    }
  }

  if (resolved.length === 0) {
    resolved.push(DEFAULT_PRODUCT_PLACEHOLDER_SVG);
  }
  return resolved;
}
