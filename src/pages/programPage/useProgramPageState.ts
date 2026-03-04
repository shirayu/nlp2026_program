import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useAppSettings } from "../../hooks/useAppSettings";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useConferenceData } from "../../hooks/useConferenceData";
import { useSessionJump } from "../../hooks/useSessionJump";
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
  toMinutes,
} from "./utils";

export function useProgramPageState() {
  const { data, sessionSlackChannels } = useConferenceData();
  const { settings, toggleShowAuthors, toggleUseSlackAppLinks } = useAppSettings();
  const {
    bookmarkIds,
    sessionBookmarkIds,
    bookmarkedPresentationIds,
    bookmarkedSessionIds,
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
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [personModal, setPersonModal] = useState<PersonId | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installContext, setInstallContext] = useState({ isStandalone: false, isIos: false });
  const mainRef = useRef<HTMLElement | null>(null);
  const settingsDialogRef = useRef<HTMLDialogElement | null>(null);
  const installDialogRef = useRef<HTMLDialogElement | null>(null);
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
    const dialog = settingsDialogRef.current;
    if (!dialog) return;

    if (showSettings && !dialog.open) {
      dialog.showModal();
    } else if (!showSettings && dialog.open) {
      dialog.close();
    }
  }, [showSettings]);

  useEffect(() => {
    const dialog = installDialogRef.current;
    if (!dialog) return;

    if (showInstallDialog && !dialog.open) {
      dialog.showModal();
    } else if (!showInstallDialog && dialog.open) {
      dialog.close();
    }
  }, [showInstallDialog]);

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

  const baseFilteredSessions = useMemo(() => {
    if (!data) return [];
    return filterSessions(data, {
      query: deferredQuery,
      selectedDate: deferredSelectedDate,
      selectedTime: deferredSelectedTime,
      selectedRoom: deferredSelectedRoom,
      searchAll: deferredSearchAll,
    });
  }, [data, deferredQuery, deferredSearchAll, deferredSelectedDate, deferredSelectedRoom, deferredSelectedTime]);

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
  const filtersDisabled = trimmedQuery.length > 0 && searchAll;
  const searchScopeLabel = searchAll ? ja.searchAll : ja.searchFiltered;
  const nowEnabled = nextScheduleTimePoint !== null;
  const bookmarkCount = bookmarkIds.length + sessionBookmarkIds.length;
  const matchedPresentationCount = useMemo(() => {
    return filteredSessions.reduce((total, item) => total + item.presIds.length, 0);
  }, [filteredSessions]);

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
    setShowBookmarkedOnly((value) => !value);
    scrollContentToTop();
  }

  function selectDate(date: string | null) {
    setSelectedDate(date);
    scrollContentToTop();
  }

  function selectTime(time: string | null) {
    setSelectedTime(time);
    scrollContentToTop();
  }

  function selectRoom(room: string | null) {
    setSelectedRoom(room);
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

  return {
    data,
    settings,
    toggleShowAuthors,
    toggleUseSlackAppLinks,
    bookmarkedPresentationIds,
    bookmarkedSessionIds,
    toggleBookmark,
    toggleSessionBookmark,
    query,
    selectedDate,
    selectedRoom,
    selectedTime,
    searchAll,
    showFilters,
    showSettings,
    showBookmarkedOnly,
    showInstallDialog,
    personModal,
    installContext,
    installPromptEvent,
    mainRef,
    settingsDialogRef,
    installDialogRef,
    sessionRefs,
    sessionSlackLinks,
    slackAppUrl,
    slackWebUrl,
    allDates,
    allRooms,
    allTimes,
    timelineSegments,
    filteredSessions,
    trimmedQuery,
    isSearching,
    sessionsVisible,
    filtersDisabled,
    searchScopeLabel,
    nowEnabled,
    bookmarkCount,
    matchedPresentationCount,
    setQuery,
    setSearchAll,
    setShowFilters,
    setShowSettings,
    setShowInstallDialog,
    setPersonModal,
    handleJumpToSession,
    handleToggleExpanded,
    toggleBookmarkFilter,
    selectDate,
    selectTime,
    selectRoom,
    handleSelectNow,
    handleInstallApp,
  };
}
