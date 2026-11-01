// src/utils/hostname-matcher.ts

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().trim().replace(/^www\./, "");
}

export function isValidHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  // Must have at least one dot, no spaces, valid chars only
  return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/.test(normalized);
}

export function hostnameMatchesRule(currentHostname: string, ruleHostname: string): boolean {
  const current = normalizeHostname(currentHostname);
  const rule = normalizeHostname(ruleHostname);
  return current === rule || current.endsWith("." + rule);
}

export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
