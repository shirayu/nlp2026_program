import { ChevronDown, ChevronUp, Globe, Hash, Star } from "lucide-react";
import { forwardRef, memo } from "react";
import { getRoomTheme, getSessionRoomNames, sessionRoomsLabel } from "../constants";
import { formatSessionDateTime } from "../lib/date";
import { ja } from "../locales/ja";
import type { ConferenceData, PersonId, PresentationId, SessionId } from "../types";
import { HighlightedText } from "./HighlightedText";
import { PresentationCard } from "./PresentationCard";

export const SessionCard = memo(
  forwardRef<
    HTMLElement,
    {
      bookmarkedPresentationIds: Set<PresentationId>;
      bookmarkedSessionIds: Set<SessionId>;
      sessionId: SessionId;
      session: ConferenceData["sessions"][string];
      sessionSlackUrl?: string;
      presIds: PresentationId[];
      data: ConferenceData;
      showAuthors: boolean;
      query: string;
      expanded: boolean;
      onToggleExpanded: () => void;
      onPersonClick: (id: PersonId) => void;
      onJumpToSession: (sid: SessionId) => void;
      onToggleBookmark: (id: PresentationId) => void;
      onToggleSessionBookmark: (id: SessionId) => void;
    }
  >(function SessionCard(
    {
      bookmarkedPresentationIds,
      bookmarkedSessionIds,
      sessionId,
      session,
      sessionSlackUrl,
      presIds,
      data,
      showAuthors,
      query,
      expanded,
      onToggleExpanded,
      onPersonClick,
      onJumpToSession,
      onToggleBookmark,
      onToggleSessionBookmark,
    },
    ref,
  ) {
    const roomTheme = getRoomTheme(getSessionRoomNames(session, data.rooms)[0] ?? "");
    const roomLabel = sessionRoomsLabel(session, data.rooms);
    const sessionBookmarked = bookmarkedSessionIds.has(sessionId);
    const workshopParentTitle = (() => {
      const match = sessionId.match(/^(WS\d+)-/);
      if (!match) return null;
      return data.sessions[match[1]]?.title ?? null;
    })();

    return (
      <section ref={ref} className={`rounded-xl shadow-sm ${roomTheme.surface}`}>
        <div className={`sticky top-0 z-10 rounded-t-xl px-4 py-3 shadow-sm ${roomTheme.header}`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${roomTheme.title}`}>
              <HighlightedText text={session.title || sessionId} query={query} />
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {session.url && (
                <a
                  href={session.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-full p-1 transition-colors hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${roomTheme.title}`}
                  aria-label={ja.openSessionSite}
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
              {sessionSlackUrl && (
                <a
                  href={sessionSlackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-full p-1 transition-colors hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${roomTheme.title}`}
                  aria-label={ja.openSessionSlack}
                >
                  <Hash className="h-4 w-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => onToggleSessionBookmark(sessionId)}
                className={`rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  sessionBookmarked
                    ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600"
                    : `hover:bg-white/60 ${roomTheme.title}`
                }`}
                aria-label={sessionBookmarked ? ja.removeBookmark : ja.addBookmark}
                aria-pressed={sessionBookmarked}
              >
                <Star className={`h-4 w-4 ${sessionBookmarked ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onToggleExpanded}
                className={`rounded-full p-1 transition-colors hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${roomTheme.title}`}
                aria-label={expanded ? ja.collapseSessionDetails : ja.expandSessionDetails}
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className={`mt-0.5 text-xs ${roomTheme.meta}`}>
            {formatSessionDateTime(session.date, session.start_time, session.end_time)}{" "}
            <HighlightedText text={roomLabel} query={query} />
          </p>
          {workshopParentTitle && (
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              <HighlightedText text={workshopParentTitle} query={query} />
            </p>
          )}
          {session.chair && (
            <p className={`text-xs ${roomTheme.meta}`}>
              {ja.chair}
              <HighlightedText text={session.chair} query={query} />
            </p>
          )}
        </div>
        {expanded && (
          <ul className="overflow-hidden divide-y divide-slate-200/80 rounded-b-xl">
            {presIds.length > 0 ? (
              presIds.map((pid) => (
                <PresentationCard
                  key={pid}
                  pid={pid}
                  data={data}
                  bookmarked={bookmarkedPresentationIds.has(pid)}
                  showAuthors={showAuthors}
                  query={query}
                  onPersonClick={onPersonClick}
                  onJumpToSession={onJumpToSession}
                  onToggleBookmark={onToggleBookmark}
                />
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-500">{ja.noSessionData}</li>
            )}
          </ul>
        )}
      </section>
    );
  }),
);
