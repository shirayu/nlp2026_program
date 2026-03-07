import { getRoomCode } from "../constants";
import type {
  ConferenceData,
  Presentation,
  PresentationId,
  Session,
  SessionId,
  VenueZoomUrls,
  ZoomCustomUrls,
} from "../types";

const CUSTOM_ZOOM_ROOM_CODES = new Set<keyof VenueZoomUrls>(["A", "B", "C", "P"]);

function normalizeZoomUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getCustomVenueZoomUrl(
  session: Session,
  rooms: ConferenceData["rooms"],
  zoomCustomUrls?: ZoomCustomUrls,
): string | null {
  if (!zoomCustomUrls?.venues) return null;

  for (const roomId of session.room_ids) {
    const roomName = rooms[roomId]?.name ?? roomId;
    const roomCode = getRoomCode(roomName);
    if (!roomCode || !CUSTOM_ZOOM_ROOM_CODES.has(roomCode as keyof VenueZoomUrls)) continue;

    const customUrl = normalizeZoomUrl(zoomCustomUrls.venues[roomCode as keyof VenueZoomUrls]);
    if (customUrl) {
      return customUrl;
    }
  }

  return null;
}

export function resolveSessionZoomUrl(
  sessionId: SessionId,
  session: Session,
  rooms: ConferenceData["rooms"],
  zoomCustomUrls?: ZoomCustomUrls,
): string | null {
  const sessionCustomUrl = normalizeZoomUrl(zoomCustomUrls?.sessions?.[sessionId]);
  const venueCustomUrl = getCustomVenueZoomUrl(session, rooms, zoomCustomUrls);
  const originalSessionUrl = normalizeZoomUrl(session.zoom_url ?? null);
  return sessionCustomUrl ?? venueCustomUrl ?? originalSessionUrl ?? null;
}

export function resolvePresentationZoomUrl(
  presentationId: PresentationId,
  presentation: Presentation,
  data: ConferenceData,
  zoomCustomUrls?: ZoomCustomUrls,
): string | null {
  const session = data.sessions[presentation.session_id];
  const presentationCustomUrl = normalizeZoomUrl(zoomCustomUrls?.presentations?.[presentationId]);
  if (presentationCustomUrl) {
    return presentationCustomUrl;
  }
  if (!session) {
    return normalizeZoomUrl(presentation.zoom_url ?? null);
  }

  const sessionCustomUrl = normalizeZoomUrl(zoomCustomUrls?.sessions?.[presentation.session_id]);
  const venueCustomUrl = getCustomVenueZoomUrl(session, data.rooms, zoomCustomUrls);
  const originalPresentationUrl = normalizeZoomUrl(presentation.zoom_url ?? null);
  const originalSessionUrl = normalizeZoomUrl(session.zoom_url ?? null);
  return sessionCustomUrl ?? venueCustomUrl ?? originalPresentationUrl ?? originalSessionUrl ?? null;
}
