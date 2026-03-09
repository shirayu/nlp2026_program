/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appSettingsStorageKey } from "../../hooks/useAppSettings";
import { bookmarksStorageKey } from "../../hooks/useBookmarks";
import { backupStorageKey, loadBackup } from "../../lib/appDataBackup";
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

vi.mock("../../hooks/useAppSettings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/useAppSettings")>();
  return {
    ...actual,
    useAppSettings: () => mockUseAppSettings(),
  };
});

vi.mock("../../hooks/useBookmarks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/useBookmarks")>();
  return {
    ...actual,
    useBookmarks: () => mockUseBookmarks(),
  };
});

vi.mock("../../hooks/useSessionJump", () => ({
  useSessionJump: () => mockUseSessionJump(),
}));

const mockExtractImportFragment = vi.fn(() => null as string | null);
const mockExtractZoomImportFragment = vi.fn(() => null as string | null);
const mockStripImportFragment = vi.fn();
const mockStripZoomImportFragment = vi.fn();
const mockClearImportPendingFlag = vi.fn();
const mockClearZoomImportPendingFlag = vi.fn();
const mockDecodePayload = vi.fn(() => null as import("../../types").ExportPayload | null);
const mockDecodeZoomPayload = vi.fn(async () => null as import("../../types").ZoomCustomUrls | undefined | null);
const mockBuildExportUrl = vi.fn(() => "https://example.com/#import_settings=abc");

