import { ja } from "../locales/ja";
import { ProgramHeader } from "./programPage/ProgramHeader";
import { ProgramOverlays } from "./programPage/ProgramOverlays";
import { ProgramResults } from "./programPage/ProgramResults";
import { SearchField } from "./programPage/SearchField";
import { useProgramPageState } from "./programPage/useProgramPageState";
import { fullscreenDialogClassName, getNextScheduleTimePoint } from "./programPage/utils";

export { SearchField, fullscreenDialogClassName, getNextScheduleTimePoint };

export default function ProgramPage() {
  const {
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
  } = useProgramPageState();

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
        bookmarkCount={bookmarkCount}
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
        onToggleBookmarkFilter={toggleBookmarkFilter}
        onOpenSettings={() => setShowSettings(true)}
        onOpenInstallDialog={() => setShowInstallDialog(true)}
        onSelectDate={selectDate}
        onToggleFilters={() => setShowFilters((value) => !value)}
        onSelectTime={selectTime}
        onSelectNow={handleSelectNow}
        onSelectRoom={selectRoom}
      />

      <ProgramResults
        data={data}
        mainRef={mainRef}
        trimmedQuery={trimmedQuery}
        showBookmarkedOnly={showBookmarkedOnly}
        searchScopeLabel={searchScopeLabel}
        matchedPresentationCount={matchedPresentationCount}
        filteredSessions={filteredSessions}
        bookmarkedPresentationIds={bookmarkedPresentationIds}
        bookmarkedSessionIds={bookmarkedSessionIds}
        sessionSlackLinks={sessionSlackLinks}
        showAuthors={settings.showAuthors}
        sessionsVisible={sessionsVisible}
        sessionRefs={sessionRefs}
        onToggleExpanded={handleToggleExpanded}
        onPersonClick={setPersonModal}
        onJumpToSession={handleJumpToSession}
        onToggleBookmark={toggleBookmark}
        onToggleSessionBookmark={toggleSessionBookmark}
      />

      <ProgramOverlays
        personModal={personModal}
        data={data}
        bookmarkedPresentationIds={bookmarkedPresentationIds}
        showAuthors={settings.showAuthors}
        onClosePersonModal={() => setPersonModal(null)}
        onPersonClick={setPersonModal}
        onJumpToSessionFromPerson={(sid) => {
          setPersonModal(null);
          handleJumpToSession(sid);
        }}
        onToggleBookmark={toggleBookmark}
        installDialogRef={installDialogRef}
        showInstallDialog={showInstallDialog}
        installContext={installContext}
        hasInstallPrompt={installPromptEvent !== null}
        onCloseInstallDialog={() => setShowInstallDialog(false)}
        onInstall={() => void handleInstallApp()}
        settingsDialogRef={settingsDialogRef}
        showSettings={showSettings}
        useSlackAppLinks={settings.useSlackAppLinks}
        onCloseSettings={() => setShowSettings(false)}
        onToggleShowAuthors={toggleShowAuthors}
        onToggleUseSlackAppLinks={toggleUseSlackAppLinks}
      />
    </div>
  );
}
