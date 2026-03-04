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
