import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const CDN_BASE = import.meta.env.VITE_CLOUD_FRONT_URL || "";

/**
 * Convert an S3 object key to a full CDN URL.
 * Returns null/undefined as-is. Passes through absolute URLs unchanged
 * (backward compat with old Cloudinary URLs still in DB).
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

/**
 * Parse a Google Maps URL to extract latitude and longitude.
 * Supports formats like:
 *   https://www.google.com/maps/place/.../@10.873,106.804,17z/...
 *   https://maps.google.com/?q=10.873,106.804
 *   https://goo.gl/maps/... (after redirect - same @lat,lng pattern)
 *
 * @param {string} url
 * @returns {{ lat: number, lng: number } | null}
 */
/**
 * Format an ISO date string to Vietnamese locale (dd/mm/yyyy).
 * Returns "—" for falsy values.
 */
export const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

export const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export function parseGoogleMapsUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Pattern 1: /@lat,lng in path
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern 2: ?q=lat,lng or ?ll=lat,lng
  const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  return null;
}
