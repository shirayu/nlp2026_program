/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConferenceData } from "../types";
import { useConferenceData } from "./useConferenceData";

const fetchConferenceDataMock = vi.fn();
const fetchSessionSlackChannelsMock = vi.fn();
const loadConferenceDataCacheMock = vi.fn();
const saveConferenceDataCacheMock = vi.fn();
const loadSlackChannelsCacheMock = vi.fn();
const saveSlackChannelsCacheMock = vi.fn();

vi.mock("../services/conferenceService", () => ({
  fetchConferenceData: (...args: Parameters<typeof fetchConferenceDataMock>) => fetchConferenceDataMock(...args),
  fetchSessionSlackChannels: (...args: Parameters<typeof fetchSessionSlackChannelsMock>) =>
    fetchSessionSlackChannelsMock(...args),
}));

vi.mock("../lib/offlineCache", () => ({
  loadConferenceDataCache: (...args: Parameters<typeof loadConferenceDataCacheMock>) =>
    loadConferenceDataCacheMock(...args),
  saveConferenceDataCache: (...args: Parameters<typeof saveConferenceDataCacheMock>) =>
    saveConferenceDataCacheMock(...args),
  loadSlackChannelsCache: (...args: Parameters<typeof loadSlackChannelsCacheMock>) =>
    loadSlackChannelsCacheMock(...args),
  saveSlackChannelsCache: (...args: Parameters<typeof saveSlackChannelsCacheMock>) =>
    saveSlackChannelsCacheMock(...args),
}));

const baseData: ConferenceData = {
  generated_at: "2026-03-08T10:00:00Z",
  persons: {},
  affiliations: {},
  rooms: {},
  sessions: {},
  presentations: {},
};

function setupHook() {
  let latest: ReturnType<typeof useConferenceData> | null = null;

  function Harness() {
    latest = useConferenceData();
    return null;
  }

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Harness />);
  });

  return {
    getLatest: () => latest as ReturnType<typeof useConferenceData>,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useConferenceData behavior", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fetchConferenceDataMock.mockResolvedValue(baseData);
    fetchSessionSlackChannelsMock.mockResolvedValue({});
    loadConferenceDataCacheMock.mockReturnValue(null);
    loadSlackChannelsCacheMock.mockReturnValue(null);
    saveConferenceDataCacheMock.mockReset();
    saveSlackChannelsCacheMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("data成功 + slack失敗でも初期ロードは ready になる", async () => {
    fetchSessionSlackChannelsMock.mockRejectedValue(new Error("offline"));

    const hook = setupHook();
    await flushEffects();

    expect(hook.getLatest().initialLoadStatus).toBe("ready");
    expect(hook.getLatest().data).toEqual(baseData);
    hook.unmount();
  });

  it("data失敗でも local data があれば復元して ready になる", async () => {
    fetchConferenceDataMock.mockRejectedValue(new Error("offline"));
    loadConferenceDataCacheMock.mockReturnValue(baseData);

    const hook = setupHook();
    await flushEffects();

    expect(hook.getLatest().initialLoadStatus).toBe("ready");
    expect(hook.getLatest().data).toEqual(baseData);
    hook.unmount();
  });

  it("dataがネットワーク/ローカルとも失敗なら error になる", async () => {
    fetchConferenceDataMock.mockRejectedValue(new Error("offline"));
    loadConferenceDataCacheMock.mockReturnValue(null);

    const hook = setupHook();
    await flushEffects();

    expect(hook.getLatest().initialLoadStatus).toBe("error");
    expect(hook.getLatest().data).toBeNull();
    hook.unmount();
  });

  it("reload成功時に localStorage 用キャッシュ保存関数を呼ぶ", async () => {
    const hook = setupHook();
    await flushEffects();

    await act(async () => {
      await hook.getLatest().reload();
    });

    expect(saveConferenceDataCacheMock).toHaveBeenCalled();
    expect(saveSlackChannelsCacheMock).toHaveBeenCalled();
    hook.unmount();
  });

  it("data.json に埋め込み Slack 情報があれば slack.json を読まない", async () => {
    fetchConferenceDataMock.mockResolvedValue({
      ...baseData,
      session_slack_channels: {
        A1: { team: "T123", channel_id: "C123" },
      },
    });

    const hook = setupHook();
    await flushEffects();

    expect(hook.getLatest().sessionSlackChannels).toEqual({
      A1: { team: "T123", channel_id: "C123" },
    });
    expect(fetchSessionSlackChannelsMock).not.toHaveBeenCalled();
    hook.unmount();
  });
});
