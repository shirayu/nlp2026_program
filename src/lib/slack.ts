import type { SessionId, SlackChannelRef } from "../types";

export function buildSlackChannelAppUrl({ team, channel_id }: SlackChannelRef): string {
  const params = new URLSearchParams({
    team,
    id: channel_id,
  });
  return `slack://channel?${params.toString()}`;
}

export function buildSlackChannelWebUrl({ team, channel_id }: SlackChannelRef): string {
  return `https://app.slack.com/client/${encodeURIComponent(team)}/${encodeURIComponent(channel_id)}`;
}

export function buildSlackTeamAppUrl(team: string): string {
  const params = new URLSearchParams({ team });
  return `slack://open?${params.toString()}`;
}

export function buildSlackTeamWebUrl(team: string): string {
  return `https://app.slack.com/client/${encodeURIComponent(team)}`;
}

export function mapSlackChannelsToUrls(
  channels: Partial<Record<SessionId, SlackChannelRef>>,
  useAppLinks: boolean,
): Record<SessionId, string> {
  return Object.fromEntries(
    Object.entries(channels)
      .filter((entry): entry is [SessionId, SlackChannelRef] => entry[1] !== undefined)
      .map(([sessionId, channel]) => [
        sessionId,
        useAppLinks ? buildSlackChannelAppUrl(channel) : buildSlackChannelWebUrl(channel),
      ]),
  ) as Record<SessionId, string>;
}

export function getFirstSlackTeamId(channels: Partial<Record<SessionId, SlackChannelRef>>): string | null {
  for (const channel of Object.values(channels)) {
    if (channel?.team) {
      return channel.team;
    }
  }
  return null;
}

function toSlackMessageTs(raw: string): string {
  if (raw.length <= 10) return raw;
  const seconds = raw.slice(0, 10);
  const micros = raw.slice(10, 16).padEnd(6, "0");
  return `${seconds}.${micros}`;
}

export function buildSlackMessageAppUrl(team: string, channelId: string, messageTs: string): string {
  const params = new URLSearchParams({
    team,
    id: channelId,
    message: messageTs,
  });
  return `slack://channel?${params.toString()}`;
}

export function toSlackMessageAppUrl(messageUrl: string, team: string | null): string | null {
  if (!team) return null;

  let url: URL;
  try {
    url = new URL(messageUrl);
  } catch {
    return null;
  }

  if (!url.hostname.endsWith("slack.com")) return null;
  const match = url.pathname.match(/^\/archives\/([^/]+)\/p(\d{10,})$/);
  if (!match) return null;

  const channelId = decodeURIComponent(match[1]);
  const messageTs = toSlackMessageTs(match[2]);
  return buildSlackMessageAppUrl(team, channelId, messageTs);
}
