import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ja } from "../locales/ja";
import type { ConferenceData } from "../types";
import { PresentationListItem } from "./PresentationListItem";

const data: ConferenceData = {
  persons: {
    p1: { name: "山田 花子" },
  },
  affiliations: {},
  rooms: {
    r1: { name: "A会場" },
  },
  sessions: {
    s1: {
      title: "ポスター1",
      date: "2026-03-09",
      start_time: "13:00",
      end_time: "14:00",
      room_ids: ["r1"],
      chair: "",
      presentation_ids: ["pr1"],
    },
  },
  presentations: {
    pr1: {
      title: "オンラインポスター発表",
      session_id: "s1",
      presenter_id: "p1",
      is_english: false,
      is_online: true,
      authors: [{ person_id: "p1", affiliation_id: null }],
      pdf_url: null,
      zoom_url: "https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469",
    },
  },
};

describe("PresentationListItem", () => {
  it("zoom_url があるときは Zoom リンクを表示する", () => {
    const html = renderToStaticMarkup(
      <PresentationListItem pid="pr1" data={data} bookmarked={false} showAuthors query="" onToggleBookmark={vi.fn()} />,
    );

    expect(html).toContain('href="https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469"');
    expect(html).toContain(ja.openPresentationZoom);
  });

  it("Slack アプリリンク設定ON時は zoom_url を app deep link に変換して表示する", () => {
    const html = renderToStaticMarkup(
      <PresentationListItem
        pid="pr1"
        data={data}
        bookmarked={false}
        showAuthors
        query=""
        useSlackAppLinks
        slackTeamId="T123"
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="slack://channel?team=T123&amp;id=C0AGJAH4JV6&amp;message=1771937430.225469"');
  });

  it("zoom_url がないときは Zoom リンクを表示しない", () => {
    const withoutZoom: ConferenceData = {
      ...data,
      presentations: {
        ...data.presentations,
        pr1: {
          ...data.presentations.pr1,
          zoom_url: undefined,
        },
      },
    };
    const html = renderToStaticMarkup(
      <PresentationListItem
        pid="pr1"
        data={withoutZoom}
        bookmarked={false}
        showAuthors
        query=""
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain(ja.openPresentationZoom);
  });

  it("A会場のカスタムURLが設定されている場合は zoom_url より優先する", () => {
    const html = renderToStaticMarkup(
      <PresentationListItem
        pid="pr1"
        data={data}
        bookmarked={false}
        showAuthors
        query=""
        venueZoomUrls={{ A: "https://example.com/custom-a" }}
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="https://example.com/custom-a"');
    expect(html).not.toContain('href="https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469"');
  });

  it("発表に時刻がある場合はタイトル横に括弧付きで表示する", () => {
    const withTime: ConferenceData = {
      ...data,
      presentations: {
        ...data.presentations,
        pr1: {
          ...data.presentations.pr1,
          start_time: "9:45",
          end_time: "10:15",
        },
      },
    };
    const html = renderToStaticMarkup(
      <PresentationListItem
        pid="pr1"
        data={withTime}
        bookmarked={false}
        showAuthors
        query=""
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).toContain("オンラインポスター発表");
    expect(html).toContain("（9:45-10:15）");
  });
});
