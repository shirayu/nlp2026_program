import { ChevronDown, ChevronUp, Globe, Star } from "lucide-react";
import { forwardRef, memo } from "react";
import { getRoomTheme, getSessionRoomNames, sessionRoomsLabel } from "../constants";
import { formatSessionDateTime } from "../lib/date";
import { toSlackMessageAppUrl } from "../lib/slack";
import { resolveSessionZoomUrl } from "../lib/zoom";
import { ja } from "../locales/ja";
import { HashIcon, YoutubeIcon, ZoomIcon } from "../pages/programPage/icons";
import { openSlackFromSpa } from "../pages/programPage/utils";
import type { ConferenceData, PersonId, PresentationId, SessionId, VenueZoomUrls } from "../types";
import { HighlightedText } from "./HighlightedText";
import { PresentationCard } from "./PresentationCard";

function getSessionTitleQuery(
  sessionId: SessionId,
  session: ConferenceData["sessions"][string],
  data: ConferenceData,
  query: string,
  includeSessionTitleForNoPresentationSessions: boolean,
  includeSessionTitleForPresentationSessions: boolean,
): string {
  const hasPresentations =
    session.presentation_ids.length > 0 ||
    Object.values(data.presentations).some((presentation) => presentation.session_id === sessionId);
  const titleHighlightEnabled = hasPresentations
    ? includeSessionTitleForPresentationSessions
    : includeSessionTitleForNoPresentationSessions;
  return titleHighlightEnabled ? query : "";
}

function SessionHeaderActions({
  session,
  sessionId,
  sessionSlackUrl,
  useSlackAppLinks,
  sessionZoomUrl,
  sessionZoomAppUrl,
  roomThemeTitleClass,
  sessionBookmarked,
  expanded,
  onToggleSessionBookmark,
  onToggleExpanded,
}: {
  session: ConferenceData["sessions"][string];
  sessionId: SessionId;
  sessionSlackUrl?: string;
  useSlackAppLinks: boolean;
  sessionZoomUrl: string | null;
  sessionZoomAppUrl: string | null;
  roomThemeTitleClass: string;
  sessionBookmarked: boolean;
  expanded: boolean;
  onToggleSessionBookmark: (id: SessionId) => void;
  onToggleExpanded: () => void;
}) {
  const sharedClass = `rounded-full p-1 transition-colors hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${roomThemeTitleClass}`;
  const zoomClass =
    "rounded-full p-1 text-gray-600 transition-colors hover:bg-white/60 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  return (
    <div className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-1">
      {session.youtube_url && (
        <a
          href={session.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className={sharedClass}
          aria-label={ja.openSessionYoutube}
        >
          <YoutubeIcon className="h-4 w-4" />
        </a>
      )}
      {sessionZoomUrl && (
        <a
          href={useSlackAppLinks && sessionZoomAppUrl ? sessionZoomAppUrl : sessionZoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={zoomClass}
          aria-label={ja.openSessionZoom}
          onClick={(event) => {
            if (useSlackAppLinks && sessionZoomAppUrl) {
              openSlackFromSpa(event, sessionZoomUrl, sessionZoomAppUrl);
            }
          }}
        >
          <ZoomIcon className="h-4 w-4" />
        </a>
      )}
      {session.url && (
        <a
          href={session.url}
          target="_blank"
          rel="noopener noreferrer"
          className={sharedClass}
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
          className={sharedClass}
          aria-label={ja.openSessionSlack}
        >
          <HashIcon className="h-4 w-4" />
        </a>
      )}
      <button
        type="button"
        onClick={() => onToggleSessionBookmark(sessionId)}
        className={`rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          sessionBookmarked
            ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600"
            : `hover:bg-white/60 ${roomThemeTitleClass}`
        }`}
        aria-label={sessionBookmarked ? ja.removeBookmark : ja.addBookmark}
        aria-pressed={sessionBookmarked}
      >
        <Star className={`h-4 w-4 ${sessionBookmarked ? "fill-current" : ""}`} />
      </button>
      <button
        type="button"
        onClick={onToggleExpanded}
        className={sharedClass}
        aria-label={expanded ? ja.collapseSessionDetails : ja.expandSessionDetails}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SessionMetadata({
  session,
  roomThemeMetaClass,
  roomLabel,
  query,
  workshopParentTitle,
}: {
  session: ConferenceData["sessions"][string];
  roomThemeMetaClass: string;
  roomLabel: string;
  query: string;
  workshopParentTitle: string | null;
}) {
  return (
    <>
      <p className={`mt-0.5 text-xs ${roomThemeMetaClass}`}>
        {formatSessionDateTime(session.date, session.start_time, session.end_time)}{" "}
        <HighlightedText text={roomLabel} query={query} />
      </p>
      {workshopParentTitle && (
        <p className="mt-1 text-[11px] font-medium text-slate-500">
          <HighlightedText text={workshopParentTitle} query={query} />
        </p>
      )}
      {session.chair && (
        <p className={`text-xs ${roomThemeMetaClass}`}>
          {ja.chair}
          <HighlightedText text={session.chair} query={query} />
        </p>
      )}
    </>
  );
}

function SessionPresentationList({
  expanded,
  presIds,
  data,
  bookmarkedPresentationIds,
  showAuthors,
  query,
  useSlackAppLinks,
  slackTeamId,
  venueZoomUrls,
  onPersonClick,
  onJumpToSession,
  onToggleBookmark,
}: {
  expanded: boolean;
  presIds: PresentationId[];
  data: ConferenceData;
  bookmarkedPresentationIds: Set<PresentationId>;
  showAuthors: boolean;
  query: string;
  useSlackAppLinks: boolean;
  slackTeamId: string | null;
  venueZoomUrls?: VenueZoomUrls;
  onPersonClick: (id: PersonId) => void;
  onJumpToSession: (sid: SessionId) => void;
  onToggleBookmark: (id: PresentationId) => void;
}) {
  if (!expanded) {
    return null;
  }

  return (
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
            useSlackAppLinks={useSlackAppLinks}
            slackTeamId={slackTeamId}
            venueZoomUrls={venueZoomUrls}
            onPersonClick={onPersonClick}
            onJumpToSession={onJumpToSession}
            onToggleBookmark={onToggleBookmark}
          />
        ))
      ) : (
        <li className="px-4 py-3 text-sm text-gray-500">{ja.noSessionData}</li>
      )}
    </ul>
  );
}