vi.mock("../../lib/appDataExport", () => ({
  extractImportFragment: () => mockExtractImportFragment(),
  extractZoomImportFragment: () => mockExtractZoomImportFragment(),
  stripImportFragment: () => mockStripImportFragment(),
  stripZoomImportFragment: () => mockStripZoomImportFragment(),
  clearImportPendingFlag: () => mockClearImportPendingFlag(),
  clearZoomImportPendingFlag: () => mockClearZoomImportPendingFlag(),
  decodePayload: (...args: Parameters<typeof mockDecodePayload>) => mockDecodePayload(...args),
  decodeZoomPayload: (...args: Parameters<typeof mockDecodeZoomPayload>) => mockDecodeZoomPayload(...args),
  buildExportUrl: (...args: Parameters<typeof mockBuildExportUrl>) => mockBuildExportUrl(...args),
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
    R2: { name: "B会場" },
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
    S2: {
      title: "別時刻セッション",
      date: "2026-03-04",
      start_time: "11:00",
      end_time: "12:00",
      room_ids: ["R2"],
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
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
        showTimeAtPresentationLevel: false,
      },
      setSettings: vi.fn(),
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
    });
    mockUseBookmarks.mockReturnValue({
      bookmarkIds: [],
      sessionBookmarkIds: [],
      bookmarkedPresentationIds: new Set<string>(),
      bookmarkedSessionIds: new Set<string>(),
      setBookmarks: vi.fn(),
      toggleBookmark: vi.fn(),
      toggleSessionBookmark: vi.fn(),
    });
    mockUseSessionJump.mockReturnValue({
      setJumpSession: vi.fn(),
      sessionRefs: { current: {} },
    });
    mockExtractImportFragment.mockReturnValue(null);
    mockExtractZoomImportFragment.mockReturnValue(null);
    mockDecodePayload.mockReturnValue(null);
    mockDecodeZoomPayload.mockResolvedValue(null);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(null),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    localStorage.clear();
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

  it("時点指定中に日付変更で選択時刻が候補外になったら selectedTime を自動解除する", async () => {
    const dataWithDifferentTimeByDate: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
      },
      sessions: {
        D1: {
          title: "初日セッション",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
        D2: {
          title: "2日目セッション",
          date: "2026-03-05",
          start_time: "13:00",
          end_time: "14:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {},
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithDifferentTimeByDate,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-05");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.allTimes).toContain("13:00");
    expect(hook.getLatest().headerProps.selectedTime).toBeNull();

    hook.unmount();
  });

  it("selectedTime が候補外でも allTimes が空なら selectedTime を維持する", async () => {
    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-99");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.allTimes).toEqual([]);
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");

    hook.unmount();
  });

  it("onSelectNow は次スケジュールがあれば selectedDate/selectedTime を設定する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T08:58:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    expect(hook.getLatest().headerProps.nowEnabled).toBe(true);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今");

    act(() => {
      hook.getLatest().headerProps.onSelectNow();
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");

    hook.unmount();
  });

  it("onSelectNow は次スケジュールがなければ selectedDate/selectedTime を変更しない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T09:00:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("次の時点がないため利用できません");

    act(() => {
      hook.getLatest().headerProps.onSelectNow();
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");

    hook.unmount();
  });

  it("現在枠を表示中は今ボタンを無効化する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T09:00:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今を表示中です");

    hook.unmount();
  });

  it("開いたまま時間が進むと今ボタンの状態だけ更新する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T09:00:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectNow();
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今を表示中です");

    act(() => {
      vi.setSystemTime(new Date("2026-03-04T09:00:01+09:00"));
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(true);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今");

    hook.unmount();
  });

  it("selectedTime だけ一致していても selectedDate が未選択なら今ボタンを無効化しない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T09:00:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBeNull();
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(true);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今");

    hook.unmount();
  });

  it("別日で同時刻を表示中でも今ボタンを無効化しない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T09:00:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-05");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-05");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:00");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(true);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今");

    hook.unmount();
  });

  it("現在枠の直前でも次の5分時点を表示中なら今ボタンを無効化する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T09:04:59+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:05");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今を表示中です");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("9:05");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今を表示中です");

    hook.unmount();
  });

  it("最後の時点を表示中のまま終了を過ぎると今ボタンは利用不可に変わる", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00+09:00"));

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("12:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("今を表示中です");

    act(() => {
      vi.setSystemTime(new Date("2026-03-04T12:00:01+09:00"));
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedDate).toBe("2026-03-04");
    expect(hook.getLatest().headerProps.selectedTime).toBe("12:00");
    expect(hook.getLatest().headerProps.nowEnabled).toBe(false);
    expect(hook.getLatest().headerProps.nowTitle).toBe("次の時点がないため利用できません");

    hook.unmount();
  });

  it("選択会場は時点変更で該当外になっても維持し、表示候補は全会場のまま", async () => {
    const hook = setupHook();
    await act(async () => {});

    expect(hook.getLatest().headerProps.rooms).toEqual(["A", "B"]);

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("B");
    });
    await act(async () => {});
    expect(hook.getLatest().headerProps.selectedRoom).toBe("B");

    act(() => {
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.selectedRoom).toBe("B");
    expect(hook.getLatest().headerProps.activeRooms).toEqual(["A"]);
    expect(hook.getLatest().headerProps.rooms).toEqual(["A", "B"]);

    hook.unmount();
  });

  it("会場選択時のタイムラインは発表有無を問わずセッションがある区間をアクティブにする", async () => {
    const dataWithPresentationWindow: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
      },
      sessions: {
        S1: {
          title: "発表なしセッション",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
        S2: {
          title: "発表ありセッション",
          date: "2026-03-04",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "発表1",
          session_id: "S2",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithPresentationWindow,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectRoom("A");
    });
    await act(async () => {});

    const { allTimes, timelineSegments } = hook.getLatest().headerProps;
    expect(allTimes[0]).toBe("9:00");
    expect(allTimes[allTimes.length - 1]).toBe("11:00");

    const start0900 = allTimes.indexOf("9:00");
    const start1000 = allTimes.indexOf("10:00");
    expect(start0900).toBeGreaterThanOrEqual(0);
    expect(start1000).toBeGreaterThanOrEqual(0);
    expect(timelineSegments[start0900]).toBe(true);
    expect(timelineSegments[start1000]).toBe(true);

    hook.unmount();
  });

  it("会場未選択時のタイムラインは発表有無を問わずアクティブにする", async () => {
    const dataWithMixedSessions: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
      },
      sessions: {
        S1: {
          title: "発表なしセッション",
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
    mockUseConferenceData.mockReturnValue({
      data: dataWithMixedSessions,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
    });
    await act(async () => {});

    const { allTimes, timelineSegments } = hook.getLatest().headerProps;
    const start0900 = allTimes.indexOf("9:00");
    expect(start0900).toBeGreaterThanOrEqual(0);
    expect(timelineSegments[start0900]).toBe(true);

    hook.unmount();
  });

  it("会場選択時に該当会場の発表が無くてもセッション区間はタイムラインを塗る", async () => {
    const dataWithOtherRoomPresentation: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        SA: {
          title: "A会場 発表なし",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
        SB: {
          title: "B会場 発表あり",
          date: "2026-03-04",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["R2"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "発表1",
          session_id: "SB",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithOtherRoomPresentation,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectRoom("A");
    });
    await act(async () => {});

    const { allTimes, timelineSegments } = hook.getLatest().headerProps;
    expect(allTimes[0]).toBe("9:00");
    expect(allTimes[allTimes.length - 1]).toBe("11:00");
    const start0900 = allTimes.indexOf("9:00");
    const start1000 = allTimes.indexOf("10:00");
    expect(start0900).toBeGreaterThanOrEqual(0);
    expect(start1000).toBeGreaterThanOrEqual(0);
    expect(timelineSegments[start0900]).toBe(true);
    expect(timelineSegments[start1000]).toBe(false);
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    hook.unmount();
  });

  it("3/11 P会場 15:00 のセッション区間はタイムラインを塗る", async () => {
    const dataWithSponsorMeetup: ConferenceData = {
      generated_at: "2026-03-11T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "P会場(1F 大ホール(西))" },
        R3: { name: "P会場(第2部 1F 大ホール(西)・ホワイエ)" },
      },
      sessions: {
        invited2: {
          title: "招待講演2",
          date: "2026-03-11",
          start_time: "13:55",
          end_time: "14:55",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: ["P1"],
        },
        sponsor: {
          title: "スポンサーミートアップ",
          date: "2026-03-11",
          start_time: "15:00",
          end_time: "16:50",
          room_ids: ["R3"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        P1: {
          title: "招待講演",
          session_id: "invited2",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithSponsorMeetup,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectRoom("P");
      hook.getLatest().headerProps.onSelectTime("15:00");
    });
    await act(async () => {});

    const { allTimes, timelineSegments } = hook.getLatest().headerProps;
    const start1500 = allTimes.indexOf("15:00");
    expect(start1500).toBeGreaterThanOrEqual(0);
    expect(timelineSegments[start1500]).toBe(true);

    hook.unmount();
  });

  it("実データ相当の連続操作で日付・会場・時点に応じた判定が一貫する", async () => {
    const dataForSequentialScenario: ConferenceData = {
      generated_at: "2026-03-11T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R3F: { name: "3F" },
        RA: { name: "A会場" },
        RP: { name: "P会場(第2部 1F 大ホール(西)・ホワイエ)" },
        RQ: { name: "Q会場(1F ホワイエ)" },
      },
      sessions: {
        invited: {
          title: "招待講演",
          date: "2026-03-11",
          start_time: "11:00",
          end_time: "12:00",
          room_ids: ["RA"],
          chair: "",
          presentation_ids: ["P1"],
        },
        sponsorD1: {
          title: "スポンサーミートアップ",
          date: "2026-03-11",
          start_time: "15:00",
          end_time: "16:50",
          room_ids: ["RP"],
          chair: "",
          presentation_ids: [],
        },
        qPrevDay: {
          title: "Q会場 別日セッション",
          date: "2026-03-12",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RQ"],
          chair: "",
          presentation_ids: ["PQ1"],
        },
        sponsorD3: {
          title: "スポンサーミートアップ",
          date: "2026-03-13",
          start_time: "15:00",
          end_time: "16:50",
          room_ids: ["RP"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        P1: {
          title: "招待講演",
          session_id: "invited",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
        PQ1: {
          title: "Q別日発表",
          session_id: "qPrevDay",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataForSequentialScenario,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectRoom("3F");
      hook.getLatest().headerProps.onSelectTime("11:00");
    });
    await act(async () => {});

    const idx1100D1 = hook.getLatest().headerProps.allTimes.indexOf("11:00");
    expect(idx1100D1).toBeGreaterThanOrEqual(0);
    expect(hook.getLatest().headerProps.timelineSegments[idx1100D1]).toBe(false);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.["3F"]).toBeUndefined();
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("P");
      hook.getLatest().headerProps.onSelectTime("15:00");
    });
    await act(async () => {});

    const idx1500D1 = hook.getLatest().headerProps.allTimes.indexOf("15:00");
    expect(idx1500D1).toBeGreaterThanOrEqual(0);
    expect(hook.getLatest().headerProps.timelineSegments[idx1500D1]).toBe(true);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.P).toBe(false);
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-13");
      hook.getLatest().headerProps.onSelectRoom("Q");
      hook.getLatest().headerProps.onSelectTime("15:00");
    });
    await act(async () => {});

    const idx1500D3 = hook.getLatest().headerProps.allTimes.indexOf("15:00");
    expect(idx1500D3).toBeGreaterThanOrEqual(0);
    expect(hook.getLatest().headerProps.timelineSegments[idx1500D3]).toBe(false);
    expect(hook.getLatest().headerProps.activeRooms).toEqual(["P"]);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.Q).toBeUndefined();
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    hook.unmount();
  });

  it("選択会場に当日のセッション自体が無い場合でも、時点未指定なら専用空メッセージを出す", async () => {
    const dataWithRoomUnusedOnDate: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        S1: {
          title: "初日 A会場 発表あり",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: ["P1"],
        },
        S2: {
          title: "2日目 B会場 発表あり",
          date: "2026-03-05",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R2"],
          chair: "",
          presentation_ids: ["P2"],
        },
      },
      presentations: {
        P1: {
          title: "初日発表",
          session_id: "S1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
        P2: {
          title: "2日目発表",
          session_id: "S2",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithRoomUnusedOnDate,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-05");
      hook.getLatest().headerProps.onSelectRoom("A");
    });
    await act(async () => {});

    expect(hook.getLatest().resultsProps.filteredSessions).toHaveLength(0);
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.A).toBe(false);

    hook.unmount();
  });

  it("選択会場に発表なしセッションが別時刻にのみある場合、時点指定では専用空メッセージを出さない", async () => {
    const dataWithOutOfTimeNoPresentationSession: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "3F" },
        R2: { name: "A会場" },
      },
      sessions: {
        S1: {
          title: "3F 懇親会（発表なし）",
          date: "2026-03-11",
          start_time: "18:00",
          end_time: "20:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
        S2: {
          title: "A会場 発表あり",
          date: "2026-03-11",
          start_time: "11:00",
          end_time: "12:00",
          room_ids: ["R2"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "発表1",
          session_id: "S2",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithOutOfTimeNoPresentationSession,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectRoom("3F");
      hook.getLatest().headerProps.onSelectTime("11:00");
    });
    await act(async () => {});

    expect(hook.getLatest().resultsProps.filteredSessions).toHaveLength(0);
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.["3F"]).toBeUndefined();

    hook.unmount();
  });

  it("時点指定がセッション終了時刻ちょうどならスコープ外として専用空メッセージを出さない", async () => {
    const dataWithEndBoundary: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        SA: {
          title: "A会場 発表なし",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
        SB: {
          title: "B会場 発表あり",
          date: "2026-03-04",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["R2"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "発表1",
          session_id: "SB",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithEndBoundary,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectRoom("A");
      hook.getLatest().headerProps.onSelectTime("10:00");
    });
    await act(async () => {});

    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.A).toBeUndefined();

    hook.unmount();
  });

  it("時点指定がセッション開始時刻ちょうどならスコープ内として専用空メッセージを出す", async () => {
    const dataWithStartBoundary: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        SA: {
          title: "A会場 発表なし",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: [],
        },
        SB: {
          title: "B会場 発表あり",
          date: "2026-03-04",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["R2"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "発表1",
          session_id: "SB",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithStartBoundary,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectRoom("A");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.A).toBe(false);

    hook.unmount();
  });

  it("複数会場にまたがる発表ありセッションは各会場で発表ありとして扱う", async () => {
    const dataWithMultiRoomPresentation: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        S1: {
          title: "A/B 共同セッション",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1", "R2"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "共同発表",
          session_id: "S1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithMultiRoomPresentation,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.A).toBe(true);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.B).toBe(true);

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("A");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("B");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    hook.unmount();
  });

  it("presentation_ids が空でも発表が紐づく複数会場セッションは各会場で発表ありとして扱う", async () => {
    const dataWithMultiRoomPresentationFallback: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        S1: {
          title: "A/B 共同セッション",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1", "R2"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        P1: {
          title: "共同発表",
          session_id: "S1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithMultiRoomPresentationFallback,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.A).toBe(true);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.B).toBe(true);

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("A");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("B");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    hook.unmount();
  });

  it("複数会場にまたがる発表なしセッションは各会場で発表なしとして扱う", async () => {
    const dataWithMultiRoomNoPresentation: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        S1: {
          title: "A/B 合同案内",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1", "R2"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {},
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithMultiRoomNoPresentation,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectTime("9:00");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.A).toBe(false);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.B).toBe(false);

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("A");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    act(() => {
      hook.getLatest().headerProps.onSelectRoom("B");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    hook.unmount();
  });

  it("3/11 15:00 で C会場は非アクティブ扱いとなり専用空メッセージを出さない", async () => {
    const dataWithPOnlyAt1500: ConferenceData = {
      generated_at: "2026-03-11T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        RC: { name: "C会場(2F 大会議室202)" },
        RP: { name: "P会場(第2部 1F 大ホール(西)・ホワイエ)" },
      },
      sessions: {
        C6: {
          title: "C会場 午前発表",
          date: "2026-03-11",
          start_time: "11:15",
          end_time: "12:45",
          room_ids: ["RC"],
          chair: "",
          presentation_ids: ["PC1"],
        },
        sponsor: {
          title: "スポンサーミートアップ",
          date: "2026-03-11",
          start_time: "15:00",
          end_time: "16:50",
          room_ids: ["RP"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        PC1: {
          title: "C発表",
          session_id: "C6",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithPOnlyAt1500,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectTime("15:00");
      hook.getLatest().headerProps.onSelectRoom("C");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.activeRooms).toEqual(["P"]);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.C).toBeUndefined();
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    hook.unmount();
  });

  it("時点指定中でも当日セッション自体が無い会場は専用空メッセージを出す", async () => {
    const dataWithoutRoomSessionOnDate: ConferenceData = {
      generated_at: "2026-03-13T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        RP: { name: "P会場(第2部 1F 大ホール(西)・ホワイエ)" },
        RQ: { name: "Q会場(1F ホワイエ)" },
      },
      sessions: {
        qPrevDay: {
          title: "Q会場 別日セッション",
          date: "2026-03-12",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RQ"],
          chair: "",
          presentation_ids: ["PQ1"],
        },
        sponsor: {
          title: "スポンサーミートアップ",
          date: "2026-03-13",
          start_time: "15:00",
          end_time: "16:50",
          room_ids: ["RP"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        PQ1: {
          title: "Q別日発表",
          session_id: "qPrevDay",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithoutRoomSessionOnDate,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-13");
      hook.getLatest().headerProps.onSelectTime("15:00");
      hook.getLatest().headerProps.onSelectRoom("Q");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.activeRooms).toEqual(["P"]);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.Q).toBeUndefined();
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    hook.unmount();
  });

  it("同じ日付・会場でも時点変更で専用空メッセージ判定が切り替わる（3/11 3F）", async () => {
    const dataWithNightOnlyRoom: ConferenceData = {
      generated_at: "2026-03-11T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R3F: { name: "3F" },
        RA: { name: "A会場" },
      },
      sessions: {
        invited: {
          title: "招待講演",
          date: "2026-03-11",
          start_time: "11:00",
          end_time: "12:00",
          room_ids: ["RA"],
          chair: "",
          presentation_ids: ["P1"],
        },
        reception: {
          title: "懇親会",
          date: "2026-03-11",
          start_time: "18:00",
          end_time: "20:00",
          room_ids: ["R3F"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        P1: {
          title: "招待講演",
          session_id: "invited",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithNightOnlyRoom,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectRoom("3F");
      hook.getLatest().headerProps.onSelectTime("11:00");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.["3F"]).toBeUndefined();

    act(() => {
      hook.getLatest().headerProps.onSelectTime("18:00");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.["3F"]).toBe(false);

    hook.unmount();
  });

  it("専用空メッセージ条件を満たしていても検索語がある場合は通常メッセージを優先する", async () => {
    const dataWithRoomUnusedOnDate: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        S1: {
          title: "初日 A会場 発表あり",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: ["P1"],
        },
        S2: {
          title: "2日目 B会場 発表あり",
          date: "2026-03-05",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R2"],
          chair: "",
          presentation_ids: ["P2"],
        },
      },
      presentations: {
        P1: {
          title: "初日発表",
          session_id: "S1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
        P2: {
          title: "2日目発表",
          session_id: "S2",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithRoomUnusedOnDate,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-05");
      hook.getLatest().headerProps.onSelectRoom("A");
      hook.getLatest().headerProps.onQueryCommit("キーワード");
    });
    await act(async () => {});

    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    hook.unmount();
  });

  it("時点指定を解除すると会場判定と空メッセージは日単位判定に戻る", async () => {
    const dataWithNightOnlyRoom: ConferenceData = {
      generated_at: "2026-03-11T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R3F: { name: "3F" },
        RA: { name: "A会場" },
      },
      sessions: {
        invited: {
          title: "招待講演",
          date: "2026-03-11",
          start_time: "11:00",
          end_time: "12:00",
          room_ids: ["RA"],
          chair: "",
          presentation_ids: ["P1"],
        },
        reception: {
          title: "懇親会",
          date: "2026-03-11",
          start_time: "18:00",
          end_time: "20:00",
          room_ids: ["R3F"],
          chair: "",
          presentation_ids: [],
        },
      },
      presentations: {
        P1: {
          title: "招待講演",
          session_id: "invited",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithNightOnlyRoom,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectRoom("3F");
      hook.getLatest().headerProps.onSelectTime("11:00");
    });
    await act(async () => {});
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.["3F"]).toBeUndefined();
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    act(() => {
      hook.getLatest().headerProps.onSelectTime(null);
    });
    await act(async () => {});
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.["3F"]).toBe(false);
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

    hook.unmount();
  });

  it("日付切替時に選択会場の状態は再計算され前日状態が残留しない", async () => {
    const dataAcrossDates: ConferenceData = {
      generated_at: "2026-03-11T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        RA: { name: "A会場" },
        RB: { name: "B会場" },
      },
      sessions: {
        d1a: {
          title: "1日目 A発表",
          date: "2026-03-11",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RA"],
          chair: "",
          presentation_ids: ["P1"],
        },
        d1b: {
          title: "1日目 Bセッション",
          date: "2026-03-11",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RB"],
          chair: "",
          presentation_ids: [],
        },
        d2b: {
          title: "2日目 B発表",
          date: "2026-03-12",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RB"],
          chair: "",
          presentation_ids: ["P2"],
        },
      },
      presentations: {
        P1: {
          title: "A発表",
          session_id: "d1a",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
        P2: {
          title: "B発表",
          session_id: "d2b",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataAcrossDates,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-11");
      hook.getLatest().headerProps.onSelectRoom("B");
    });
    await act(async () => {});
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.B).toBe(false);

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-12");
    });
    await act(async () => {});
    expect(hook.getLatest().headerProps.selectedRoom).toBe("B");
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.B).toBe(true);

    hook.unmount();
  });

  it("searchAll=true かつ query ありでも専用空メッセージは出さない", async () => {
    const dataWithRoomUnusedOnDate: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        R1: { name: "A会場" },
        R2: { name: "B会場" },
      },
      sessions: {
        S1: {
          title: "初日 A会場 発表あり",
          date: "2026-03-04",
          start_time: "9:00",
          end_time: "10:00",
          room_ids: ["R1"],
          chair: "",
          presentation_ids: ["P1"],
        },
      },
      presentations: {
        P1: {
          title: "初日発表",
          session_id: "S1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithRoomUnusedOnDate,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    expect(hook.getLatest().headerProps.searchAll).toBe(true);
    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-04");
      hook.getLatest().headerProps.onSelectRoom("B");
      hook.getLatest().headerProps.onQueryCommit("不存在キーワード");
    });
    await act(async () => {});

    expect(hook.getLatest().headerProps.searchAll).toBe(true);
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("該当する発表・セッションがありません");

    hook.unmount();
  });

  it("Workshop 親セッションのみの会場は判定から除外される", async () => {
    const dataWithWorkshopParentOnly: ConferenceData = {
      generated_at: "2026-03-04T09:00:00+09:00",
      persons: {},
      affiliations: {},
      rooms: {
        RQ: { name: "Q会場(1F ホワイエ)" },
        RA: { name: "A会場" },
      },
      sessions: {
        WS3: {
          title: "WS3 親",
          date: "2026-03-13",
          start_time: "9:00",
          end_time: "16:45",
          room_ids: ["RQ"],
          chair: "",
          presentation_ids: [],
        },
        "WS3-1": {
          title: "WS3 子",
          date: "2026-03-13",
          start_time: "9:30",
          end_time: "10:00",
          room_ids: ["RA"],
          chair: "",
          presentation_ids: ["PWS1"],
        },
        A1: {
          title: "A会場 発表",
          date: "2026-03-13",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RA"],
          chair: "",
          presentation_ids: ["P1"],
        },
        qPrevDay: {
          title: "Q会場 別日通常セッション",
          date: "2026-03-12",
          start_time: "10:00",
          end_time: "11:00",
          room_ids: ["RQ"],
          chair: "",
          presentation_ids: ["PQ1"],
        },
      },
      presentations: {
        P1: {
          title: "A発表",
          session_id: "A1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
        PWS1: {
          title: "WS子発表",
          session_id: "WS3-1",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
        PQ1: {
          title: "Q別日発表",
          session_id: "qPrevDay",
          presenter_id: null,
          is_english: false,
          is_online: false,
          authors: [],
          pdf_url: null,
        },
      },
    };
    mockUseConferenceData.mockReturnValue({
      data: dataWithWorkshopParentOnly,
      sessionSlackChannels: {},
      isReloading: false,
      reloadStatus: "idle",
      reload: vi.fn().mockResolvedValue(undefined),
      initialLoadStatus: "ready",
      retryInitialLoad: vi.fn().mockResolvedValue(undefined),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().headerProps.onSelectDate("2026-03-13");
      hook.getLatest().headerProps.onSelectRoom("Q");
      hook.getLatest().headerProps.onSelectTime("10:00");
    });
    await act(async () => {});

    const idx1000 = hook.getLatest().headerProps.allTimes.indexOf("10:00");
    expect(idx1000).toBeGreaterThanOrEqual(0);
    expect(hook.getLatest().headerProps.timelineSegments[idx1000]).toBe(false);
    expect(hook.getLatest().headerProps.roomHasPresentationsOnSelectedDate?.Q).toBeUndefined();
    expect(hook.getLatest().resultsProps.emptyStateMessage).toBe("この日はこの会場での発表・セッションはありません");

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

  it("起動時に import_settings フラグメントがあればインポート確認ダイアログを開く", async () => {
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({
      settings: {
        showAuthors: true,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
        showTimeAtPresentationLevel: false,
      },
      bookmarks: { presentationIds: ["p1"], sessionIds: ["s1"] },
    });

    const hook = setupHook();
    await act(async () => {});

    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(true);
    expect(hook.getLatest().overlayProps.importInvalid).toBe(false);
    expect(mockStripImportFragment).toHaveBeenCalled();

    hook.unmount();
  });

  it("起動時に import_zoom_settings フラグメントがあれば Zoom インポート確認ダイアログを開く", async () => {
    mockExtractZoomImportFragment.mockReturnValue("validzoom");
    mockDecodeZoomPayload.mockResolvedValue({
      venues: { A: "https://example.com/a" },
    });

    const hook = setupHook();
    await act(async () => {});

    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(true);
    expect(hook.getLatest().overlayProps.importInvalid).toBe(false);
    expect(hook.getLatest().overlayProps.importTarget).toBe("zoom");
    expect(mockStripZoomImportFragment).toHaveBeenCalled();

    hook.unmount();
  });

  it("Zoom インポート時は decode 後に strip される", async () => {
    mockExtractZoomImportFragment.mockReturnValue("validzoom");
    mockDecodeZoomPayload.mockImplementation(async () => {
      expect(mockStripZoomImportFragment).not.toHaveBeenCalled();
      return { venues: { A: "https://example.com/a" } };
    });

    const hook = setupHook();
    await act(async () => {});

    expect(mockDecodeZoomPayload).toHaveBeenCalled();
    expect(mockStripZoomImportFragment).toHaveBeenCalled();
    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(true);
    expect(hook.getLatest().overlayProps.importTarget).toBe("zoom");

    hook.unmount();
  });

  it("起動時に import_settings フラグメントがデコード失敗なら isInvalid=true でダイアログを開く", async () => {
    mockExtractImportFragment.mockReturnValue("broken");
    mockDecodePayload.mockReturnValue(null);

    const hook = setupHook();
    await act(async () => {});

    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(true);
    expect(hook.getLatest().overlayProps.importInvalid).toBe(true);

    hook.unmount();
  });

  it("インポート確認で setSettings・setBookmarks が呼ばれ、ダイアログが閉じる", async () => {
    const decodedSettings = {
      showAuthors: true,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const decodedBookmarks = { presentationIds: ["p1", "p2"], sessionIds: ["s1"] };
    const setSettings = vi.fn();
    const setBookmarks = vi.fn();
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({ settings: decodedSettings, bookmarks: decodedBookmarks });
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
        showTimeAtPresentationLevel: false,
      },
      setSettings,
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
    });
    mockUseBookmarks.mockReturnValue({
      bookmarkIds: [],
      sessionBookmarkIds: [],
      bookmarkedPresentationIds: new Set<string>(),
      bookmarkedSessionIds: new Set<string>(),
      setBookmarks,
      toggleBookmark: vi.fn(),
      toggleSessionBookmark: vi.fn(),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onConfirmImport();
    });

    expect(setSettings).toHaveBeenCalledWith(decodedSettings);
    expect(setBookmarks).toHaveBeenCalledWith(decodedBookmarks);
    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(false);

    hook.unmount();
  });

  it("インポート成功時にトーストを表示し、3秒後に自動で閉じる", async () => {
    vi.useFakeTimers();
    const decodedSettings = {
      showAuthors: true,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({
      settings: decodedSettings,
      bookmarks: { presentationIds: [], sessionIds: [] },
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onConfirmImport();
    });

    expect(hook.getLatest().importToast?.kind).toBe("success");
    expect(hook.getLatest().importToast?.message).toBe("設定・ブックマークをインポートしました。");

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(hook.getLatest().importToast).toBeNull();

    hook.unmount();
    vi.useRealTimers();
  });

  it("設定インポート時は既存 zoomCustomUrls を維持し、インポート値を上書きしない", async () => {
    const decodedSettings = {
      showAuthors: true,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
      zoomCustomUrls: {
        venues: { A: "https://zoom.us/j/imported-a" },
      },
    };
    const currentZoomCustomUrls = {
      venues: {
        A: "https://zoom.us/j/current-a",
        B: "https://zoom.us/j/current-b",
      },
    };
    const decodedBookmarks = { presentationIds: ["p1", "p2"], sessionIds: ["s1"] };
    const setSettings = vi.fn();
    const setBookmarks = vi.fn();
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({ settings: decodedSettings, bookmarks: decodedBookmarks });
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
        showTimeAtPresentationLevel: false,
        zoomCustomUrls: currentZoomCustomUrls,
      },
      setSettings,
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
    });
    mockUseBookmarks.mockReturnValue({
      bookmarkIds: [],
      sessionBookmarkIds: [],
      bookmarkedPresentationIds: new Set<string>(),
      bookmarkedSessionIds: new Set<string>(),
      setBookmarks,
      toggleBookmark: vi.fn(),
      toggleSessionBookmark: vi.fn(),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onConfirmImport();
    });

    expect(setSettings).toHaveBeenCalledWith({
      ...decodedSettings,
      zoomCustomUrls: currentZoomCustomUrls,
    });
    expect(setBookmarks).toHaveBeenCalledWith(decodedBookmarks);

    hook.unmount();
  });

  it("Zoom インポート確定で zoomCustomUrls のみ更新され、ブックマークは変更しない", async () => {
    const setSettings = vi.fn();
    const setBookmarks = vi.fn();
    mockExtractZoomImportFragment.mockReturnValue("validzoom");
    mockDecodeZoomPayload.mockResolvedValue({
      venues: { A: "https://example.com/room-a", B: "https://example.com/room-b" },
    });
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
        showTimeAtPresentationLevel: false,
      },
      setSettings,
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
    });
    mockUseBookmarks.mockReturnValue({
      bookmarkIds: [],
      sessionBookmarkIds: [],
      bookmarkedPresentationIds: new Set<string>(),
      bookmarkedSessionIds: new Set<string>(),
      setBookmarks,
      toggleBookmark: vi.fn(),
      toggleSessionBookmark: vi.fn(),
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onConfirmImport();
    });

    expect(setSettings).toHaveBeenCalledTimes(1);
    expect(typeof setSettings.mock.calls[0]?.[0]).toBe("function");
    expect(setBookmarks).not.toHaveBeenCalled();
    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(false);

    hook.unmount();
  });

  it("コード入力から Zoom インポート確認ダイアログを開ける", async () => {
    mockDecodeZoomPayload.mockResolvedValue({
      venues: { A: "https://zoom.us/j/111?pwd=aaa" },
    });
    const hook = setupHook();
    await act(async () => {});

    await act(async () => {
      const accepted = await hook
        .getLatest()
        .overlayProps.onImportFromCode("https://example.com/#import_zoom_settings=encoded-zoom");
      expect(accepted).toBe(true);
    });

    expect(mockDecodeZoomPayload).toHaveBeenCalledWith("encoded-zoom");
    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(true);
    expect(hook.getLatest().overlayProps.importTarget).toBe("zoom");

    hook.unmount();
  });

  it("コード入力から設定インポート確認ダイアログを開ける", async () => {
    mockDecodePayload.mockReturnValue({
      settings: {
        showAuthors: true,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
        showTimeAtPresentationLevel: false,
      },
      bookmarks: { presentationIds: ["P1"], sessionIds: ["S1"] },
    });
    const hook = setupHook();
    await act(async () => {});

    await act(async () => {
      const accepted = await hook
        .getLatest()
        .overlayProps.onImportFromCode("https://example.com/#import_settings=encoded-settings");
      expect(accepted).toBe(true);
    });

    expect(mockDecodePayload).toHaveBeenCalledWith("encoded-settings");
    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(true);
    expect(hook.getLatest().overlayProps.importTarget).toBe("settings");

    hook.unmount();
  });

  it("コード入力が不正ならインポート確認を開かない", async () => {
    const hook = setupHook();
    await act(async () => {});

    await act(async () => {
      const accepted = await hook.getLatest().overlayProps.onImportFromCode("not-an-import-code");
      expect(accepted).toBe(false);
    });

    expect(mockDecodePayload).not.toHaveBeenCalled();
    expect(mockDecodeZoomPayload).not.toHaveBeenCalled();
    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(false);

    hook.unmount();
  });

  it("インポートキャンセルでダイアログが閉じる", async () => {
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({
      settings: {
        showAuthors: true,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
        showTimeAtPresentationLevel: false,
      },
      bookmarks: { presentationIds: [], sessionIds: [] },
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onCancelImport();
    });

    expect(hook.getLatest().overlayProps.showSettingsImportConfirm).toBe(false);

    hook.unmount();
  });

  it("インポート確定で clearImportPendingFlag が呼ばれる", async () => {
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({
      settings: {
        showAuthors: true,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
        showTimeAtPresentationLevel: false,
      },
      bookmarks: { presentationIds: [], sessionIds: [] },
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onConfirmImport();
    });

    expect(mockClearImportPendingFlag).toHaveBeenCalled();

    hook.unmount();
  });

  it("インポートキャンセルで clearImportPendingFlag が呼ばれる", async () => {
    mockExtractImportFragment.mockReturnValue("validencoded");
    mockDecodePayload.mockReturnValue({
      settings: {
        showAuthors: true,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
        showTimeAtPresentationLevel: false,
      },
      bookmarks: { presentationIds: [], sessionIds: [] },
    });

    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onCancelImport();
    });

    expect(mockClearImportPendingFlag).toHaveBeenCalled();

    hook.unmount();
  });

  it("before_restore から復元すると before_restore は上書きされず状態Aに戻れる", async () => {
    const settingsA = {
      showAuthors: true,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const settingsB = {
      showAuthors: false,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    };
    const bookmarksA = { presentationIds: ["a1"], sessionIds: [] };
    const bookmarksB = { presentationIds: ["b1"], sessionIds: [] };

    // before_restore に状態A、現在は状態B
    localStorage.setItem(
      backupStorageKey,
      JSON.stringify([{ kind: "before_restore", payload: { settings: settingsA, bookmarks: bookmarksA } }]),
    );
    localStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsB));
    localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarksB));

    const setSettings = vi.fn();
    mockUseAppSettings.mockReturnValue({
      settings: settingsB,
      setSettings,
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleShowRoomFloorLabels: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
    });

    const hook = setupHook();
    await act(async () => {});

    // before_restore を選んで復元
    act(() => {
      hook.getLatest().overlayProps.onConfirmRestore("before_restore");
    });

    // 状態Aに復元されている
    expect(setSettings).toHaveBeenCalledWith(settingsA);

    // before_restore は上書きされず状態Aのまま保持されている
    const afterRestore = loadBackup("before_restore");
    expect(afterRestore?.settings).toEqual(settingsA);

    hook.unmount();
  });

  it("before_import から復元すると before_restore に復元前の状態が保存される", async () => {
    const settingsA = {
      showAuthors: true,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const settingsB = {
      showAuthors: false,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    };
    const bookmarksA = { presentationIds: ["a1"], sessionIds: [] };
    const bookmarksB = { presentationIds: ["b1"], sessionIds: [] };

    // before_import に状態A、現在は状態B
    localStorage.setItem(
      backupStorageKey,
      JSON.stringify([{ kind: "before_import", payload: { settings: settingsA, bookmarks: bookmarksA } }]),
    );
    localStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsB));
    localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarksB));

    const setSettings = vi.fn();
    mockUseAppSettings.mockReturnValue({
      settings: settingsB,
      setSettings,
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleShowRoomFloorLabels: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
    });

    const hook = setupHook();
    await act(async () => {});

    // before_import を選んで復元
    act(() => {
      hook.getLatest().overlayProps.onConfirmRestore("before_import");
    });

    // 状態Aに復元されている
    expect(setSettings).toHaveBeenCalledWith(settingsA);

    // 復元前の状態B が before_restore に保存されている
    const beforeRestore = loadBackup("before_restore");
    expect(beforeRestore?.settings).toEqual(settingsB);

    hook.unmount();
  });

  it("エクスポートボタンで showSettingsExport が true になり URL が生成される", async () => {
    const hook = setupHook();
    await act(async () => {});

    act(() => {
      hook.getLatest().overlayProps.onExportSettings();
    });

    expect(hook.getLatest().overlayProps.showSettingsExport).toBe(true);
    expect(hook.getLatest().overlayProps.exportUrl).toBe("https://example.com/#import_settings=abc");
    expect(mockBuildExportUrl).toHaveBeenCalled();

    hook.unmount();
  });

  it("検索設定3項目を filterSessions に渡す", async () => {
    mockUseAppSettings.mockReturnValue({
      settings: {
        showAuthors: false,
        useSlackAppLinks: false,
        showRoomFloorLabels: true,
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
        showTimeAtPresentationLevel: false,
      },
      setSettings: vi.fn(),
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
      toggleShowRoomFloorLabels: vi.fn(),
      toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
      toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
      toggleShowTimeAtPresentationLevel: vi.fn(),
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
      showTimeAtPresentationLevel: false,
    });

    hook.unmount();
  });

  describe("復元の行き来シナリオ", () => {
    const settingsA = {
      showAuthors: true,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const settingsB = {
      showAuthors: false,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    };
    const bookmarksA = { presentationIds: ["a1"], sessionIds: [] };
    const bookmarksB = { presentationIds: ["b1"], sessionIds: [] };

    function setupWithState(settings: typeof settingsA, bookmarks: typeof bookmarksA) {
      localStorage.setItem(appSettingsStorageKey, JSON.stringify(settings));
      localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarks));
      mockUseAppSettings.mockReturnValue({
        settings,
        setSettings: vi.fn((next) => {
          // setSettings が呼ばれたら localStorage も更新してバックアップ読み書きに反映
          localStorage.setItem(appSettingsStorageKey, JSON.stringify(next));
        }),
        toggleShowAuthors: vi.fn(),
        toggleUseSlackAppLinks: vi.fn(),
        toggleShowRoomFloorLabels: vi.fn(),
        toggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
        toggleIncludeSessionTitleForPresentationSessions: vi.fn(),
        toggleShowTimeAtPresentationLevel: vi.fn(),
      });
    }

    it("状態B → A復元 → B復元 → A復元 と何度でも行き来できる", async () => {
      // before_import に状態A、現在は状態B
      localStorage.setItem(
        backupStorageKey,
        JSON.stringify([{ kind: "before_import", payload: { settings: settingsA, bookmarks: bookmarksA } }]),
      );
      setupWithState(settingsB, bookmarksB);

      const hook = setupHook();
      await act(async () => {});

      // ① before_import(A) を復元 → 現在=A、before_restore=B が保存される
      act(() => {
        hook.getLatest().overlayProps.onConfirmRestore("before_import");
      });
      expect(loadBackup("before_import")?.settings).toEqual(settingsA);
      expect(loadBackup("before_restore")?.settings).toEqual(settingsB);

      // ② before_restore(B) を復元 → 現在=B、before_restore は上書きされない
      act(() => {
        hook.getLatest().overlayProps.onConfirmRestore("before_restore");
      });
      expect(loadBackup("before_restore")?.settings).toEqual(settingsB);

      // ③ before_import(A) を再度復元 → 現在=A、before_restore は状態B のまま
      act(() => {
        hook.getLatest().overlayProps.onConfirmRestore("before_import");
      });
      expect(loadBackup("before_import")?.settings).toEqual(settingsA);
      expect(loadBackup("before_restore")?.settings).toEqual(settingsB);

      hook.unmount();
    });

    it("復元後に手動で変更を加えると、その変更前には戻れなくなる", async () => {
      // before_import に状態A、現在は状態B
      localStorage.setItem(
        backupStorageKey,
        JSON.stringify([{ kind: "before_import", payload: { settings: settingsA, bookmarks: bookmarksA } }]),
      );
      setupWithState(settingsB, bookmarksB);

      const hook = setupHook();
      await act(async () => {});

      // ① before_import(A) を復元 → before_restore=B
      act(() => {
        hook.getLatest().overlayProps.onConfirmRestore("before_import");
      });
      expect(loadBackup("before_restore")?.settings).toEqual(settingsB);

      // ② 復元後に手動で変更を加える（状態Cになる）
      const settingsC = { ...settingsA, showAuthors: false };
      localStorage.setItem(appSettingsStorageKey, JSON.stringify(settingsC));

      // ③ before_import(A) を再復元 → saveBeforeRestore が走り before_restore=C に上書き
      act(() => {
        hook.getLatest().overlayProps.onConfirmRestore("before_import");
      });
      // before_restore は状態C（変更後）になり、状態B には戻れなくなる
      expect(loadBackup("before_restore")?.settings).toEqual(settingsC);
      expect(loadBackup("before_restore")?.settings).not.toEqual(settingsB);

      hook.unmount();
    });
  });
});
