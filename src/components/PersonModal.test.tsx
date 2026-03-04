import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConferenceData } from "../types";
import { PersonModal } from "./PersonModal";

const data: ConferenceData = {
  persons: {
    p1: { name: "田中 太郎" },
    p2: { name: "鈴木 花子" },
  },
  affiliations: {},
  rooms: {
    r1: { name: "第1会場" },
  },
  sessions: {
    s1: {
      title: "セッション1",
      date: "2026-03-09",
      start_time: "9:00",
      end_time: "10:00",
      room_ids: ["r1"],
      chair: "",
      presentation_ids: ["pr1", "pr2"],
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
    pr2: {
      title: "発表2",
      session_id: "s1",
      presenter_id: "p2",
      is_english: false,
      is_online: false,
      authors: [
        { person_id: "p2", affiliation_id: null },
        { person_id: "p1", affiliation_id: null },
      ],
      pdf_url: null,
    },
  },
};

describe("PersonModal", () => {
  it("発表一覧の件数を見出しに表示する", () => {
    const html = renderToStaticMarkup(
      <PersonModal
        personId="p1"
        data={data}
        bookmarkedPresentationIds={new Set()}
        showAuthors
        onClose={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).toContain("田中 太郎 の発表一覧 (2件)");
  });

  it("ブックマーク済み発表は解除状態として描画する", () => {
    const html = renderToStaticMarkup(
      <PersonModal
        personId="p1"
        data={data}
        bookmarkedPresentationIds={new Set(["pr2"])}
        showAuthors
        onClose={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="ブックマークを解除"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="ブックマークを追加"');
  });

  it("発表詳細の開閉ボタンを表示する", () => {
    const html = renderToStaticMarkup(
      <PersonModal
        personId="p1"
        data={data}
        bookmarkedPresentationIds={new Set()}
        showAuthors
        onClose={vi.fn()}
        onPersonClick={vi.fn()}
        onJumpToSession={vi.fn()}
        onToggleBookmark={vi.fn()}
      />,
    );

    expect(html).toContain('aria-label="発表詳細を開く"');
  });
});
