import { appSettingsStorage } from "../hooks/useAppSettings";
import { bookmarksStorage } from "../hooks/useBookmarks";
import type { ExportPayload, VenueZoomUrls } from "../types";

const IMPORT_FRAGMENT_PREFIX = "import_settings=";
const IMPORT_ZOOM_FRAGMENT_PREFIX = "import_zoom_settings=";

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

export function decodeZoomPayload(encoded: string): VenueZoomUrls | undefined | null {
  try {
    const json = fromBase64url(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    return appSettingsStorage.parseAppSettings(
      JSON.stringify({ venueZoomUrls: (parsed as { venueZoomUrls?: unknown }).venueZoomUrls }),
    ).venueZoomUrls;
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
