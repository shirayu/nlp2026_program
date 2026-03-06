import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  decodePayload,
  extractImportFragment,
  stripImportFragment,
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
import type { PersonId, SessionId } from "../../types";
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

export function useProgramPageState() {
  const { data, sessionSlackChannels, isReloading, reloadStatus, reload } = useConferenceData();
  const {
    settings,
    setSettings,
    toggleShowAuthors,
    toggleUseSlackAppLinks,
    toggleIncludeSessionTitleForNoPresentationSessions,
    toggleIncludeSessionTitleForPresentationSessions,
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
  const [pendingImportEncoded, setPendingImportEncoded] = useState<string | null>(null);
  const [backupEntries, setBackupEntries] = useState<BackupEntry[]>(() =>
    typeof window !== "undefined" ? listBackups() : [],
  );
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearAllDataConfirm, setShowClearAllDataConfirm] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement | null>(null);
  const installDialogRef = useRef<HTMLDialogElement | null>(null);
  const appUpdateStatusResetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
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
      Object.entries(data.sessions).some(([sessionId, session]) => {
        if (isWorkshopParentSession(sessionId as SessionId, sessionIds)) return false;
        if (selectedDate && session.date !== selectedDate) return false;
        return toMinutes(session.start_time) <= toMinutes(time) && toMinutes(time) < toMinutes(session.end_time);
      }),
    );
  }, [data, allTimes, selectedDate]);

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
    if (selectedRoom && allRooms.length > 0 && !allRooms.includes(selectedRoom)) {
      setSelectedRoom(null);
    }
  }, [allRooms, selectedRoom]);

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
    },
    [],
  );

  useEffect(() => {
    const encoded = extractImportFragment();
    if (encoded !== null) {
      stripImportFragment();
      const decoded = decodePayload(encoded);
      if (decoded) {
        setPendingImportEncoded(encoded);
        setImportInvalid(false);
      } else {
        setImportInvalid(true);
      }
      setShowSettingsImportConfirm(true);
    }
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

  function handleConfirmImport() {
    if (pendingImportEncoded) {
      const decoded = decodePayload(pendingImportEncoded);
      if (decoded) {
        saveBeforeImport();
        setSettings(decoded.settings);
        setBookmarks(decoded.bookmarks);
        setBackupEntries(listBackups());
      }
    }
    clearImportPendingFlag();
    setShowSettingsImportConfirm(false);
    setPendingImportEncoded(null);
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
    setShowSettingsImportConfirm(false);
    setPendingImportEncoded(null);
  }

  return {
    data,
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
      selectedTime,
      nowEnabled,
      rooms: allRooms,
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
      includeSessionTitleForNoPresentationSessions: settings.includeSessionTitleForNoPresentationSessions,
      includeSessionTitleForPresentationSessions: settings.includeSessionTitleForPresentationSessions,
      onCloseSettings: () => startTransition(() => setShowSettings(false)),
      onReloadData: () => {
        void reload().catch(() => {});
      },
      onToggleShowAuthors: toggleShowAuthors,
      onToggleUseSlackAppLinks: toggleUseSlackAppLinks,
      onToggleIncludeSessionTitleForNoPresentationSessions: toggleIncludeSessionTitleForNoPresentationSessions,
      onToggleIncludeSessionTitleForPresentationSessions: toggleIncludeSessionTitleForPresentationSessions,
      onExportSettings: handleExportSettings,
      showSettingsExport,
      exportUrl,
      onCloseSettingsExport: () => setShowSettingsExport(false),
      showSettingsImportConfirm,
      importInvalid,
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
  };
}
