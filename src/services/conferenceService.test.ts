import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConferenceData, fetchSessionSlackChannels } from "./conferenceService";

type EnvSnapshot = Record<string, string | boolean | undefined>;

const ENV_KEYS = [
  "BASE_URL",
  "VITE_CONFERENCE_DATA_FILE",
  "VITE_SESSION_SLACK_FILE",
  "VITE_DATA_VERSION",
  "VITE_SLACK_VERSION",
  "VITE_BUILD_DATE",
  "VITE_BUILD_HASH",
] as const;

function setEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  const env = import.meta.env as unknown as Record<string, string | boolean | undefined>;
  for (const key of ENV_KEYS) {
    if (key in overrides) {
      env[key] = overrides[key];
    }
  }
}

function snapshotEnv(): EnvSnapshot {
  const env = import.meta.env as unknown as Record<string, string | boolean | undefined>;
  return Object.fromEntries(ENV_KEYS.map((key) => [key, env[key]]));
}

function restoreEnv(snapshot: EnvSnapshot) {
  const env = import.meta.env as unknown as Record<string, string | boolean | undefined>;
  for (const key of ENV_KEYS) {
    env[key] = snapshot[key];
  }
}

describe("conferenceService", () => {
  const originalEnv = snapshotEnv();

  afterEach(() => {
    restoreEnv(originalEnv);
    vi.restoreAllMocks();
  });

  it("data.json は VITE_DATA_VERSION を v に使う", async () => {
    setEnv({
      BASE_URL: "/base/",
      VITE_CONFERENCE_DATA_FILE: "data.json",
      VITE_DATA_VERSION: "data-hash-1",
    });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await fetchConferenceData();

    expect(fetchMock).toHaveBeenCalledWith("/base/data.json?v=data-hash-1");
  });

  it("slack.json は VITE_SLACK_VERSION を v に使う", async () => {
    setEnv({
      BASE_URL: "/base/",
      VITE_SESSION_SLACK_FILE: "slack.json",
      VITE_SLACK_VERSION: "slack-hash-1",
    });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await fetchSessionSlackChannels();

    expect(fetchMock).toHaveBeenCalledWith("/base/slack.json?v=slack-hash-1");
  });

  it("明示バージョンがない場合は build 値にフォールバックする", async () => {
    setEnv({
      BASE_URL: "/base/",
      VITE_CONFERENCE_DATA_FILE: "data.json",
      VITE_DATA_VERSION: "",
      VITE_BUILD_DATE: "2026-03-05T11:00:00Z",
      VITE_BUILD_HASH: "",
    });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await fetchConferenceData();

    expect(fetchMock).toHaveBeenCalledWith("/base/data.json?v=2026-03-05T11%3A00%3A00Z");
  });

  it("HTTP エラー時は例外を投げる", async () => {
    setEnv({
      BASE_URL: "/base/",
      VITE_CONFERENCE_DATA_FILE: "data.json",
      VITE_DATA_VERSION: "data-hash-1",
    });

    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchConferenceData()).rejects.toThrow("Failed to fetch /base/data.json?v=data-hash-1: 503");
  });
});
