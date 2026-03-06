import type { ConferenceData, PersonId, PresentationId, SessionId } from "../types";
import { PresentationListItem } from "./PresentationListItem";

export function PresentationCard({
  pid,
  data,
  bookmarked,
  showAuthors,
  query,
  useSlackAppLinks,
  slackTeamId,
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
      onPersonClick={onPersonClick}
      onJumpToSession={onJumpToSession}
      onToggleBookmark={onToggleBookmark}
    />
  );
}
