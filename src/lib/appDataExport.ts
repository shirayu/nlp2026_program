import { appSettingsStorage } from "../hooks/useAppSettings";
import { bookmarksStorage } from "../hooks/useBookmarks";
import type { ExportPayload } from "../types";

const IMPORT_FRAGMENT_PREFIX = "import_settings=";

function toBase64url(json: string): string {
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(encoded: string): string {
  return atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
}

export function encodePayload(payload: ExportPayload): string {
  return toBase64url(JSON.stringify(payload));
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
  const hash = window.location.hash.slice(1); // remove leading '#'
  if (!hash.startsWith(IMPORT_FRAGMENT_PREFIX)) return null;
  return hash.slice(IMPORT_FRAGMENT_PREFIX.length);
}

export function stripImportFragment(): void {
  if (window.location.hash.slice(1).startsWith(IMPORT_FRAGMENT_PREFIX)) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
