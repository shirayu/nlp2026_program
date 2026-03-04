import { PersonModal } from "../components/PersonModal";
import { SessionCard } from "../components/SessionCard";
import { ja } from "../locales/ja";
import { InstallDialog, SettingsDialog } from "./programPage/ProgramDialogs";
import { ProgramHeader } from "./programPage/ProgramHeader";
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
