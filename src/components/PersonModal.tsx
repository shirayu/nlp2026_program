import { X } from "lucide-react";
import { sessionRoomsLabel } from "../constants";
import { formatSessionDateTime } from "../lib/date";
import { ja } from "../locales/ja";
import type { ConferenceData, PersonId, PresentationId, SessionId, VenueZoomUrls } from "../types";
import { PresentationListItem } from "./PresentationListItem";

export function PersonModal({
  personId,
  data,
  bookmarkedPresentationIds,
  showAuthors,
  useSlackAppLinks = false,
  slackTeamId = null,
  venueZoomUrls,
  onClose,
  onPersonClick,
  onJumpToSession,
  onToggleBookmark,
}: {
  personId: PersonId;
  data: ConferenceData;
  bookmarkedPresentationIds: Set<PresentationId>;
  showAuthors: boolean;
  useSlackAppLinks?: boolean;
  slackTeamId?: string | null;
  venueZoomUrls?: VenueZoomUrls;
  onClose: () => void;
  onPersonClick: (id: PersonId) => void;
  onJumpToSession: (sid: SessionId) => void;
  onToggleBookmark: (id: PresentationId) => void;
}) {
  const person = data.persons[personId];
  const presentations = Object.entries(data.presentations).filter(([, p]) =>
    p.authors.some((a) => a.person_id === personId),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <button type="button" aria-label={ja.closeDisplaySettings} className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white pb-8">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-indigo-100 bg-indigo-50/95 px-4 py-3 backdrop-blur">
          <h2 className="text-sm font-bold text-indigo-900">
            {ja.personPresentations(person?.name ?? personId, presentations.length)}
          </h2>
          <button type="button" onClick={onClose} className="text-indigo-400 hover:text-indigo-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {presentations.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">{ja.noPresentation}</li>}
          {presentations.map(([pid, p]) => {
            const session = data.sessions[p.session_id];
            return (
              <PresentationListItem
                key={pid}
                pid={pid as PresentationId}
                data={data}
                bookmarked={bookmarkedPresentationIds.has(pid as PresentationId)}
                showAuthors={showAuthors}
                query=""
                useSlackAppLinks={useSlackAppLinks}
                slackTeamId={slackTeamId}
                venueZoomUrls={venueZoomUrls}
                onPersonClick={onPersonClick}
                onJumpToSession={onJumpToSession}
                onToggleBookmark={onToggleBookmark}
                secondaryContent={
                  session ? (
                    <button
                      type="button"
                      className="mt-1 block text-left text-xs text-indigo-600 hover:underline"
                      onClick={() => onJumpToSession(p.session_id as SessionId)}
                    >
                      {formatSessionDateTime(session.date, session.start_time, session.end_time)}{" "}
                      {sessionRoomsLabel(session, data.rooms)}
                    </button>
                  ) : undefined
                }
                className="px-4 py-3"
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}
