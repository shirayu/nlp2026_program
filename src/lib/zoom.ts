import { getRoomCode } from "../constants";
import type { ConferenceData, Presentation, Session, VenueZoomUrls } from "../types";

const CUSTOM_ZOOM_ROOM_CODES = new Set<keyof VenueZoomUrls>(["A", "B", "C", "P"]);

function getCustomVenueZoomUrl(
  session: Session,
  rooms: ConferenceData["rooms"],
  venueZoomUrls?: VenueZoomUrls,
): string | null {
  if (!venueZoomUrls) return null;

  for (const roomId of session.room_ids) {
    const roomName = rooms[roomId]?.name ?? roomId;
    const roomCode = getRoomCode(roomName);
    if (!roomCode || !CUSTOM_ZOOM_ROOM_CODES.has(roomCode as keyof VenueZoomUrls)) continue;

    const customUrl = venueZoomUrls[roomCode as keyof VenueZoomUrls];
    if (customUrl) {
      return customUrl;
    }
  }

  return null;
}

export function resolveSessionZoomUrl(
  session: Session,
  rooms: ConferenceData["rooms"],
  sessionZoomUrl: string | null,
  venueZoomUrls?: VenueZoomUrls,
): string | null {
  if (!sessionZoomUrl) {
    return null;
  }

  return getCustomVenueZoomUrl(session, rooms, venueZoomUrls) ?? sessionZoomUrl ?? null;
}

export function resolvePresentationZoomUrl(
  presentation: Presentation,
  data: ConferenceData,
  presentationZoomUrl: string | null,
  venueZoomUrls?: VenueZoomUrls,
): string | null {
  const session = data.sessions[presentation.session_id];
  if (!session) {
    return presentationZoomUrl ?? null;
  }

  return resolveSessionZoomUrl(session, data.rooms, presentationZoomUrl, venueZoomUrls);
}
