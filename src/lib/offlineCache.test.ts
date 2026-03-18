import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConferenceData, SessionId, SlackChannelRef } from "../types";
import {
  loadConferenceDataCache,
  loadSlackChannelsCache,
  saveConferenceDataCache,
  saveSlackChannelsCache,
} from "./offlineCache";

const conferenceDataKey = "nlp2026-offline-conference-data";
const slackChannelsKey = "nlp2026-offline-slack-channels";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createStorage(initial: Record<string, string> = {}): FakeStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

const exampleData: ConferenceData = {
  generated_at: "2026-03-08T10:00:00Z",
  persons: {},
  affiliations: {},
  rooms: {},
  sessions: {},
  presentations: {},
};

const exampleSlack: Partial<Record<SessionId, SlackChannelRef>> = {
  S1: { team: "T1", channel_id: "C1" },
};

describe("offlineCache", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("data.json キャッシュを保存・復元できる", () => {
    const storage = createStorage();
    vi.stubGlobal("window", { localStorage: storage });

    saveConferenceDataCache(exampleData);

    expect(loadConferenceDataCache()).toEqual(exampleData);
  });

  it("slack.json キャッシュを保存・復元できる", () => {
    const storage = createStorage();
    vi.stubGlobal("window", { localStorage: storage });

    saveSlackChannelsCache(exampleSlack);

    expect(loadSlackChannelsCache()).toEqual(exampleSlack);
  });

  it("壊れた JSON は null を返し、破損キーを削除する", () => {
    const storage = createStorage({
      [conferenceDataKey]: "{broken",
    });
    vi.stubGlobal("window", { localStorage: storage });

    expect(loadConferenceDataCache()).toBeNull();
    expect(storage.dump()[conferenceDataKey]).toBeUndefined();
  });

  it("schemaVersion が異なる場合は null を返す", () => {
    const storage = createStorage({
      [slackChannelsKey]: JSON.stringify({
        schemaVersion: 999,
        savedAt: "2026-03-08T00:00:00Z",
        payload: exampleSlack,
      }),
    });
    vi.stubGlobal("window", { localStorage: storage });

    expect(loadSlackChannelsCache()).toBeNull();
  });

  it("保存時の QuotaExceededError は握りつぶして継続する", () => {
    const storage = createStorage();
    const throwingStorage: FakeStorage = {
      ...storage,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    vi.stubGlobal("window", { localStorage: throwingStorage });

    expect(() => saveConferenceDataCache(exampleData)).not.toThrow();
  });
});
