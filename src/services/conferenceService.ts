import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

export async function fetchConferenceData(): Promise<ConferenceData> {
  const response = await fetch(`${import.meta.env.BASE_URL}${import.meta.env.VITE_CONFERENCE_DATA_FILE}`);
  return response.json();
}

export async function fetchSessionSlackChannels(): Promise<Partial<Record<SessionId, SlackChannelRef>>> {
  const response = await fetch(`${import.meta.env.BASE_URL}${import.meta.env.VITE_SESSION_SLACK_FILE}`);
  return (await response.json()) as Partial<Record<SessionId, SlackChannelRef>>;
}
