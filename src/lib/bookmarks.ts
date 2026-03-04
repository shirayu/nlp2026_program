import type { PresentationId, SessionId } from "../types";
import type { FilteredSession } from "./filters";

export function filterBookmarkedSessions(
  sessions: FilteredSession[],
  bookmarkedPresentationIds: Set<PresentationId>,
  bookmarkedSessionIds: Set<SessionId>,
  bookmarkedOnly: boolean,
): FilteredSession[] {
  if (!bookmarkedOnly) return sessions;

  return sessions
    .map((session) => {
      if (bookmarkedSessionIds.has(session.sessionId)) {
        return session;
      }

      return {
        ...session,
        presIds: session.presIds.filter((presentationId) => bookmarkedPresentationIds.has(presentationId)),
      };
    })
    .filter((session) => bookmarkedSessionIds.has(session.sessionId) || session.presIds.length > 0);
}
