import { describe, expect, it } from "vitest";
import {
  buildSlackChannelAppUrl,
  buildSlackChannelWebUrl,
  buildSlackMessageAppUrl,
  buildSlackTeamAppUrl,
  buildSlackTeamWebUrl,
  getFirstSlackTeamId,
  mapSlackChannelsToUrls,
  toSlackMessageAppUrl,
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

describe("buildSlackMessageAppUrl", () => {
  it("team と channel と ts から Slack アプリのメッセージ URL を組み立てる", () => {
    expect(buildSlackMessageAppUrl("T123", "C456", "1771937430.225469")).toBe(
      "slack://channel?team=T123&id=C456&message=1771937430.225469",
    );
  });
});

describe("toSlackMessageAppUrl", () => {
  it("Slack メッセージURLを Slack アプリURLに変換する", () => {
    expect(
      toSlackMessageAppUrl("https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469", "T123"),
    ).toBe("slack://channel?team=T123&id=C0AGJAH4JV6&message=1771937430.225469");
  });

  it("team がなければ null を返す", () => {
    expect(toSlackMessageAppUrl("https://example.slack.com/archives/C1/p1771937430225469", null)).toBeNull();
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
