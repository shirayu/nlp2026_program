import type { ConferenceData } from "../types";

export async function fetchConferenceData(): Promise<ConferenceData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
  return response.json();
}
