import { useEffect, useState } from "react";
import { APP_LOCALSTORAGE_PREFIX } from "../constants";
import type { AppSettings, PresentationId, SessionId, VenueZoomUrls, ZoomCustomUrls } from "../types";

const APP_SETTINGS_STORAGE_KEY = `${APP_LOCALSTORAGE_PREFIX}settings`;

const DEFAULT_APP_SETTINGS: AppSettings = {
  showAuthors: true,
  useSlackAppLinks: true,
  includeSessionTitleForNoPresentationSessions: true,
  includeSessionTitleForPresentationSessions: false,
  showTimeAtPresentationLevel: false,
};
const ZOOM_VENUE_KEYS = ["A", "B", "C", "P"] as const;

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseVenueZoomUrls(value: unknown): VenueZoomUrls | undefined {
  if (!value || typeof value !== "object") return undefined;

  const parsed = ZOOM_VENUE_KEYS.reduce((acc, key) => {
    const v = parseNonEmptyString((value as Partial<Record<(typeof ZOOM_VENUE_KEYS)[number], unknown>>)[key]);
    if (v) acc[key] = v;
    return acc;
  }, {} as VenueZoomUrls);
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseIdMap<T extends string>(value: unknown): Record<T, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, raw]) => [key.trim(), parseNonEmptyString(raw)] as const)
    .filter(([key, parsed]) => key.length > 0 && Boolean(parsed))
    .map(([key, parsed]) => [key as T, parsed as string] as const);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Record<T, string>;
}

function parseZoomCustomUrls(value: unknown): ZoomCustomUrls | undefined {
  if (!value || typeof value !== "object") return undefined;

  const venues = parseVenueZoomUrls((value as { venues?: unknown }).venues);
  const sessions = parseIdMap<SessionId>((value as { sessions?: unknown }).sessions);
  const presentations = parseIdMap<PresentationId>((value as { presentations?: unknown }).presentations);

  if (!venues && !sessions && !presentations) return undefined;

  return {
    ...(venues ? { venues } : {}),
    ...(sessions ? { sessions } : {}),
    ...(presentations ? { presentations } : {}),
  };
}

function parseAppSettings(value: string | null): AppSettings {
  if (!value) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_APP_SETTINGS;
    }

    const zoomCustomUrls = parseZoomCustomUrls((parsed as { zoomCustomUrls?: unknown }).zoomCustomUrls);

    return {
      showAuthors: parseBoolean(parsed.showAuthors, DEFAULT_APP_SETTINGS.showAuthors),
      useSlackAppLinks: parseBoolean(parsed.useSlackAppLinks, DEFAULT_APP_SETTINGS.useSlackAppLinks),
      includeSessionTitleForNoPresentationSessions: parseBoolean(
        parsed.includeSessionTitleForNoPresentationSessions,
        DEFAULT_APP_SETTINGS.includeSessionTitleForNoPresentationSessions,
      ),
      includeSessionTitleForPresentationSessions: parseBoolean(
        parsed.includeSessionTitleForPresentationSessions,
        DEFAULT_APP_SETTINGS.includeSessionTitleForPresentationSessions,
      ),
      showTimeAtPresentationLevel: parseBoolean(
        parsed.showTimeAtPresentationLevel,
        DEFAULT_APP_SETTINGS.showTimeAtPresentationLevel,
      ),
      ...(zoomCustomUrls ? { zoomCustomUrls } : {}),
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function readAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }
  return parseAppSettings(window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY));
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => readAppSettings());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return {
    settings,
    setSettings,
    toggleShowAuthors: () =>
      setSettings((current) => ({
        ...current,
        showAuthors: !current.showAuthors,
      })),
    toggleUseSlackAppLinks: () =>
      setSettings((current) => ({
        ...current,
        useSlackAppLinks: !current.useSlackAppLinks,
      })),
    toggleIncludeSessionTitleForNoPresentationSessions: () =>
      setSettings((current) => ({
        ...current,
        includeSessionTitleForNoPresentationSessions: !current.includeSessionTitleForNoPresentationSessions,
      })),
    toggleIncludeSessionTitleForPresentationSessions: () =>
      setSettings((current) => ({
        ...current,
        includeSessionTitleForPresentationSessions: !current.includeSessionTitleForPresentationSessions,
      })),
    toggleShowTimeAtPresentationLevel: () =>
      setSettings((current) => ({
        ...current,
        showTimeAtPresentationLevel: !current.showTimeAtPresentationLevel,
      })),
  };
}

export const appSettingsStorageKey = APP_SETTINGS_STORAGE_KEY;
export const appSettingsStorage = {
  defaults: DEFAULT_APP_SETTINGS,
  parseAppSettings,
  readAppSettings,
};
