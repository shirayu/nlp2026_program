import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConferenceData } from "../../types";
import { ProgramResults } from "./ProgramResults";

const data: ConferenceData = {
  persons: {},
  affiliations: {},
  rooms: {},
  sessions: {},
  presentations: {},
};

describe("ProgramResults", () => {
  it("emptyStateMessage を空結果に表示する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramResults, {
        data,
        mainRef: { current: null },
        trimmedQuery: "",
        showBookmarkedOnly: false,
        searchScopeLabel: "",
        matchedPresentationCount: 0,
        filteredSessions: [],
        bookmarkedPresentationIds: new Set<string>(),
        bookmarkedSessionIds: new Set<string>(),
        sessionSlackLinks: {},
        showAuthors: false,
        includeSessionTitleForNoPresentationSessions: true,
        includeSessionTitleForPresentationSessions: false,
        sessionsVisible: true,
        sessionRefs: { current: {} },
        onToggleExpanded: vi.fn(),
        onScrollToSessionTop: vi.fn(),
        onPersonClick: vi.fn(),
        onJumpToSession: vi.fn(),
        onToggleBookmark: vi.fn(),
        onToggleSessionBookmark: vi.fn(),
        emptyStateMessage: "この日はこの部屋での発表・セッションはありません",
      }),
    );

    expect(html).toContain("この日はこの部屋での発表・セッションはありません");
  });
});
