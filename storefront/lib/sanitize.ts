import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML to prevent XSS while preserving safe formatting tags.
 * Uses DOMPurify with the HTML profile (strips scripts and event handlers).
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}

/**
 * Safely serialize data for JSON-LD script tags.
 * Escapes `</script>` sequences to prevent script tag breakout.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
}
