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
  },
  sessions: {
    s1: {
      title: "セッション1",
      date: "2026-03-09",
      start_time: "9:00",
      end_time: "10:00",
      room_ids: ["r1"],
      url: "https://example.com/session",
      chair: "",
      presentation_ids: ["pr1"],
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
        expanded={false}
        onToggleExpanded={vi.fn()}
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
        expanded={false}
        onToggleExpanded={vi.fn()}
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
        expanded={false}
        onToggleExpanded={vi.fn()}
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
        expanded={false}
        onToggleExpanded={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
        onToggleSessionBookmark={vi.fn()}
      />,
    );

    expect(html).not.toContain(ja.openSessionSite);
  });
});
