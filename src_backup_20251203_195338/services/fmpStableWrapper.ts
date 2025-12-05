// ============================================================
// FMP Stable URL wrapper (SAFE)
// ============================================================
// Central place to normalize any FMP URL to the Stable host.
// This is additive and does NOT enforce usage automatically —
// it simply provides a safe helper for all future code.
//
// NOTE: MarketAI is required to use FMP Stable endpoints ONLY.
// ============================================================

export function FMP_STABLE_URL(path: string): string {
  if (!path) return 'https://financialmodelingprep.com/stable';

  // If a full URL is provided, normalize to /stable
  if (path.startsWith('http')) {
    return path
      .replace('financialmodelingprep.com/stable/v3', 'financialmodelingprep.com/stable')
      .replace('financialmodelingprep.com/stable/v4', 'financialmodelingprep.com/stable')
      .replace('financialmodelingprep.com/api', 'financialmodelingprep.com/stable')
      .replace('/stable', '/stable')
      .replace('/stable', '/stable')
      .replace('/stable/', '/stable/')
      .replace('/stable/', '/stable/');
  }

  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return `https://financialmodelingprep.com/stable${path}`;
}

// Optional wrapper that logs legacy label for auditing
export function FMP_STABLE_WRAPPER(path: string, legacyLabel?: string): string {
  if (legacyLabel) {
    console.warn(`[FMP_STABLE_WRAPPER] Mapping legacy endpoint → stable: ${legacyLabel}`);
  }
  return FMP_STABLE_URL(path);
}
