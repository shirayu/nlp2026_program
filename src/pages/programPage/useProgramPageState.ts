import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { roomShort } from "../../constants";
import { appSettingsStorage, useAppSettings } from "../../hooks/useAppSettings";
import { useBookmarks } from "../../hooks/useBookmarks";
import { RELOAD_STATUS_AUTO_HIDE_MS, useConferenceData } from "../../hooks/useConferenceData";
import { useSessionJump } from "../../hooks/useSessionJump";
import {
  type BackupEntry,
  clearAllData,
  hasAnyBackup,
  listBackups,
  loadBackup,
  saveBeforeImport,
  saveBeforeRestore,
} from "../../lib/appDataBackup";
import {
  buildExportUrl,
  clearImportPendingFlag,
  clearZoomImportPendingFlag,
  decodePayload,
  decodeZoomPayload,
  extractImportFragment,
  extractZoomImportFragment,
  stripImportFragment,
  stripZoomImportFragment,
} from "../../lib/appDataExport";
import { filterBookmarkedSessions } from "../../lib/bookmarks";
import { filterSessions, getAvailableDates, getAvailableRooms, getAvailableTimes } from "../../lib/filters";
import {
  buildSlackTeamAppUrl,
  buildSlackTeamWebUrl,
  getFirstSlackTeamId,
  mapSlackChannelsToUrls,
} from "../../lib/slack";
import { ja } from "../../locales/ja";
import type { PersonId, SessionId, ZoomCustomUrls } from "../../types";
import {
  type BeforeInstallPromptEvent,
  getNextScheduleTimePoint,
  isIosDevice,
  isStandaloneMode,
  isWorkshopParentSession,
  shouldDisableFilters,
  shouldExitBookmarkFilter,
  syncSearchAllWithBookmarkFilter,
  toMinutes,
} from "./utils";

function hasPresentationsInSession(
  sessionId: SessionId,
  session: { presentation_ids: string[] },
  presentations: Record<string, { session_id: string }>,
): boolean {
  if (session.presentation_ids.length > 0) return true;
  return Object.values(presentations).some((presentation) => presentation.session_id === sessionId);
}

function isSessionActiveAtTime(session: { start_time: string; end_time: string }, time: string): boolean {
  return toMinutes(session.start_time) <= toMinutes(time) && toMinutes(time) < toMinutes(session.end_time);
}

function isSessionOnSelectedDate(session: { date: string }, selectedDate: string | null): boolean {
  if (!selectedDate) return true;
  return session.date === selectedDate;
}

function includesSelectedRoom(
  session: { room_ids: string[] },
  rooms: Record<string, { name: string }>,
  selectedRoom: string | null,
): boolean {
  if (!selectedRoom) return true;
  return session.room_ids.some((roomId) => {
    const roomName = rooms[roomId]?.name ?? roomId;
    return roomShort(roomName) === selectedRoom;
  });
}

function isTimelineSegmentActiveBySession(
  sessionId: SessionId,
  session: {
    date: string;
    start_time: string;
    end_time: string;
    room_ids: string[];
    presentation_ids: string[];
  },
  opts: {
    sessionIds: SessionId[];
    selectedDate: string | null;
    selectedRoom: string | null;
    time: string;
    rooms: Record<string, { name: string }>;
    presentations: Record<string, { session_id: string }>;
  },
): boolean {
  if (isWorkshopParentSession(sessionId, opts.sessionIds)) return false;
  if (!isSessionOnSelectedDate(session, opts.selectedDate)) return false;
  if (!isSessionActiveAtTime(session, opts.time)) return false;
  if (!includesSelectedRoom(session, opts.rooms, opts.selectedRoom)) return false;
  if (!opts.selectedRoom) return true;
  return hasPresentationsInSession(sessionId, session, opts.presentations);
}

