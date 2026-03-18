import { APP_LOCALSTORAGE_PREFIX } from "../constants";
import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

const OFFLINE_CACHE_SCHEMA_VERSION = 1;
const CONFERENCE_DATA_CACHE_KEY = `${APP_LOCALSTORAGE_PREFIX}offline-conference-data`;
const SLACK_CHANNELS_CACHE_KEY = `${APP_LOCALSTORAGE_PREFIX}offline-slack-channels`;

type CacheEnvelope<T> = {
  schemaVersion: number;
  savedAt: string;
  payload: T;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

function parseCacheEnvelope<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (parsed?.schemaVersion !== OFFLINE_CACHE_SCHEMA_VERSION) return null;
    return parsed.payload ?? null;
  } catch {
    return null;
  }
}

function readCache<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(key);
  const parsed = parseCacheEnvelope<T>(raw);
  if (raw !== null && parsed === null) {
    window.localStorage.removeItem(key);
  }
  return parsed;
}

function writeCache<T>(key: string, payload: T): void {
  if (!canUseLocalStorage()) return;
  const envelope: CacheEnvelope<T> = {
    schemaVersion: OFFLINE_CACHE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    payload,
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // 容量不足などの保存失敗は非致命として握りつぶす。
  }
}

export function loadConferenceDataCache(): ConferenceData | null {
  return readCache<ConferenceData>(CONFERENCE_DATA_CACHE_KEY);
}

export function saveConferenceDataCache(data: ConferenceData): void {
  writeCache(CONFERENCE_DATA_CACHE_KEY, data);
}

export function loadSlackChannelsCache(): Partial<Record<SessionId, SlackChannelRef>> | null {
  return readCache<Partial<Record<SessionId, SlackChannelRef>>>(SLACK_CHANNELS_CACHE_KEY);
}

export function saveSlackChannelsCache(channels: Partial<Record<SessionId, SlackChannelRef>>): void {
  writeCache(SLACK_CHANNELS_CACHE_KEY, channels);
}
