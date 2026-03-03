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
      sessionId: SessionId;
      session: ConferenceData["sessions"][string];
      presIds: PresentationId[];
      data: ConferenceData;
      showAuthors: boolean;
      query: string;
      onPersonClick: (id: PersonId) => void;
      onJumpToSession: (sid: SessionId) => void;
    }
  >(function SessionCard(
    { sessionId, session, presIds, data, showAuthors, query, onPersonClick, onJumpToSession },
    ref,
  ) {
    const roomTheme = getRoomTheme(getSessionRoomNames(session, data.rooms)[0] ?? "");
    const roomLabel = sessionRoomsLabel(session, data.rooms);
    const workshopParentTitle = (() => {
      const match = sessionId.match(/^(WS\d+)-/);
      if (!match) return null;
      return data.sessions[match[1]]?.title ?? null;
    })();

    return (
      <section
        ref={ref}
        className={`rounded-xl shadow-sm ${roomTheme.surface}`}
        style={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}
      >
        <div className={`sticky top-0 z-10 rounded-t-xl px-4 py-3 shadow-sm ${roomTheme.header}`}>
          <h2 className={`text-sm font-semibold leading-snug ${roomTheme.title}`}>
            <HighlightedText text={session.title || sessionId} query={query} />
          </h2>
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
        <ul className="overflow-hidden rounded-b-xl divide-y divide-slate-200/80">
          {presIds.length > 0 ? (
            presIds.map((pid) => (
              <PresentationCard
                key={pid}
                pid={pid}
                data={data}
                showAuthors={showAuthors}
                query={query}
                onPersonClick={onPersonClick}
                onJumpToSession={onJumpToSession}
              />
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-gray-500">{ja.noSessionData}</li>
          )}
        </ul>
      </section>
    );
  }),
);
