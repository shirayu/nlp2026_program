import type { ConferenceData, SessionSlackLink } from "../types";

export async function fetchConferenceData(): Promise<ConferenceData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
  return response.json();
}

export async function fetchSessionSlackLinks(): Promise<Record<string, string>> {
  const response = await fetch(`${import.meta.env.BASE_URL}slack.json`);
  const links = (await response.json()) as SessionSlackLink[];
  return Object.fromEntries(links.map(({ session_id, url }) => [session_id, url]));
}
