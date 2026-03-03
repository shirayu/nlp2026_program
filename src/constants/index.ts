import type { ConferenceData, RoomId, RoomTheme, Session } from "../types";

export const OFFICIAL_SITE_URL = "https://www.anlp.jp/proceedings/annual_meeting/2026/";
export const VENUE_GUIDE_URL = "https://www.anlp.jp/nlp2026/pdf/venue_guide.pdf";
export const X_SEARCH_URL = "https://x.com/search?q=%23nlp2026";
export const SLACK_APP_URL = "slack://open?team=T0AFE8T2X2M";
export const SLACK_WEB_URL = "https://nlp2026utsunomiya.slack.com/";
export const AUTHOR_NAME = "Yuta Hayashibe";
export const AUTHOR_WEBSITE_URL = "https://hayashibe.jp";
export const PROJECT_REPOSITORY_URL = "https://github.com/shirayu/nlp2026_program";

const DEFAULT_ROOM_THEME: RoomTheme = {
  surface: "bg-slate-50",
  header: "bg-slate-100",
  title: "text-slate-900",
  meta: "text-slate-600",
  chipActive: "bg-slate-700 text-white ring-2 ring-offset-1 ring-slate-500 border border-slate-800 shadow-sm",
  chipInactive: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
};

const ROOM_THEMES: Record<string, RoomTheme> = {
  A: {
    surface: "bg-rose-50/40",
    header: "bg-rose-100",
    title: "text-rose-950",
    meta: "text-rose-700",
    chipActive: "bg-rose-600 text-white ring-2 ring-offset-1 ring-rose-400 border border-rose-700 shadow-sm",
    chipInactive: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  },
  B: {
    surface: "bg-amber-50/40",
    header: "bg-amber-100",
    title: "text-amber-950",
    meta: "text-amber-700",
    chipActive: "bg-amber-600 text-white ring-2 ring-offset-1 ring-amber-400 border border-amber-700 shadow-sm",
    chipInactive: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  },
  C: {
    surface: "bg-emerald-50/40",
    header: "bg-emerald-100",
    title: "text-emerald-950",
    meta: "text-emerald-700",
    chipActive: "bg-emerald-600 text-white ring-2 ring-offset-1 ring-emerald-400 border border-emerald-700 shadow-sm",
    chipInactive: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  },
  P: {
    surface: "bg-sky-50/40",
    header: "bg-sky-100",
    title: "text-sky-950",
    meta: "text-sky-700",
    chipActive: "bg-sky-600 text-white ring-2 ring-offset-1 ring-sky-400 border border-sky-700 shadow-sm",
    chipInactive: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  },
  Q: {
    surface: "bg-fuchsia-50/40",
    header: "bg-fuchsia-100",
    title: "text-fuchsia-950",
    meta: "text-fuchsia-700",
    chipActive: "bg-fuchsia-600 text-white ring-2 ring-offset-1 ring-fuchsia-400 border border-fuchsia-700 shadow-sm",
    chipInactive: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200",
  },
  M: {
    surface: "bg-violet-50/40",
    header: "bg-violet-100",
    title: "text-violet-950",
    meta: "text-violet-700",
    chipActive: "bg-violet-600 text-white ring-2 ring-offset-1 ring-violet-400 border border-violet-700 shadow-sm",
    chipInactive: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  },
};

const ROOM_NAME_ALIASES: Record<string, string> = {
  "1F 大ホール(東)": "A",
  "1F 大ホール(西)": "P",
  "2F": "B",
  "2F 大会議室201": "B",
  "2F 大会議室202": "C",
  "2F 大会議室201・202": "B",
  "3F": "M",
};

const ROOM_SHORT_LABEL_ALIASES: Record<string, string> = {
  "1F 大ホール(東)": "A",
  "1F 大ホール(西)": "P",
  "2F": "B",
  "2F 大会議室201": "B",
  "2F 大会議室201・202": "B",
};

const ROOM_SORT_ORDER = [
  "A",
  "B",
  "C",
  "P",
  "Q",
  "1F 大ホール(東)",
  "1F 大ホール(西)",
  "2F",
  "2F 大会議室201",
  "2F 大会議室201・202",
  "2F 大会議室202",
  "3F",
];

export function getRoomCode(room: string): string | null {
  const match = room.match(/^([A-Z])会場/);
  if (match) return match[1];
  if (/^[A-Z]$/.test(room.trim())) return room.trim();
  return ROOM_NAME_ALIASES[room] ?? ROOM_NAME_ALIASES[roomShort(room)] ?? null;
}

export function getRoomTheme(room: string): RoomTheme {
  const code = getRoomCode(room);
  return (code && ROOM_THEMES[code]) || DEFAULT_ROOM_THEME;
}

export function roomShort(room: string): string {
  const alias = ROOM_SHORT_LABEL_ALIASES[room.trim()];
  if (alias) return alias;
  const match = room.match(/^([A-Z])会場/);
  if (match) return match[1];
  return room.trim();
}

export function compareRooms(a: string, b: string): number {
  const aLabel = roomShort(a);
  const bLabel = roomShort(b);
  const aIndex = ROOM_SORT_ORDER.indexOf(aLabel);
  const bIndex = ROOM_SORT_ORDER.indexOf(bLabel);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    if (aIndex !== bIndex) return aIndex - bIndex;
  }
  return aLabel.localeCompare(bLabel, "ja");
}

export function resolveRoomNames(roomIds: RoomId[], rooms: ConferenceData["rooms"]): string[] {
  return roomIds.map((roomId) => rooms[roomId]?.name ?? roomId);
}

export function getSessionRoomNames(session: Session, rooms: ConferenceData["rooms"]): string[] {
  return resolveRoomNames(session.room_ids, rooms);
}

export function sessionRoomsLabel(session: Session, rooms: ConferenceData["rooms"]): string {
  return getSessionRoomNames(session, rooms).join(" / ");
}
