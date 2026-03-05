/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { filterSessions } from "../../lib/filters";
import type { ConferenceData } from "../../types";
import { useProgramPageState } from "./useProgramPageState";

const mockUseConferenceData = vi.fn();
const mockUseAppSettings = vi.fn();
const mockUseBookmarks = vi.fn();
const mockUseSessionJump = vi.fn();

vi.mock("../../hooks/useConferenceData", () => ({
  useConferenceData: () => mockUseConferenceData(),
  RELOAD_STATUS_AUTO_HIDE_MS: 3000,
}));

vi.mock("../../hooks/useAppSettings", () => ({
  useAppSettings: () => mockUseAppSettings(),
}));

vi.mock("../../hooks/useBookmarks", () => ({
  useBookmarks: () => mockUseBookmarks(),
}));

vi.mock("../../hooks/useSessionJump", () => ({
  useSessionJump: () => mockUseSessionJump(),
}));

vi.mock("../../lib/filters", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/filters")>();
  return {
    ...actual,
    filterSessions: vi.fn(actual.filterSessions),
  };
});

const baseData: ConferenceData = {
  generated_at: "2026-03-04T09:00:00+09:00",
  persons: {},
  affiliations: {},
  rooms: {
    R1: { name: "A会場" },
  },
  sessions: {
    S1: {
      title: "テストセッション",
      date: "2026-03-04",
      start_time: "9:00",
      end_time: "10:00",
      room_ids: ["R1"],
      chair: "",
      presentation_ids: [],
    },
  },
  presentations: {},
};

function setupHook() {
  let latest: ReturnType<typeof useProgramPageState> | null = null;
  let renderCount = 0;

  function Harness() {
    latest = useProgramPageState();
    renderCount += 1;
    return null;
  }

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Harness />);
  });

  return {
    getLatest: () => latest as ReturnType<typeof useProgramPageState>,
    getRenderCount: () => renderCount,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("useProgramPageState", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockUseConferenceData.mockReturnValue({
      data: baseData,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
    });
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
      },
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
    });
    mockUseBookmarks.mockReturnValue({
      bookmarkIds: [],
      sessionBookmarkIds: [],
      bookmarkedPresentationIds: new Set<string>(),
      bookmarkedSessionIds: new Set<string>(),
      toggleBookmark: vi.fn(),
      toggleSessionBookmark: vi.fn(),
    });
    mockUseSessionJump.mockReturnValue({
      setJumpSession: vi.fn(),
      sessionRefs: { current: {} },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(null),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("selectDate は同じ日付の再選択で再レンダーしない", async () => {
    const hook = setupHook();

    await act(async () => {});
    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
    });
    await act(async () => {});

    const renderCountAfterFirstSelect = hook.getRenderCount();
    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
    });
    await act(async () => {});

    expect(hook.getRenderCount()).toBe(renderCountAfterFirstSelect);
    hook.unmount();
  });

  it("selectTime は同じ時刻の再選択で再レンダーしない", async () => {
    const hook = setupHook();

    await act(async () => {});
    act(() => {
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    const renderCountAfterFirstSelect = hook.getRenderCount();
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");

    act(() => {
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getRenderCount()).toBe(renderCountAfterFirstSelect);
    hook.unmount();
  });

  it("selectRoom は同じ会場の再選択で再レンダーしない", async () => {
    const hook = setupHook();

    const room = hook.getLatest().headerProps.rooms[0];
    expect(room).toBeTruthy();

    await act(async () => {});
    act(() => {
      hook.getLatest().headerProps.onSelectRoom(room);
    });
    await act(async () => {});

    const renderCountAfterFirstSelect = hook.getRenderCount();
    expect(hook.getLatest().headerProps.selectedRoom).toBe(room);

    act(() => {
      hook.getLatest().headerProps.onSelectRoom(room);
    });
    await act(async () => {});

    expect(hook.getRenderCount()).toBe(renderCountAfterFirstSelect);
    hook.unmount();
  });

  it("アプリ更新確認で更新がなければ no_change をセットする", async () => {
    vi.useFakeTimers();

    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: null,
      installing: null,
    };
    const getRegistration = vi.fn().mockResolvedValue(registration);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration },
    });

    const hook = setupHook();

    await act(async () => {
      hook.getLatest().overlayProps.onUpdateApp();
    });
    await act(async () => {});

    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(hook.getLatest().overlayProps.appUpdateStatus).toBe("no_change");

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(hook.getLatest().overlayProps.appUpdateStatus).toBe("idle");

    hook.unmount();
    vi.useRealTimers();
  });

  it("アプリ更新確認で waiting worker があれば更新適用処理を呼ぶ", async () => {
    vi.useFakeTimers();

    const postMessage = vi.fn();
    const waitingWorker = { postMessage } as unknown as ServiceWorker;
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
      waiting: waitingWorker,
      installing: null,
    };
    const getRegistration = vi.fn().mockResolvedValue(registration);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration },
    });

    const hook = setupHook();

    await act(async () => {
      hook.getLatest().overlayProps.onUpdateApp();
    });
    await act(async () => {});

    expect(hook.getLatest().overlayProps.appUpdateStatus).toBe("updating");

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {});

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(hook.getLatest().overlayProps.appUpdateStatus).toBe("updating");

    hook.unmount();
    vi.useRealTimers();
  });

  it("検索設定2項目を filterSessions に渡す", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
      },
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
    });

    const hook = setupHook();
    await act(async () => {});

    const mockedFilterSessions = vi.mocked(filterSessions);
    expect(mockedFilterSessions).toHaveBeenCalled();
    const calls = mockedFilterSessions.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[1]).toMatchObject({
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
    });

    hook.unmount();
  });
});
