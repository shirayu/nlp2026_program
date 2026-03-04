import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { PersonModal } from "../components/PersonModal";
import { SessionCard } from "../components/SessionCard";
import { useAppSettings } from "../hooks/useAppSettings";
import { useBookmarks } from "../hooks/useBookmarks";
import { useConferenceData } from "../hooks/useConferenceData";
import { useSessionJump } from "../hooks/useSessionJump";
import { filterBookmarkedSessions } from "../lib/bookmarks";
import { filterSessions, getAvailableDates, getAvailableRooms, getAvailableTimes } from "../lib/filters";
import { buildSlackTeamAppUrl, buildSlackTeamWebUrl, getFirstSlackTeamId, mapSlackChannelsToUrls } from "../lib/slack";
import { ja } from "../locales/ja";
import type { PersonId, SessionId } from "../types";
import { InstallDialog, SettingsDialog } from "./programPage/ProgramDialogs";
import { ProgramHeader } from "./programPage/ProgramHeader";
import { SearchField } from "./programPage/SearchField";
import {
  type BeforeInstallPromptEvent,
  fullscreenDialogClassName,
  getNextScheduleTimePoint,
  isIosDevice,
  isStandaloneMode,
  isWorkshopParentSession,
  toMinutes,
} from "./programPage/utils";

export { SearchField, fullscreenDialogClassName, getNextScheduleTimePoint };

export default function ProgramPage() {
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
  const { setJumpSession, sessionRefs } = useSessionJump();
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
  const matchedPresentationCount = useMemo(() => {
    return filteredSessions.reduce((total, item) => total + item.presIds.length, 0);
  }, [filteredSessions]);

  function handleJumpToSession(sid: SessionId) {
    const targetSession = data?.sessions[sid];
    if (!targetSession) return;
    setSelectedDate(targetSession.date);
    setSelectedRoom(null);
    setSelectedTime(null);
    setJumpSession(sid);
  }

  function scrollContentToTop() {
    mainRef.current?.scrollTo({ top: 0 });
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

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{ja.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <ProgramHeader
        query={query}
        isSearching={isSearching}
        searchAll={searchAll}
        bookmarkCount={bookmarkIds.length + sessionBookmarkIds.length}
        bookmarkFilterActive={showBookmarkedOnly}
        showSettings={showSettings}
        showInstallButton
        showInstallDialog={showInstallDialog}
        slackUrl={settings.useSlackAppLinks ? slackAppUrl : slackWebUrl}
        slackAppUrl={slackAppUrl}
        useSlackAppLinks={settings.useSlackAppLinks}
        allDates={allDates}
        filtersDisabled={filtersDisabled}
        selectedDate={selectedDate}
        showFilters={showFilters}
        allTimes={allTimes}
        timelineSegments={timelineSegments}
        selectedTime={selectedTime}
        nowEnabled={nowEnabled}
        rooms={allRooms}
        selectedRoom={selectedRoom}
        onQueryCommit={setQuery}
        onToggleSearchAll={() => setSearchAll((value) => !value)}
        onToggleBookmarkFilter={() => {
          setShowBookmarkedOnly((value) => !value);
          scrollContentToTop();
        }}
        onOpenSettings={() => setShowSettings(true)}
        onOpenInstallDialog={() => setShowInstallDialog(true)}
        onSelectDate={(date) => {
          setSelectedDate(date);
          scrollContentToTop();
        }}
        onToggleFilters={() => setShowFilters((value) => !value)}
        onSelectTime={(time) => {
          setSelectedTime(time);
          scrollContentToTop();
        }}
        onSelectNow={handleSelectNow}
        onSelectRoom={(room) => {
          setSelectedRoom(room);
          scrollContentToTop();
        }}
      />

      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 pb-10">
          {(trimmedQuery || showBookmarkedOnly) && (
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-gray-500">
              <div className="flex flex-col gap-1">
                {trimmedQuery && <p>{ja.searchResultScope(searchScopeLabel)}</p>}
                {showBookmarkedOnly && <p className="text-amber-600">{ja.bookmarksFiltered}</p>}
              </div>
              <p>{ja.searchResultCount(matchedPresentationCount)}</p>
            </div>
          )}
          {filteredSessions.length === 0 && <p className="py-10 text-center text-gray-400">{ja.noResults}</p>}
          {filteredSessions.map(({ sessionId, session, presIds }) => (
            <SessionCard
              key={sessionId}
              bookmarkedPresentationIds={bookmarkedPresentationIds}
              bookmarkedSessionIds={bookmarkedSessionIds}
              sessionId={sessionId}
              session={session}
              sessionSlackUrl={sessionSlackLinks[sessionId]}
              presIds={presIds}
              data={data}
              showAuthors={settings.showAuthors}
              query={trimmedQuery}
              expanded={sessionsVisible}
              onToggleExpanded={() => handleToggleExpanded(sessionId)}
              onPersonClick={setPersonModal}
              onJumpToSession={handleJumpToSession}
              onToggleBookmark={toggleBookmark}
              onToggleSessionBookmark={toggleSessionBookmark}
              ref={(el) => {
                sessionRefs.current[sessionId] = el;
              }}
            />
          ))}
        </div>
      </main>

      {personModal && (
        <PersonModal
          personId={personModal}
          data={data}
          bookmarkedPresentationIds={bookmarkedPresentationIds}
          showAuthors={settings.showAuthors}
          onClose={() => setPersonModal(null)}
          onPersonClick={setPersonModal}
          onJumpToSession={(sid) => {
            setPersonModal(null);
            handleJumpToSession(sid);
          }}
          onToggleBookmark={toggleBookmark}
        />
      )}

      <InstallDialog
        dialogRef={installDialogRef}
        open={showInstallDialog}
        installContext={installContext}
        hasInstallPrompt={installPromptEvent !== null}
        onClose={() => setShowInstallDialog(false)}
        onInstall={() => void handleInstallApp()}
      />

      <SettingsDialog
        dialogRef={settingsDialogRef}
        open={showSettings}
        showAuthors={settings.showAuthors}
        useSlackAppLinks={settings.useSlackAppLinks}
        onClose={() => setShowSettings(false)}
        onToggleShowAuthors={toggleShowAuthors}
        onToggleUseSlackAppLinks={toggleUseSlackAppLinks}
      />
    </div>
  );
}
