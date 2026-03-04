import { mapSlackChannelsToUrls } from "../lib/slack";
import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

export async function fetchConferenceData(): Promise<ConferenceData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
  return response.json();
}

export async function fetchSessionSlackLinks(): Promise<Record<string, string>> {
  const response = await fetch(`${import.meta.env.BASE_URL}slack.json`);
  const channels = (await response.json()) as Partial<Record<SessionId, SlackChannelRef>>;
  return mapSlackChannelsToUrls(channels);
}
