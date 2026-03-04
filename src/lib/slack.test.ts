import { describe, expect, it } from "vitest";
import { buildSlackChannelUrl, mapSlackChannelsToUrls } from "./slack";

describe("buildSlackChannelUrl", () => {
  it("team と channel_id から Slack URL を組み立てる", () => {
    expect(
      buildSlackChannelUrl({
        team: "T123",
        channel_id: "C456",
      }),
    ).toBe("slack://channel?team=T123&id=C456");
  });
});

describe("mapSlackChannelsToUrls", () => {
  it("セッションごとの Slack 参照情報を URL マップへ変換する", () => {
    expect(
      mapSlackChannelsToUrls({
        A1: {
          team: "T123",
          channel_id: "C456",
        },
      }),
    ).toEqual({
      A1: "slack://channel?team=T123&id=C456",
    });
  });
});
