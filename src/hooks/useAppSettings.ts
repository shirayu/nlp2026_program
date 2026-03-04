import { useEffect, useState } from "react";
import type { AppSettings } from "../types";

const APP_SETTINGS_STORAGE_KEY = "nlp2026-settings";

const DEFAULT_APP_SETTINGS: AppSettings = {
  showAuthors: true,
  useSlackAppLinks: true,
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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

    return {
      showAuthors: parseBoolean(parsed.showAuthors, DEFAULT_APP_SETTINGS.showAuthors),
      useSlackAppLinks: parseBoolean(parsed.useSlackAppLinks, DEFAULT_APP_SETTINGS.useSlackAppLinks),
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
  };
}

export const appSettingsStorageKey = APP_SETTINGS_STORAGE_KEY;
export const appSettingsStorage = {
  defaults: DEFAULT_APP_SETTINGS,
  parseAppSettings,
  readAppSettings,
};
