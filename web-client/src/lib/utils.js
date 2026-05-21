import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const CDN_BASE = import.meta.env.VITE_CLOUD_FRONT_URL || "";

/**
 * Convert an S3 object key to a full CDN URL.
 * Returns null/undefined as-is. Passes through absolute URLs unchanged.
 */
export function cdnUrl(key) {
  if (!key) return key;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const base = CDN_BASE.endsWith("/") ? CDN_BASE.slice(0, -1) : CDN_BASE;
  const path = key.startsWith("/") ? key.slice(1) : key;
  return `${base}/${path}`;
}

/**
 * Cleans up unresolved Handlebars templates variables for rendering.
 * Specifically replaces signature placeholders with a designated dashed box.
 * Other unresolved placeholders are stripped out.
 */
export const cleanContractHtml = (html) => {
  if (!html) return "";
  const blankSig = '<div style="height: 100px; width: 250px; border: 1px dashed #ccc; margin: 10px auto; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; background: #fafafa;">Chưa ký</div>';
  return html
    .replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (match, prefix, src, suffix) => `${prefix}${cdnUrl(src)}${suffix}`)
    .replace(/\{\{(?:customer_signature|manager_signature)\}\}/g, blankSig)
    .replace(/\{\{.*?\}\}/g, "");
};
