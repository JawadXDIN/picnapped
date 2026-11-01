// src/utils/image-validator.ts
// Comprehensive image validation: format, size, MIME type, file signatures, and SVG security

export const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "data:", "blob:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}

export function isChromeUrl(url: string): boolean {
  return url.startsWith("chrome-extension://");
}

export function getMimeTypeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : null;
}

export function estimateDataUrlSize(dataUrl: string): number {
  const base64Part = dataUrl.split(",")[1] || "";
  return Math.round((base64Part.length * 3) / 4);
}

/**
 * Validates binary signature (magic bytes) from an ArrayBuffer
 */
export function validateImageSignature(buffer: ArrayBuffer): { valid: boolean; detectedType?: string } {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  if (bytes.length < 4) return { valid: false };

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { valid: true, detectedType: "image/png" };
  }

  // GIF: 47 49 46 38 ('GIF8')
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { valid: true, detectedType: "image/gif" };
  }

  // WebP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, detectedType: "image/webp" };
  }

  // SVG check (text based, starts with <?xml or <svg)
  try {
    const text = new TextDecoder().decode(bytes.slice(0, 16)).trim().toLowerCase();
    if (text.startsWith("<?xml") || text.startsWith("<svg") || text.startsWith("<!doctype svg")) {
      return { valid: true, detectedType: "image/svg+xml" };
    }
  } catch {
    // not text
  }

  return { valid: false };
}

/**
 * Sanitizes SVG data to prevent XSS / script injection
 */
export function sanitizeSvgDataUrl(dataUrl: string): string | null {
  try {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) return null;
    const base64Content = dataUrl.slice(commaIndex + 1);
    const decoded = atob(base64Content);

    // Reject dangerous tags and event handlers
    const lower = decoded.toLowerCase();
    if (
      lower.includes("<script") ||
      lower.includes("</script") ||
      lower.includes("javascript:") ||
      lower.includes("data:text/html") ||
      /\son[a-z]+\s*=/i.test(decoded) ||
      /<foreignobject/i.test(decoded)
    ) {
      return null;
    }

    return dataUrl;
  } catch {
    return null;
  }
}