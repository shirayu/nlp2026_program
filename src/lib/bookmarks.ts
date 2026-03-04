import type { PresentationId } from "../types";
import type { FilteredSession } from "./filters";

export function filterBookmarkedSessions(
  sessions: FilteredSession[],
  bookmarkedPresentationIds: Set<PresentationId>,
  bookmarkedOnly: boolean,
): FilteredSession[] {
  if (!bookmarkedOnly) return sessions;

  return sessions
    .map((session) => ({
      ...session,
      presIds: session.presIds.filter((presentationId) => bookmarkedPresentationIds.has(presentationId)),
    }))
    .filter((session) => session.presIds.length > 0);
}
