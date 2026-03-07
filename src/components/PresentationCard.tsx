import type { ConferenceData, PersonId, PresentationId, SessionId, ZoomCustomUrls } from "../types";
import { PresentationListItem } from "./PresentationListItem";

export function PresentationCard({
  pid,
  data,
  bookmarked,
  showAuthors,
  query,
  useSlackAppLinks,
  slackTeamId,
  zoomCustomUrls,
  onPersonClick,
  onJumpToSession,
  onToggleBookmark,
}: {
  pid: PresentationId;
  data: ConferenceData;
  bookmarked: boolean;
  showAuthors: boolean;
  query: string;
  useSlackAppLinks?: boolean;
  slackTeamId?: string | null;
  zoomCustomUrls?: ZoomCustomUrls;
  onPersonClick: (id: PersonId) => void;
  onJumpToSession: (sid: SessionId) => void;
  onToggleBookmark: (id: PresentationId) => void;
}) {
  return (
    <PresentationListItem
      pid={pid}
      data={data}
      bookmarked={bookmarked}
      showAuthors={showAuthors}
      query={query}
      useSlackAppLinks={useSlackAppLinks}
      slackTeamId={slackTeamId}
      zoomCustomUrls={zoomCustomUrls}
      onPersonClick={onPersonClick}
      onJumpToSession={onJumpToSession}
      onToggleBookmark={onToggleBookmark}
    />
  );
}
