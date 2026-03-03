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
}

function normalizeTerms(query: string): string[] {
  return [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];
}

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

function matchesPresentationTerms(data: ConferenceData, presentationId: PresentationId, terms: string[]): boolean {
  const presentation = data.presentations[presentationId];
  if (!presentation) return false;

  const authorTexts = presentation.authors.flatMap((author) => [
    data.persons[author.person_id]?.name,
    author.affiliation_id ? data.affiliations[author.affiliation_id]?.name : null,
  ]);

  return matchesAllTerms([presentation.title, ...authorTexts], terms);
}

function shouldSkipLocationFilter(searchAll: boolean, hasQuery: boolean): boolean {
  return searchAll && hasQuery;
}

function matchesSessionFilters(
  data: ConferenceData,
  _sessionId: SessionId,
  session: Session,
  opts: Pick<FilterOptions, "selectedDate" | "selectedTime" | "selectedRoom" | "searchAll" | "query">,
): boolean {
  const hasQuery = normalizeTerms(opts.query).length > 0;
  if (shouldSkipLocationFilter(opts.searchAll, hasQuery)) return true;
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
  if (!/^WS\d+$/.test(sessionId)) return false;
  const childPrefix = `${sessionId}-`;
  return Object.keys(sessions).some((sid) => sid.startsWith(childPrefix));
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
  const { query, selectedDate, selectedTime, selectedRoom, searchAll } = opts;
  const terms = normalizeTerms(query);

  const sortedSessions = Object.entries(data.sessions).sort(([, a], [, b]) => {
    const da = `${a.date} ${a.start_time.padStart(5, "0")}`;
    const db = `${b.date} ${b.start_time.padStart(5, "0")}`;
    return da.localeCompare(db);
  });

  return sortedSessions.flatMap(([sessionId, session]) => {
    if (isWorkshopParentSession(sessionId as SessionId, data.sessions)) return [];
    if (
      !matchesSessionFilters(data, sessionId as SessionId, session, {
        query,
        selectedDate,
        selectedTime,
        selectedRoom,
        searchAll,
      })
    ) {
      return [];
    }

    const filteredSession = toFilteredSession(data, sessionId as SessionId, session, terms);
    return filteredSession ? [filteredSession] : [];
  });
}
