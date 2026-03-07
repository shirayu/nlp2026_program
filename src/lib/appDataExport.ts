import { ZOOM_IMPORT_HASHES } from "../constants";
import { appSettingsStorage } from "../hooks/useAppSettings";
import { bookmarksStorage } from "../hooks/useBookmarks";
import type { ExportPayload, VenueZoomUrls } from "../types";

const IMPORT_FRAGMENT_PREFIX = "import_settings=";
const IMPORT_ZOOM_FRAGMENT_PREFIX = "import_zoom_settings=";
const ZOOM_VENUE_KEYS = ["A", "B", "C", "P"] as const;

function toBase64url(json: string): string {
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(encoded: string): string {
  return atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
}

export function encodePayload(payload: ExportPayload): string {
  const sanitizedSettings = { ...payload.settings };
  Reflect.deleteProperty(sanitizedSettings, "venueZoomUrls");
  return toBase64url(
    JSON.stringify({
      ...payload,
      settings: sanitizedSettings,
    }),
  );
}

export function decodePayload(encoded: string): ExportPayload | null {
  try {
    const json = fromBase64url(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    const settings = appSettingsStorage.parseAppSettings(JSON.stringify(parsed.settings ?? null));
    const bookmarks = bookmarksStorage.parseBookmarks(JSON.stringify(parsed.bookmarks ?? null));

    return { settings, bookmarks };
  } catch {
    return null;
  }
}

export function buildExportUrl(payload: ExportPayload): string {
  const url = new URL(window.location.href);
  url.hash = `${IMPORT_FRAGMENT_PREFIX}${encodePayload(payload)}`;
  return url.toString();
}

export function extractImportFragment(): string | null {
  return extractByPrefix(IMPORT_FRAGMENT_PREFIX);
}

const IMPORT_PENDING_KEY = "import_settings_pending";
const IMPORT_ZOOM_PENDING_KEY = "import_zoom_settings_pending";

function extractByPrefix(prefix: string): string | null {
  const hash = window.location.hash.slice(1); // remove leading '#'
  if (!hash.startsWith(prefix)) return null;
  return hash.slice(prefix.length);
}

function stripByPrefix(prefix: string, pendingKey: string): void {
  if (window.location.hash.slice(1).startsWith(prefix)) {
    window.sessionStorage.setItem(pendingKey, "1");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

function clearPendingFlagByKey(pendingKey: string): void {
  window.sessionStorage.removeItem(pendingKey);
}

function isPendingByKey(pendingKey: string): boolean {
  return window.sessionStorage.getItem(pendingKey) === "1";
}

function isAllowedZoomImportUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (host === "zoom.us" || host.endsWith(".zoom.us")) && url.pathname.startsWith("/j/");
  } catch {
    return false;
  }
}

function hasOnlyAllowedZoomDomains(venueZoomUrls: VenueZoomUrls | undefined): boolean {
  if (!venueZoomUrls) return true;
  const values = ZOOM_VENUE_KEYS.map((key) => venueZoomUrls[key]).filter((value): value is string => Boolean(value));
  return values.every((value) => isAllowedZoomImportUrl(value));
}

function canonicalizeVenueZoomUrls(venueZoomUrls: VenueZoomUrls | undefined): string {
  const canonical = ZOOM_VENUE_KEYS.reduce(
    (acc, key) => {
      acc[key] = venueZoomUrls?.[key]?.trim() ?? "";
      return acc;
    },
    {} as Record<(typeof ZOOM_VENUE_KEYS)[number], string>,
  );
  return JSON.stringify(canonical);
}

function canonicalizeLegacyVenueZoomUrls(venueZoomUrls: VenueZoomUrls | undefined): string {
  return JSON.stringify({
    A: venueZoomUrls?.A?.trim() ?? "",
    B: venueZoomUrls?.B?.trim() ?? "",
  });
}

export async function buildZoomImportHash(venueZoomUrls: VenueZoomUrls | undefined): Promise<string> {
  const input = canonicalizeVenueZoomUrls(venueZoomUrls);
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex;
}

async function buildLegacyZoomImportHash(venueZoomUrls: VenueZoomUrls | undefined): Promise<string> {
  const input = canonicalizeLegacyVenueZoomUrls(venueZoomUrls);
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex;
}

export function stripImportFragment(): void {
  stripByPrefix(IMPORT_FRAGMENT_PREFIX, IMPORT_PENDING_KEY);
}

export function clearImportPendingFlag(): void {
  clearPendingFlagByKey(IMPORT_PENDING_KEY);
}

export function isImportPending(): boolean {
  return isPendingByKey(IMPORT_PENDING_KEY);
}

export function extractZoomImportFragment(): string | null {
  return extractByPrefix(IMPORT_ZOOM_FRAGMENT_PREFIX);
}

export async function decodeZoomPayload(encoded: string): Promise<VenueZoomUrls | undefined | null> {
  try {
    const json = fromBase64url(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    const venueZoomUrls = appSettingsStorage.parseAppSettings(
      JSON.stringify({ venueZoomUrls: (parsed as { venueZoomUrls?: unknown }).venueZoomUrls }),
    ).venueZoomUrls;

    if (!hasOnlyAllowedZoomDomains(venueZoomUrls)) return null;
    const allowedHashes = new Set(ZOOM_IMPORT_HASHES.map((value) => value.trim().toLowerCase()).filter(Boolean));
    if (allowedHashes.size > 0) {
      const actualHash = await buildZoomImportHash(venueZoomUrls);
      if (!allowedHashes.has(actualHash)) {
        const legacyHash = await buildLegacyZoomImportHash(venueZoomUrls);
        if (!allowedHashes.has(legacyHash)) return null;
      }
    }
    return venueZoomUrls;
  } catch {
    return null;
  }
}

export function stripZoomImportFragment(): void {
  stripByPrefix(IMPORT_ZOOM_FRAGMENT_PREFIX, IMPORT_ZOOM_PENDING_KEY);
}

export function clearZoomImportPendingFlag(): void {
  clearPendingFlagByKey(IMPORT_ZOOM_PENDING_KEY);
}

export function isZoomImportPending(): boolean {
  return isPendingByKey(IMPORT_ZOOM_PENDING_KEY);
}

export function isAnyImportPending(): boolean {
  return isImportPending() || isZoomImportPending();
}
