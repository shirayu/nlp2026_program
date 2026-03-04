import { describe, expect, it } from "vitest";
import {
  buildSlackChannelAppUrl,
  buildSlackChannelWebUrl,
  buildSlackTeamAppUrl,
  buildSlackTeamWebUrl,
  getFirstSlackTeamId,
  mapSlackChannelsToUrls,
} from "./slack";

describe("buildSlackChannelAppUrl", () => {
  it("team と channel_id から Slack アプリ URL を組み立てる", () => {
    expect(
      buildSlackChannelAppUrl({
        team: "T123",
        channel_id: "C456",
      }),
    ).toBe("slack://channel?team=T123&id=C456");
  });
});

describe("buildSlackChannelWebUrl", () => {
  it("team と channel_id から Slack Web URL を組み立てる", () => {
    expect(
      buildSlackChannelWebUrl({
        team: "T123",
        channel_id: "C456",
      }),
    ).toBe("https://app.slack.com/client/T123/C456");
  });
});

describe("buildSlackTeamAppUrl", () => {
  it("team から Slack アプリ URL を組み立てる", () => {
    expect(buildSlackTeamAppUrl("T123")).toBe("slack://open?team=T123");
  });
});

describe("buildSlackTeamWebUrl", () => {
  it("team から Slack Web URL を組み立てる", () => {
    expect(buildSlackTeamWebUrl("T123")).toBe("https://app.slack.com/client/T123");
  });
});

describe("mapSlackChannelsToUrls", () => {
  it("アプリリンクの URL マップへ変換する", () => {
    expect(
      mapSlackChannelsToUrls(
        {
          A1: {
            team: "T123",
            channel_id: "C456",
          },
        },
        true,
      ),
    ).toEqual({
      A1: "slack://channel?team=T123&id=C456",
    });
  });

  it("Webリンクの URL マップへ変換する", () => {
    expect(
      mapSlackChannelsToUrls(
        {
          A1: {
            team: "T123",
            channel_id: "C456",
          },
        },
        false,
      ),
    ).toEqual({
      A1: "https://app.slack.com/client/T123/C456",
    });
  });
});

describe("getFirstSlackTeamId", () => {
  it("最初に見つかった team を返す", () => {
    expect(
      getFirstSlackTeamId({
        A1: {
          team: "T123",
          channel_id: "C456",
        },
      }),
    ).toBe("T123");
  });
});
