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
  url?: string | null;
  youtube_url?: string | null;
  zoom_url?: string | null;
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
  start_time?: string | null;
  end_time?: string | null;
  oral_session_id?: SessionId;
  authors: PresentationAuthor[];
  pdf_url: string | null;
  zoom_url?: string | null;
}

export interface SlackChannelRef {
  team: string;
  channel_id: string;
}

export interface AppSettings {
  showAuthors: boolean;
  useSlackAppLinks: boolean;
  showRoomFloorLabels: boolean;
  includeSessionTitleForNoPresentationSessions: boolean;
  includeSessionTitleForPresentationSessions: boolean;
  showTimeAtPresentationLevel: boolean;
  zoomCustomUrls?: ZoomCustomUrls;
}

export interface VenueZoomUrls {
  A?: string;
  B?: string;
  C?: string;
  P?: string;
}

export interface ZoomCustomUrls {
  venues?: VenueZoomUrls;
  sessions?: Record<SessionId, string>;
  presentations?: Record<PresentationId, string>;
}

export interface ExportPayload {
  settings: AppSettings;
  bookmarks: {
    presentationIds: PresentationId[];
    sessionIds: SessionId[];
  };
}

export interface LastUpdateEntry {
  sha256: string | null;
  time: string;
}

export interface ConferenceData {
  generated_at?: string;
  last_update?: Record<string, LastUpdateEntry>;
  session_slack_channels?: Partial<Record<SessionId, SlackChannelRef>>;
  persons: Record<PersonId, Person>;
  affiliations: Record<AffiliationId, Affiliation>;
  rooms: Record<RoomId, Room>;
  sessions: Record<SessionId, Session>;
  presentations: Record<PresentationId, Presentation>;
}
