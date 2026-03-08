import type { ConferenceData, SessionId, SlackChannelRef } from "../types";

function withBuildVersion(path: string): string {
  const buildVersion = import.meta.env.VITE_BUILD_DATE || import.meta.env.VITE_BUILD_HASH;
  if (!buildVersion) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(buildVersion)}`;
}

function withExplicitVersion(path: string, version?: string): string {
  if (!version) return withBuildVersion(path);
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(version)}`;
}

export async function fetchConferenceData(): Promise<ConferenceData> {
  const basePath = `${import.meta.env.BASE_URL}${import.meta.env.VITE_CONFERENCE_DATA_FILE}`;
  const pathWithVersion = withExplicitVersion(basePath, import.meta.env.VITE_DATA_VERSION);
  return fetchJson<ConferenceData>(pathWithVersion);
}

export async function fetchSessionSlackChannels(): Promise<Partial<Record<SessionId, SlackChannelRef>>> {
  const pathWithVersion = withExplicitVersion(
    `${import.meta.env.BASE_URL}${import.meta.env.VITE_SESSION_SLACK_FILE}`,
    import.meta.env.VITE_SLACK_VERSION,
  );
  return fetchJson<Partial<Record<SessionId, SlackChannelRef>>>(pathWithVersion);
}

async function fetchJson<T>(pathWithVersion: string): Promise<T> {
  const response = await fetch(pathWithVersion);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${pathWithVersion}: ${response.status}`);
  }
  return (await response.json()) as T;
}
