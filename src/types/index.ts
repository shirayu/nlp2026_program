export type PersonId = string;
export type AffiliationId = string;
export type SessionId = string;
export type PresentationId = string;
export type RoomId = string;

export interface RoomTheme {
  surface: string;
  header: string;
  title: string;
  meta: string;
  chipActive: string;
  chipInactive: string;
}

export interface Person {
  name: string;
}

export interface Affiliation {
  name: string;
}

export interface Room {
  name: string;
}

export interface Session {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  room_ids: RoomId[];
  url?: string;
  youtube_url?: string;
  chair: string;
  presentation_ids: PresentationId[];
}

export interface PresentationAuthor {
  person_id: PersonId;
  affiliation_id: AffiliationId | null;
}

export interface Presentation {
  title: string;
  session_id: SessionId;
  presenter_id: PersonId | null;
  is_english: boolean;
  is_online: boolean;
  oral_session_id?: SessionId;
  authors: PresentationAuthor[];
  pdf_url: string | null;
}

export interface SlackChannelRef {
  team: string;
  channel_id: string;
}

export interface AppSettings {
  showAuthors: boolean;
  useSlackAppLinks: boolean;
}

export interface ConferenceData {
  generated_at?: string;
  persons: Record<PersonId, Person>;
  affiliations: Record<AffiliationId, Affiliation>;
  rooms: Record<RoomId, Room>;
  sessions: Record<SessionId, Session>;
  presentations: Record<PresentationId, Presentation>;
}
