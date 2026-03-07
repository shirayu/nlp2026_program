import { useEffect, useState } from "react";
import { APP_LOCALSTORAGE_PREFIX } from "../constants";
import type { AppSettings, VenueZoomUrls } from "../types";

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

function parseAppSettings(value: string | null): AppSettings {
  if (!value) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_APP_SETTINGS;
    }

    const venueZoomUrls = parseVenueZoomUrls((parsed as { venueZoomUrls?: unknown }).venueZoomUrls);

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
      ...(venueZoomUrls ? { venueZoomUrls } : {}),
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
