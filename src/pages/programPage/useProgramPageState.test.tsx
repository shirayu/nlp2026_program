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

  it("会場選択時のタイムラインは発表あり区間のみアクティブにする（時刻範囲は維持）", async () => {
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
    expect(timelineSegments[start0900]).toBe(false);
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

  it("会場選択時に該当会場の発表が無ければタイムラインは未塗り（時刻範囲は維持）", async () => {
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
    expect(timelineSegments.some(Boolean)).toBe(false);

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
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const settingsB = {
      showAuthors: false,
      useSlackAppLinks: true,
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
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const settingsB = {
      showAuthors: false,
      useSlackAppLinks: true,
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
        includeSessionTitleForNoPresentationSessions: false,
        includeSessionTitleForPresentationSessions: true,
        showTimeAtPresentationLevel: false,
      },
      setSettings: vi.fn(),
      toggleShowAuthors: vi.fn(),
      toggleUseSlackAppLinks: vi.fn(),
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
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: false,
    };
    const settingsB = {
      showAuthors: false,
      useSlackAppLinks: true,
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
