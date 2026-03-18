import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ja } from "../locales/ja";
import type { ConferenceData } from "../types";
import { SessionCard } from "./SessionCard";

const data: ConferenceData = {
  persons: {
    p1: { name: "田中 太郎" },
  },
  affiliations: {},
  rooms: {
    r1: { name: "A会場" },
    r2: { name: "B会場" },
    r3: { name: "C会場" },
    r4: { name: "P会場" },
  },
  sessions: {
    s1: {
      title: "セッション1",
      date: "2026-03-09",
      start_time: "9:00",
      end_time: "10:00",
      room_ids: ["r1"],
      url: "https://example.com/session",
      youtube_url: "https://www.youtube.com/watch?v=test",
      zoom_url: "https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469",
      chair: "",
      presentation_ids: ["pr1"],
    },
    s2: {
      title: "オープニング",
      date: "2026-03-09",
      start_time: "10:00",
      end_time: "10:30",
      room_ids: ["r1"],
      chair: "",
      presentation_ids: [],
    },
  },
  presentations: {
    pr1: {
      title: "発表1",
      session_id: "s1",
      presenter_id: "p1",
      is_english: false,
      is_online: false,
      authors: [{ person_id: "p1", affiliation_id: null }],
      pdf_url: null,
    },
  },
};

describe("SessionCard", () => {
  it("URL があるときは星マークの左にリンクを表示する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="https://example.com/session"');
    expect(html).toContain(ja.openSessionSite);
    expect(html.indexOf('href="https://example.com/session"')).toBeLessThan(html.indexOf(ja.addBookmark));
  });

  it("YouTube URL があるときは YouTube リンクを表示する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="https://www.youtube.com/watch?v=test"');
    expect(html).toContain(ja.openSessionYoutube);
  });

  it("zoom_url があるときは Zoom リンクを表示する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469"');
    expect(html).toContain(ja.openSessionZoom);
  });

  it("A会場のカスタムURLが設定されている場合は zoom_url より優先する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        zoomCustomUrls={{ venues: { A: "https://example.com/custom-a" } }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="https://example.com/custom-a"');
    expect(html).not.toContain('href="https://nlp2026utsunomiya.slack.com/archives/C0AGJAH4JV6/p1771937430225469"');
  });

  it("元データに Zoom がないセッションでは会場カスタムURLだけでは Zoom リンクを表示しない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s2"
        session={data.sessions.s2}
        zoomCustomUrls={{ venues: { A: "https://example.com/custom-a" } }}
        presIds={[]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain(ja.openSessionZoom);
    expect(html).not.toContain('href="https://example.com/custom-a"');
  });

  it("Slack アプリリンク設定ON時は zoom_url を app deep link に変換して表示する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        useSlackAppLinks
        slackTeamId="T123"
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="slack://channel?team=T123&amp;id=C0AGJAH4JV6&amp;message=1771937430.225469"');
  });

  it("Slack リンクは新規タブで開く", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        sessionSlackUrl="https://app.slack.com/client/T123/C456"
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('href="https://app.slack.com/client/T123/C456"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("Slack URL がないときはリンクを表示しない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain("このセッションの Slack チャンネルを開く");
  });

  it("URL がないときは関連リンクを表示しない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, url: undefined }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain(ja.openSessionSite);
  });

  it("YouTube URL がないときは YouTube リンクを表示しない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, youtube_url: undefined }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain(ja.openSessionYoutube);
  });

  it("セッションタイトルはボタンではなくヘッダテキストとして描画する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain(">セッション1<");
    expect(html).toContain(`aria-label="${ja.jumpToSessionTop}"`);
  });

  it("発表ありセッションのタイトル検索がOFFならタイトルをハイライトしない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query="セッション"
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain("<mark");
  });

  it("発表ありセッションのタイトル検索がONならタイトルをハイライトする", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={data.sessions.s1}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query="セッション"
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain("<mark");
  });

  it("発表なしセッションのタイトル検索がOFFならタイトルをハイライトしない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s2"
        session={data.sessions.s2}
        presIds={[]}
        data={data}
        showAuthors
        query="オープニング"
        includeSessionTitleForNoPresentationSessions={false}
        includeSessionTitleForPresentationSessions
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain("<mark");
  });

  it("発表なしセッションのタイトル検索がONならタイトルをハイライトする", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s2"
        session={data.sessions.s2}
        presIds={[]}
        data={data}
        showAuthors
        query="オープニング"
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain("<mark");
  });

  it("複数会場のセッションはヘッダ背景を均等分割で描画する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, room_ids: ["r1", "r2"] }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain(
      'style="background-image:linear-gradient(90deg, #ffe4e6 0%, #ffe4e6 50%, #fef3c7 50%, #fef3c7 100%)"',
    );
  });

  it("4会場のセッションは25%刻みで均等分割する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, room_ids: ["r1", "r2", "r3", "r4"] }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain(
      'style="background-image:linear-gradient(90deg, #ffe4e6 0%, #ffe4e6 25%, #fef3c7 25%, #fef3c7 50%, #d1fae5 50%, #d1fae5 75%, #e0f2fe 75%, #e0f2fe 100%)"',
    );
  });

  it("3会場のセッションは3分割グラデーションで描画する", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, room_ids: ["r1", "r2", "r3"] }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain(
      'style="background-image:linear-gradient(90deg, #ffe4e6 0%, #ffe4e6 33.333333333333336%, #fef3c7 33.333333333333336%, #fef3c7 66.66666666666667%, #d1fae5 66.66666666666667%, #d1fae5 100%)"',
    );
  });

  it("単一会場のセッションはヘッダに background-image を付与しない", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, room_ids: ["r1"] }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain("background-image");
  });

  it("未知会場を含む複数会場セッションはフォールバック色を使う", () => {
    const html = renderToStaticMarkup(
      <SessionCard
        bookmarkedPresentationIds={new Set()}
        bookmarkedSessionIds={new Set()}
        sessionId="s1"
        session={{ ...data.sessions.s1, room_ids: ["r1", "r999"] }}
        presIds={["pr1"]}
        data={data}
        showAuthors
        query=""
        includeSessionTitleForNoPresentationSessions
        includeSessionTitleForPresentationSessions={false}
        expanded={false}
        onToggleExpanded={vi.fn()}
        onScrollToSessionTop={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).toContain(
      'style="background-image:linear-gradient(90deg, #ffe4e6 0%, #ffe4e6 50%, #f1f5f9 50%, #f1f5f9 100%)"',
    );
  });
});