function extractEncodedFromInput(raw: string, prefix: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const extractByPrefix = (value: string): string | null => {
    const index = value.indexOf(prefix);
    if (index < 0) return null;
    return value.slice(index + prefix.length).trim();
  };

  try {
    const url = new URL(trimmed);
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const fromHash = extractByPrefix(hash);
    if (fromHash) return fromHash;
  } catch {
    // no-op: not a URL string
  }

  const fromRaw = extractByPrefix(trimmed);
  return fromRaw && fromRaw.length > 0 ? fromRaw : null;
}

function extractSettingsEncodedFromInput(raw: string): string | null {
  return extractEncodedFromInput(raw, "import_settings=");
}

function extractZoomEncodedFromInput(raw: string): string | null {
  return extractEncodedFromInput(raw, "import_zoom_settings=");
}

export function useProgramPageState() {
  const { data, sessionSlackChannels, isReloading, reloadStatus, reload, initialLoadStatus, retryInitialLoad } =
    useConferenceData();
  const {
    settings,
    setSettings,
    toggleShowAuthors,
    toggleUseSlackAppLinks,
    toggleIncludeSessionTitleForNoPresentationSessions,
    toggleIncludeSessionTitleForPresentationSessions,
    toggleShowTimeAtPresentationLevel,
  } = useAppSettings();
  const {
    bookmarkIds,
    sessionBookmarkIds,
    bookmarkedPresentationIds,
    bookmarkedSessionIds,
    setBookmarks,
    toggleBookmark,
    toggleSessionBookmark,
  } = useBookmarks();
  const { setJumpSession, sessionRefs } = useSessionJump();
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [searchAll, setSearchAll] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);
  const [appUpdateStatus, setAppUpdateStatus] = useState<"idle" | "updating" | "no_change" | "error">("idle");
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [personModal, setPersonModal] = useState<PersonId | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installContext, setInstallContext] = useState({ isStandalone: false, isIos: false });
  const [showSettingsExport, setShowSettingsExport] = useState(false);
  const [exportUrl, setExportUrl] = useState("");
  const [showSettingsImportConfirm, setShowSettingsImportConfirm] = useState(false);
  const [importInvalid, setImportInvalid] = useState(false);
  const [importTarget, setImportTarget] = useState<"settings" | "zoom">("settings");
  const [pendingSettingsImport, setPendingSettingsImport] = useState<ReturnType<typeof decodePayload> | null>(null);
  const [pendingZoomImport, setPendingZoomImport] = useState<ZoomCustomUrls | undefined | null>(null);
  const [backupEntries, setBackupEntries] = useState<BackupEntry[]>(() =>
    typeof window !== "undefined" ? listBackups() : [],
  );
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearAllDataConfirm, setShowClearAllDataConfirm] = useState(false);
  const [importToast, setImportToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement | null>(null);
  const installDialogRef = useRef<HTMLDialogElement | null>(null);
  const appUpdateStatusResetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const importToastResetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const deferredQuery = useDeferredValue(query);
  const deferredSelectedDate = useDeferredValue(selectedDate);
  const deferredSelectedRoom = useDeferredValue(selectedRoom);
  const deferredSelectedTime = useDeferredValue(selectedTime);
  const deferredSearchAll = useDeferredValue(searchAll);

  const sessionSlackLinks = useMemo(
    () => mapSlackChannelsToUrls(sessionSlackChannels, settings.useSlackAppLinks),
    [sessionSlackChannels, settings.useSlackAppLinks],
  );
  const slackTeamId = useMemo(() => getFirstSlackTeamId(sessionSlackChannels), [sessionSlackChannels]);
  const slackAppUrl = slackTeamId ? buildSlackTeamAppUrl(slackTeamId) : null;
  const slackWebUrl = slackTeamId ? buildSlackTeamWebUrl(slackTeamId) : null;

  const allDates = useMemo(() => {
    if (!data) return [];
    return getAvailableDates(data.sessions);
  }, [data]);

  const allRooms = useMemo(() => {
    if (!data) return [];
    return getAvailableRooms(data.sessions, data.rooms, null, null);
  }, [data]);

  const availableRooms = useMemo(() => {
    if (!data) return [];
    return getAvailableRooms(data.sessions, data.rooms, selectedDate, selectedTime);
  }, [data, selectedDate, selectedTime]);

  const allTimes = useMemo(() => {
    if (!data) return [];
    return getAvailableTimes(data.sessions, selectedDate);
  }, [data, selectedDate]);

  const timelineSegments = useMemo(() => {
    if (!data || allTimes.length < 2) return [];
    const sessionIds = Object.keys(data.sessions) as SessionId[];
    return allTimes.slice(0, -1).map((time) =>
      Object.entries(data.sessions).some(([sessionId, session]) =>
        isTimelineSegmentActiveBySession(sessionId as SessionId, session, {
          sessionIds,
          selectedDate,
          selectedRoom,
          time,
          rooms: data.rooms,
          presentations: data.presentations,
        }),
      ),
    );
  }, [data, allTimes, selectedDate, selectedRoom]);

  const nextScheduleTimePoint = useMemo(() => {
    if (!data) return null;
    return getNextScheduleTimePoint(data.sessions, new Date());
  }, [data]);

  useEffect(() => {
    if (selectedTime && allTimes.length > 0 && !allTimes.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [allTimes, selectedTime]);

  useEffect(() => {
    setInstallContext({
      isStandalone: isStandaloneMode(),
      isIos: isIosDevice(),
    });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPromptEvent(null);
      setInstallContext((current) => ({ ...current, isStandalone: true }));
      setShowInstallDialog(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(
    () => () => {
      if (appUpdateStatusResetTimerRef.current !== null) {
        globalThis.clearTimeout(appUpdateStatusResetTimerRef.current);
      }
      if (importToastResetTimerRef.current !== null) {
        globalThis.clearTimeout(importToastResetTimerRef.current);
      }
    },
    [],
  );

  function showImportToast(kind: "success" | "error", message: string) {
    if (importToastResetTimerRef.current !== null) {
      globalThis.clearTimeout(importToastResetTimerRef.current);
    }
    setImportToast({ kind, message });
    importToastResetTimerRef.current = globalThis.setTimeout(() => {
      setImportToast(null);
      importToastResetTimerRef.current = null;
    }, 3000);
  }

  useEffect(() => {
    let canceled = false;

    function applySettingsImportState(decoded: ReturnType<typeof decodePayload> | null) {
      setImportTarget("settings");
      setPendingZoomImport(null);
      if (decoded) {
        setPendingSettingsImport(decoded);
        setImportInvalid(false);
      } else {
        setPendingSettingsImport(null);
        setImportInvalid(true);
      }
      setShowSettingsImportConfirm(true);
    }

    function applyZoomImportState(decoded: Awaited<ReturnType<typeof decodeZoomPayload>>) {
      setImportTarget("zoom");
      setPendingSettingsImport(null);
      if (decoded !== null) {
        setPendingZoomImport(decoded);
        setImportInvalid(false);
      } else {
        setPendingZoomImport(null);
        setImportInvalid(true);
      }
      setShowSettingsImportConfirm(true);
    }

    async function handleZoomImport() {
      const zoomEncoded = extractZoomImportFragment();
      if (zoomEncoded === null) return;
      const decoded = await decodeZoomPayload(zoomEncoded);
      if (canceled) return;
      stripZoomImportFragment();
      applyZoomImportState(decoded);
    }

    async function setupImportState() {
      const settingsEncoded = extractImportFragment();
      if (settingsEncoded !== null) {
        const decoded = decodePayload(settingsEncoded);
        if (canceled) return;
        stripImportFragment();
        applySettingsImportState(decoded);
        return;
      }

      await handleZoomImport();
    }

    void setupImportState();
    const onHashChange = () => {
      void setupImportState();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => {
      canceled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const baseFilteredSessions = useMemo(() => {
    if (!data) return [];
    return filterSessions(data, {
      query: deferredQuery,
      selectedDate: deferredSelectedDate,
      selectedTime: deferredSelectedTime,
      selectedRoom: deferredSelectedRoom,
      includeSessionTitleForNoPresentationSessions: settings.includeSessionTitleForNoPresentationSessions,
      includeSessionTitleForPresentationSessions: settings.includeSessionTitleForPresentationSessions,
      showTimeAtPresentationLevel: settings.showTimeAtPresentationLevel,
      searchAll: deferredSearchAll,
      bookmarkedOnly: showBookmarkedOnly,
    });
  }, [
    data,
    deferredQuery,
    deferredSearchAll,
    deferredSelectedDate,
    deferredSelectedRoom,
    deferredSelectedTime,
    settings.includeSessionTitleForNoPresentationSessions,
    settings.includeSessionTitleForPresentationSessions,
    settings.showTimeAtPresentationLevel,
    showBookmarkedOnly,
  ]);

  const filteredSessions = useMemo(() => {
    return filterBookmarkedSessions(
      baseFilteredSessions,
      bookmarkedPresentationIds,
      bookmarkedSessionIds,
      showBookmarkedOnly,
    );
  }, [baseFilteredSessions, bookmarkedPresentationIds, bookmarkedSessionIds, showBookmarkedOnly]);

  const trimmedQuery = query.trim();
  const isSearching = query !== deferredQuery;
  const sessionsVisible = sessionsExpanded || trimmedQuery.length > 0;
  const filtersDisabled = shouldDisableFilters(searchAll, trimmedQuery, showBookmarkedOnly);
  const searchScopeLabel = searchAll ? ja.searchAll : ja.searchFiltered;
  const nowEnabled = nextScheduleTimePoint !== null;
  const bookmarkCount = bookmarkIds.length + sessionBookmarkIds.length;
  const matchedPresentationCount = useMemo(() => {
    return filteredSessions.reduce((total, item) => total + item.presIds.length, 0);
  }, [filteredSessions]);

  useEffect(() => {
    if (!shouldExitBookmarkFilter(bookmarkCount, showBookmarkedOnly)) {
      return;
    }

    setShowBookmarkedOnly(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [bookmarkCount, showBookmarkedOnly]);

  function scrollContentToTop() {
    mainRef.current?.scrollTo({ top: 0 });
  }

  function handleJumpToSession(sid: SessionId) {
    const targetSession = data?.sessions[sid];
    if (!targetSession) return;
    setSelectedDate(targetSession.date);
    setSelectedRoom(null);
    setSelectedTime(null);
    setJumpSession(sid);
  }

  function scrollSessionToTop(sessionId: SessionId) {
    window.requestAnimationFrame(() => {
      sessionRefs.current[sessionId]?.scrollIntoView({ block: "start" });
    });
  }

  function handleToggleExpanded(sessionId: SessionId) {
    setSessionsExpanded((value) => {
      const nextValue = !value;
      if (nextValue) {
        scrollSessionToTop(sessionId);
      }
      return nextValue;
    });
  }

  function toggleBookmarkFilter() {
    if (bookmarkCount === 0 && !showBookmarkedOnly) {
      return;
    }

    startTransition(() => {
      setShowBookmarkedOnly((value) => {
        const nextValue = !value;
        setSearchAll((current) => syncSearchAllWithBookmarkFilter(current, nextValue));
        return nextValue;
      });
    });
    scrollContentToTop();
  }

  function selectDate(date: string | null) {
    if (date === selectedDate) {
      return;
    }
    startTransition(() => {
      setSelectedDate(date);
    });
    scrollContentToTop();
  }

  function selectTime(time: string | null) {
    if (time === selectedTime) {
      return;
    }
    startTransition(() => {
      setSelectedTime(time);
    });
    scrollContentToTop();
  }

  function selectRoom(room: string | null) {
    if (room === selectedRoom) {
      return;
    }
    startTransition(() => {
      setSelectedRoom(room);
    });
    scrollContentToTop();
  }

  function handleSelectNow() {
    if (!nextScheduleTimePoint) return;
    setSelectedDate(nextScheduleTimePoint.date);
    setSelectedTime(nextScheduleTimePoint.time);
    scrollContentToTop();
  }

  async function handleInstallApp() {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPromptEvent(null);
      setShowInstallDialog(false);
    }
  }

  function scheduleAppUpdateStatusReset() {
    if (appUpdateStatusResetTimerRef.current !== null) {
      globalThis.clearTimeout(appUpdateStatusResetTimerRef.current);
    }
    appUpdateStatusResetTimerRef.current = globalThis.setTimeout(() => {
      setAppUpdateStatus("idle");
      appUpdateStatusResetTimerRef.current = null;
    }, RELOAD_STATUS_AUTO_HIDE_MS);
  }

  async function handleUpdateApp() {
    if (isUpdatingApp) return;

    setIsUpdatingApp(true);
    setAppUpdateStatus("idle");

    try {
      if (!("serviceWorker" in navigator)) {
        window.location.reload();
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        window.location.reload();
        return;
      }

      await registration.update();

      const waitingWorker = registration.waiting as ServiceWorker | null;
      if (waitingWorker !== null) {
        setAppUpdateStatus("updating");
        await new Promise<void>((resolve) => {
          globalThis.setTimeout(resolve, 400);
        });
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      const installingWorker = registration.installing;
      if (installingWorker) {
        await new Promise<void>((resolve) => {
          const timeoutId = globalThis.setTimeout(resolve, 2000);
          const onStateChange = () => {
            if (
              registration.waiting ||
              installingWorker.state === "activated" ||
              installingWorker.state === "redundant"
            ) {
              globalThis.clearTimeout(timeoutId);
              resolve();
            }
          };
          installingWorker.addEventListener("statechange", onStateChange, { once: true });
          onStateChange();
        });
      }

      const nextWaitingWorker = registration.waiting as ServiceWorker | null;
      if (nextWaitingWorker !== null) {
        setAppUpdateStatus("updating");
        await new Promise<void>((resolve) => {
          globalThis.setTimeout(resolve, 400);
        });
        nextWaitingWorker.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      setAppUpdateStatus("no_change");
      scheduleAppUpdateStatusReset();
    } catch {
      setAppUpdateStatus("error");
      scheduleAppUpdateStatusReset();
    } finally {
      setIsUpdatingApp(false);
    }
  }

  function handleExportSettings() {
    setExportUrl(
      buildExportUrl({
        settings,
        bookmarks: {
          presentationIds: bookmarkIds,
          sessionIds: sessionBookmarkIds,
        },
      }),
    );
    setShowSettingsExport(true);
  }

  function applyPendingSettingsImport(): boolean {
    if (pendingSettingsImport === null || importTarget !== "settings") {
      return false;
    }

    saveBeforeImport();
    const nextSettings = { ...pendingSettingsImport.settings };
    if (settings.zoomCustomUrls) {
      nextSettings.zoomCustomUrls = settings.zoomCustomUrls;
    } else {
      Reflect.deleteProperty(nextSettings, "zoomCustomUrls");
    }
    setSettings(nextSettings);
    setBookmarks(pendingSettingsImport.bookmarks);
    setBackupEntries(listBackups());
    return true;
  }

  function applyPendingZoomImport(): boolean {
    if (importTarget !== "zoom" || pendingZoomImport === null) {
      return false;
    }
    setSettings((current) => ({ ...current, zoomCustomUrls: pendingZoomImport || undefined }));
    return true;
  }

  function handleConfirmImport() {
    const imported = applyPendingSettingsImport() || applyPendingZoomImport();

    if (imported) {
      showImportToast("success", importTarget === "settings" ? ja.importAppDataSuccess : ja.importZoomDataSuccess);
    } else {
      showImportToast("error", ja.importAppDataApplyFailed);
    }

    clearImportPendingFlag();
    clearZoomImportPendingFlag();
    setShowSettingsImportConfirm(false);
    setPendingSettingsImport(null);
    setPendingZoomImport(null);
  }

  function handleConfirmRestoreBackup(kind: BackupEntry["kind"]) {
    if (kind !== "before_restore") {
      saveBeforeRestore();
    }
    const backup = loadBackup(kind);
    if (backup) {
      setSettings(backup.settings);
      setBookmarks(backup.bookmarks);
    }
    setBackupEntries(listBackups());
    setShowRestoreConfirm(false);
  }

  function handleConfirmClearAllData() {
    clearAllData();
    setSettings(appSettingsStorage.defaults);
    setBookmarks({ presentationIds: [], sessionIds: [] });
    setBackupEntries([]);
    setShowClearAllDataConfirm(false);
  }

  function handleCancelImport() {
    clearImportPendingFlag();
    clearZoomImportPendingFlag();
    setShowSettingsImportConfirm(false);
    setPendingSettingsImport(null);
    setPendingZoomImport(null);
  }

  function handleSetZoomCustomUrls(zoomCustomUrls: ZoomCustomUrls | undefined) {
    setSettings((current) => ({ ...current, zoomCustomUrls }));
  }

  async function handleImportFromCode(input: string): Promise<boolean> {
    const settingsEncoded = extractSettingsEncodedFromInput(input);
    if (settingsEncoded) {
      const decoded = decodePayload(settingsEncoded);
      setImportTarget("settings");
      setPendingZoomImport(null);
      if (decoded) {
        setPendingSettingsImport(decoded);
        setImportInvalid(false);
      } else {
        setPendingSettingsImport(null);
        setImportInvalid(true);
      }
      setShowSettingsImportConfirm(true);
      return decoded !== null;
    }

    const zoomEncoded = extractZoomEncodedFromInput(input);
    if (!zoomEncoded) {
      return false;
    }
    const decoded = await decodeZoomPayload(zoomEncoded);
    setImportTarget("zoom");
    setPendingSettingsImport(null);
    if (decoded !== null) {
      setPendingZoomImport(decoded);
      setImportInvalid(false);
    } else {
      setPendingZoomImport(null);
      setImportInvalid(true);
    }
    setShowSettingsImportConfirm(true);
    return decoded !== null;
  }

  return {
    data,
    initialLoadStatus,
    onRetryInitialLoad: () => {
      void retryInitialLoad();
    },
    headerProps: {
      query,
      isSearching,
      searchAll,
      bookmarkCount,
      bookmarkFilterActive: showBookmarkedOnly,
      showSettings,
      showInstallButton: true,
      showInstallDialog,
      dataGeneratedAt: data?.generated_at,
      slackUrl: settings.useSlackAppLinks ? slackAppUrl : slackWebUrl,
      slackAppUrl,
      useSlackAppLinks: settings.useSlackAppLinks,
      allDates,
      filtersDisabled,
      selectedDate,
      showFilters,
      allTimes,
      timelineSegments,
      timelineRoom: selectedRoom,
      selectedTime,
      nowEnabled,
      rooms: allRooms,
      activeRooms: availableRooms,
      selectedRoom,
      onQueryCommit: setQuery,
      onToggleSearchAll: () => setSearchAll((value) => !value),
      onToggleBookmarkFilter: toggleBookmarkFilter,
      onOpenSettings: () => startTransition(() => setShowSettings(true)),
      onOpenInstallDialog: () => startTransition(() => setShowInstallDialog(true)),
      onSelectDate: selectDate,
      onToggleFilters: () => setShowFilters((value) => !value),
      onSelectTime: selectTime,
      onSelectNow: handleSelectNow,
      onSelectRoom: selectRoom,
    },
    resultsProps: {
      mainRef,
      trimmedQuery,
      showBookmarkedOnly,
      searchScopeLabel,
      matchedPresentationCount,
      filteredSessions,
      bookmarkedPresentationIds,
      bookmarkedSessionIds,
      sessionSlackLinks,
      useSlackAppLinks: settings.useSlackAppLinks,
      slackTeamId,
      zoomCustomUrls: settings.zoomCustomUrls,
      showAuthors: settings.showAuthors,
      includeSessionTitleForNoPresentationSessions: settings.includeSessionTitleForNoPresentationSessions,
      includeSessionTitleForPresentationSessions: settings.includeSessionTitleForPresentationSessions,
      sessionsVisible,
      sessionRefs,
      onToggleExpanded: handleToggleExpanded,
      onScrollToSessionTop: scrollSessionToTop,
      onPersonClick: setPersonModal,
      onJumpToSession: handleJumpToSession,
      onToggleBookmark: toggleBookmark,
      onToggleSessionBookmark: toggleSessionBookmark,
    },
    overlayProps: {
      personModal,
      bookmarkedPresentationIds,
      showAuthors: settings.showAuthors,
      slackTeamId,
      onClosePersonModal: () => setPersonModal(null),
      onPersonClick: setPersonModal,
      onJumpToSessionFromPerson: (sid: SessionId) => {
        setPersonModal(null);
        handleJumpToSession(sid);
      },
      onToggleBookmark: toggleBookmark,
      installDialogRef,
      showInstallDialog,
      installContext,
      hasInstallPrompt: installPromptEvent !== null,
      onCloseInstallDialog: () => startTransition(() => setShowInstallDialog(false)),
      onInstall: () => void handleInstallApp(),
      isUpdatingApp,
      appUpdateStatus,
      onUpdateApp: () => {
        void handleUpdateApp();
      },
      settingsDialogRef,
      showSettings,
      isReloadingData: isReloading,
      reloadDataStatus: reloadStatus,
      useSlackAppLinks: settings.useSlackAppLinks,
      zoomCustomUrls: settings.zoomCustomUrls,
      includeSessionTitleForNoPresentationSessions: settings.includeSessionTitleForNoPresentationSessions,
      includeSessionTitleForPresentationSessions: settings.includeSessionTitleForPresentationSessions,
      showTimeAtPresentationLevel: settings.showTimeAtPresentationLevel,
      onCloseSettings: () => startTransition(() => setShowSettings(false)),
      onReloadData: () => {
        void reload().catch(() => {});
      },
      onToggleShowAuthors: toggleShowAuthors,
      onToggleUseSlackAppLinks: toggleUseSlackAppLinks,
      onSetZoomCustomUrls: handleSetZoomCustomUrls,
      onImportFromCode: handleImportFromCode,
      onToggleIncludeSessionTitleForNoPresentationSessions: toggleIncludeSessionTitleForNoPresentationSessions,
      onToggleIncludeSessionTitleForPresentationSessions: toggleIncludeSessionTitleForPresentationSessions,
      onToggleShowTimeAtPresentationLevel: toggleShowTimeAtPresentationLevel,
      onExportSettings: handleExportSettings,
      showSettingsExport,
      exportUrl,
      onCloseSettingsExport: () => setShowSettingsExport(false),
      showSettingsImportConfirm,
      importInvalid,
      importTarget,
      onConfirmImport: handleConfirmImport,
      onCancelImport: handleCancelImport,
      backupEntries,
      hasBackup: hasAnyBackup(),
      onRestoreBackup: () => setShowRestoreConfirm(true),
      onClearAllData: () => setShowClearAllDataConfirm(true),
      showRestoreConfirm,
      onConfirmRestore: handleConfirmRestoreBackup,
      onCancelRestore: () => setShowRestoreConfirm(false),
      showClearAllDataConfirm,
      onConfirmClearAllData: handleConfirmClearAllData,
      onCancelClearAllData: () => setShowClearAllDataConfirm(false),
    },
    importToast,
  };
}
