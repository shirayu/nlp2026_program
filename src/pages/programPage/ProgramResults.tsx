import type { RefObject } from "react";
import { SessionCard } from "../../components/SessionCard";
import { ja } from "../../locales/ja";
import type { ConferenceData, PersonId, PresentationId, SessionId } from "../../types";

type FilteredSession = {
  sessionId: SessionId;
  session: ConferenceData["sessions"][string];
  presIds: PresentationId[];
};

export function ProgramResults({
  data,
  mainRef,
  trimmedQuery,
  showBookmarkedOnly,
  searchScopeLabel,
  matchedPresentationCount,
  filteredSessions,
  bookmarkedPresentationIds,
  bookmarkedSessionIds,
  sessionSlackLinks,
  useSlackAppLinks = false,
  slackTeamId = null,
  showAuthors,
  includeSessionTitleForNoPresentationSessions,
  includeSessionTitleForPresentationSessions,
  sessionsVisible,
  sessionRefs,
  onToggleExpanded,
  onScrollToSessionTop,
  onPersonClick,
  onJumpToSession,
  onToggleBookmark,
  onToggleSessionBookmark,
}: {
  data: ConferenceData;
  mainRef: RefObject<HTMLElement | null>;
  trimmedQuery: string;
  showBookmarkedOnly: boolean;
  searchScopeLabel: string;
  matchedPresentationCount: number;
  filteredSessions: FilteredSession[];
  bookmarkedPresentationIds: Set<PresentationId>;
  bookmarkedSessionIds: Set<SessionId>;
  sessionSlackLinks: Partial<Record<SessionId, string>>;
  useSlackAppLinks?: boolean;
  slackTeamId?: string | null;
  showAuthors: boolean;
  includeSessionTitleForNoPresentationSessions: boolean;
  includeSessionTitleForPresentationSessions: boolean;
  sessionsVisible: boolean;
  sessionRefs: RefObject<Record<string, HTMLElement | null>>;
  onToggleExpanded: (sessionId: SessionId) => void;
  onScrollToSessionTop: (sessionId: SessionId) => void;
  onPersonClick: (personId: PersonId | null) => void;
  onJumpToSession: (sessionId: SessionId) => void;
  onToggleBookmark: (presentationId: PresentationId) => void;
  onToggleSessionBookmark: (sessionId: SessionId) => void;
}) {
  return (
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
            useSlackAppLinks={useSlackAppLinks}
            slackTeamId={slackTeamId}
            presIds={presIds}
            data={data}
            showAuthors={showAuthors}
            query={trimmedQuery}
            includeSessionTitleForNoPresentationSessions={includeSessionTitleForNoPresentationSessions}
            includeSessionTitleForPresentationSessions={includeSessionTitleForPresentationSessions}
            expanded={sessionsVisible}
            onToggleExpanded={() => onToggleExpanded(sessionId)}
            onScrollToSessionTop={onScrollToSessionTop}
            onPersonClick={onPersonClick}
            onJumpToSession={onJumpToSession}
            onToggleBookmark={onToggleBookmark}
            onToggleSessionBookmark={onToggleSessionBookmark}
            ref={(el) => {
              sessionRefs.current[sessionId] = el;
            }}
          />
        ))}
      </div>
    </main>
  );
}
