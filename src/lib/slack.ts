import type { SessionId, SlackChannelRef } from "../types";

export function buildSlackChannelUrl({ team, channel_id }: SlackChannelRef): string {
  const params = new URLSearchParams({
    team,
    id: channel_id,
  });
  return `slack://channel?${params.toString()}`;
}

export function mapSlackChannelsToUrls(
  channels: Partial<Record<SessionId, SlackChannelRef>>,
): Record<SessionId, string> {
  return Object.fromEntries(
    Object.entries(channels).map(([sessionId, channel]) => [sessionId, buildSlackChannelUrl(channel)]),
  ) as Record<SessionId, string>;
}