export const SessionCard = memo(
  forwardRef<
    HTMLElement,
    {
      bookmarkedPresentationIds: Set<PresentationId>;
      bookmarkedSessionIds: Set<SessionId>;
      sessionId: SessionId;
      session: ConferenceData["sessions"][string];
      sessionSlackUrl?: string;
      useSlackAppLinks?: boolean;
      slackTeamId?: string | null;
      venueZoomUrls?: VenueZoomUrls;
      presIds: PresentationId[];
      data: ConferenceData;
      showAuthors: boolean;
      query: string;
      includeSessionTitleForNoPresentationSessions: boolean;
      includeSessionTitleForPresentationSessions: boolean;
      expanded: boolean;
      onToggleExpanded: () => void;
      onScrollToSessionTop: (sid: SessionId) => void;
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
      useSlackAppLinks = false,
      slackTeamId = null,
      venueZoomUrls,
      presIds,
      data,
      showAuthors,
      query,
      includeSessionTitleForNoPresentationSessions,
      includeSessionTitleForPresentationSessions,
      expanded,
      onToggleExpanded,
      onScrollToSessionTop,
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
    const sessionTitleQuery = getSessionTitleQuery(
      sessionId,
      session,
      data,
      query,
      includeSessionTitleForNoPresentationSessions,
      includeSessionTitleForPresentationSessions,
    );
    const sessionZoomUrl = resolveSessionZoomUrl(session, data.rooms, session.zoom_url ?? null, venueZoomUrls);
    const sessionZoomAppUrl = sessionZoomUrl ? toSlackMessageAppUrl(sessionZoomUrl, slackTeamId) : null;

    return (
      <section ref={ref} className={`rounded-xl shadow-sm ${roomTheme.surface}`}>
        <div className={`sticky top-0 z-10 rounded-t-xl px-4 py-3 shadow-sm ${roomTheme.header} relative`}>
          <button
            type="button"
            className="absolute inset-0 rounded-t-xl focus:outline-none"
            onClick={() => onScrollToSessionTop(sessionId)}
            aria-label={ja.jumpToSessionTop}
          />
          <div className="pointer-events-none relative flex items-start justify-between gap-3">
            <h2 className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${roomTheme.title}`}>
              <HighlightedText text={session.title || sessionId} query={sessionTitleQuery} />
            </h2>
            <SessionHeaderActions
              session={session}
              sessionId={sessionId}
              sessionSlackUrl={sessionSlackUrl}
              useSlackAppLinks={useSlackAppLinks}
              sessionZoomUrl={sessionZoomUrl}
              sessionZoomAppUrl={sessionZoomAppUrl}
              roomThemeTitleClass={roomTheme.title}
              sessionBookmarked={sessionBookmarked}
              expanded={expanded}
              onToggleSessionBookmark={onToggleSessionBookmark}
              onToggleExpanded={onToggleExpanded}
            />
          </div>
          <SessionMetadata
            session={session}
            roomThemeMetaClass={roomTheme.meta}
            roomLabel={roomLabel}
            query={query}
            workshopParentTitle={workshopParentTitle}
          />
        </div>
        <SessionPresentationList
          expanded={expanded}
          presIds={presIds}
          data={data}
          bookmarkedPresentationIds={bookmarkedPresentationIds}
          showAuthors={showAuthors}
          query={query}
          useSlackAppLinks={useSlackAppLinks}
          slackTeamId={slackTeamId}
          venueZoomUrls={venueZoomUrls}
          onPersonClick={onPersonClick}
          onJumpToSession={onJumpToSession}
          onToggleBookmark={onToggleBookmark}
        />
      </section>
    );
  }),
);
