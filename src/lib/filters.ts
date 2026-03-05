import { compareRooms, getSessionRoomNames, roomShort } from "../constants";
import type { ConferenceData, PresentationId, Room, Session, SessionId } from "../types";

export interface FilteredSession {
  sessionId: SessionId;
  session: Session;
  presIds: PresentationId[];
}

export interface FilterOptions {
  query: string;
  selectedDate: string | null;
  selectedTime: string | null;
  selectedRoom: string | null;
  /** 全発表を対象にテキスト検索するか。false のときは絞り込み済みセッションのみ検索 */
  searchAll: boolean;
  /** ブックマーク全体表示中か。true のときは searchAll と組み合わせて場所系フィルタを外す */
  bookmarkedOnly?: boolean;
}

export function normalizeTerms(query: string): string[] {
  return [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];
}

const workshopParentSessionSetCache = new WeakMap<Record<SessionId, Session>, ReadonlySet<SessionId>>();
const sortedSessionEntriesCache = new WeakMap<Record<SessionId, Session>, ReadonlyArray<[SessionId, Session]>>();

function matchesAllTerms(texts: (string | null | undefined)[], terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystacks = texts
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.toLowerCase());

  return terms.every((term) => haystacks.some((value) => value.includes(term)));
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function fromMinutes(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

function isSessionActiveAt(session: Session, selectedTime: string | null): boolean {
  if (!selectedTime) return true;
  const target = toMinutes(selectedTime);
  return toMinutes(session.start_time) <= target && target < toMinutes(session.end_time);
}

function matchesRoomFilter(session: Session, rooms: ConferenceData["rooms"], selectedRoom: string | null): boolean {
  if (!selectedRoom) return true;
  return getSessionRoomNames(session, rooms).some((room) => roomShort(room) === selectedRoom);
}

function getSessionPresentationIds(data: ConferenceData, sessionId: SessionId, session: Session): PresentationId[] {
  if (session.presentation_ids.length > 0) {
    return session.presentation_ids;
  }

  return Object.entries(data.presentations)
    .filter(([, presentation]) => presentation.session_id === sessionId)
    .map(([id]) => id);
}

function getPresentationSearchTexts(
  data: ConferenceData,
  presentationId: PresentationId,
): {
  summaryTexts: (string | null | undefined)[];
  allTexts: (string | null | undefined)[];
} {
  const presentation = data.presentations[presentationId];
  if (!presentation) {
    return {
      summaryTexts: [],
      allTexts: [],
    };
  }

  const presenterName = presentation.presenter_id ? (data.persons[presentation.presenter_id]?.name ?? null) : null;

  const authorTexts = presentation.authors.flatMap((author) => [
    data.persons[author.person_id]?.name,
    author.affiliation_id ? data.affiliations[author.affiliation_id]?.name : null,
  ]);

  return {
    summaryTexts: [presentationId, presentation.title, presenterName ?? ""],
    allTexts: [presentationId, presentation.title, ...authorTexts],
  };
}

function matchesPresentationTerms(data: ConferenceData, presentationId: PresentationId, terms: string[]): boolean {
  return matchesAllTerms(getPresentationSearchTexts(data, presentationId).allTexts, terms);
}

export function hasPresentationHiddenSearchMatch(
  data: ConferenceData,
  presentationId: PresentationId,
  query: string,
  showAuthors: boolean,
): boolean {
  const terms = normalizeTerms(query);
  if (terms.length === 0) return false;

  const { summaryTexts, allTexts } = getPresentationSearchTexts(data, presentationId);
  if (!matchesAllTerms(allTexts, terms)) return false;

  const visibleTexts = showAuthors ? summaryTexts : summaryTexts.slice(0, 2);
  return !matchesAllTerms(visibleTexts, terms);
}

function shouldSkipLocationFilter(searchAll: boolean, hasQuery: boolean, bookmarkedOnly: boolean): boolean {
  return searchAll && (hasQuery || bookmarkedOnly);
}

function matchesSessionFilters(
  data: ConferenceData,
  session: Session,
  opts: Pick<
    FilterOptions,
    "selectedDate" | "selectedTime" | "selectedRoom" | "searchAll" | "query" | "bookmarkedOnly"
  > & { hasQuery: boolean },
): boolean {
  if (shouldSkipLocationFilter(opts.searchAll, opts.hasQuery, opts.bookmarkedOnly ?? false)) return true;
  if (opts.selectedDate && session.date !== opts.selectedDate) return false;
  if (!isSessionActiveAt(session, opts.selectedTime)) return false;
  return matchesRoomFilter(session, data.rooms, opts.selectedRoom);
}

function toFilteredSession(
  data: ConferenceData,
  sessionId: SessionId,
  session: Session,
  terms: string[],
): FilteredSession | null {
  const presIds = getSessionPresentationIds(data, sessionId, session);
  if (terms.length === 0) {
    return { sessionId, session, presIds };
  }

  const matching = presIds.filter((presentationId) => matchesPresentationTerms(data, presentationId, terms));
  if (matching.length === 0) return null;
  return { sessionId, session, presIds: matching };
}

function isWorkshopParentSession(sessionId: SessionId, sessions: Record<SessionId, Session>): boolean {
  return getWorkshopParentSessionSet(sessions).has(sessionId);
}

function getWorkshopParentSessionSet(sessions: Record<SessionId, Session>): ReadonlySet<SessionId> {
  const cached = workshopParentSessionSetCache.get(sessions);
  if (cached) return cached;

  const sessionIds = Object.keys(sessions) as SessionId[];
  const idSet = new Set(sessionIds);
  const parents = new Set<SessionId>();

  for (const sessionId of sessionIds) {
    const match = /^(WS\d+)-/.exec(sessionId);
    if (!match) continue;
    const parent = match[1] as SessionId;
    if (idSet.has(parent)) {
      parents.add(parent);
    }
  }

  workshopParentSessionSetCache.set(sessions, parents);
  return parents;
}

function getSortedSessionEntries(sessions: Record<SessionId, Session>): ReadonlyArray<[SessionId, Session]> {
  const cached = sortedSessionEntriesCache.get(sessions);
  if (cached) return cached;

  const sorted = Object.entries(sessions)
    .map(([sessionId, session]) => [sessionId as SessionId, session] as [SessionId, Session])
    .sort(([, a], [, b]) => {
      const da = `${a.date} ${a.start_time.padStart(5, "0")}`;
      const db = `${b.date} ${b.start_time.padStart(5, "0")}`;
      return da.localeCompare(db);
    });

  sortedSessionEntriesCache.set(sessions, sorted);
  return sorted;
}

/** 全日付一覧（フィルタなし） */
export function getAvailableDates(sessions: Record<SessionId, Session>): string[] {
  return [
    ...new Set(
      Object.entries(sessions)
        .filter(([sessionId]) => !isWorkshopParentSession(sessionId as SessionId, sessions))
        .map(([, s]) => s.date),
    ),
  ].sort();
}

/** selectedDate の日に存在する時点一覧 */
export function getAvailableTimes(sessions: Record<SessionId, Session>, selectedDate: string | null): string[] {
  const filtered = Object.entries(sessions)
    .filter(
      ([sessionId, s]) =>
        !isWorkshopParentSession(sessionId as SessionId, sessions) && (!selectedDate || s.date === selectedDate),
    )
    .map(([, s]) => s);

  if (filtered.length === 0) return [];

  const minMinutes = Math.min(...filtered.map((s) => toMinutes(s.start_time)));
  const maxMinutes = Math.max(...filtered.map((s) => toMinutes(s.end_time)));

  const points: string[] = [];
  for (let current = minMinutes; current <= maxMinutes; current += 5) {
    points.push(fromMinutes(current));
  }
  return points;
}

/** selectedDate + selectedTime に存在する会場一覧 */
export function getAvailableRooms(
  sessions: Record<SessionId, Session>,
  rooms: Record<string, Room>,
  selectedDate: string | null,
  selectedTime: string | null,
): string[] {
  return [
    ...new Set(
      Object.entries(sessions)
        .filter(
          ([sessionId, s]) =>
            !isWorkshopParentSession(sessionId as SessionId, sessions) &&
            (!selectedDate || s.date === selectedDate) &&
            isSessionActiveAt(s, selectedTime),
        )
        .flatMap(([, s]) => getSessionRoomNames(s, rooms).map(roomShort)),
    ),
  ].sort(compareRooms);
}

/** セッション・発表の絞り込み */
export function filterSessions(data: ConferenceData, opts: FilterOptions): FilteredSession[] {
  const { query, selectedDate, selectedTime, selectedRoom, searchAll, bookmarkedOnly = false } = opts;
  const terms = normalizeTerms(query);
  const hasQuery = terms.length > 0;
  const sortedSessions = getSortedSessionEntries(data.sessions);

  return sortedSessions.flatMap(([sessionId, session]) => {
    if (isWorkshopParentSession(sessionId as SessionId, data.sessions)) return [];
    if (
      !matchesSessionFilters(data, session, {
        query,
        hasQuery,
        selectedDate,
        selectedTime,
        selectedRoom,
        searchAll,
        bookmarkedOnly,
      })
    ) {
      return [];
    }

    const filteredSession = toFilteredSession(data, sessionId as SessionId, session, terms);
    return filteredSession ? [filteredSession] : [];
  });
}
