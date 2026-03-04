import { describe, expect, it } from "vitest";
import { filterBookmarkedSessions } from "./bookmarks";
import type { FilteredSession } from "./filters";

const sessions: FilteredSession[] = [
  {
    sessionId: "s1",
    session: {
      title: "セッション1",
      date: "2026-03-09",
      start_time: "9:00",
      end_time: "10:00",
      room_ids: ["r1"],
      chair: "",
      presentation_ids: ["p1", "p2"],
    },
    presIds: ["p1", "p2"],
  },
  {
    sessionId: "s2",
    session: {
      title: "セッション2",
      date: "2026-03-09",
      start_time: "10:00",
      end_time: "11:00",
      room_ids: ["r2"],
      chair: "",
      presentation_ids: ["p3"],
    },
    presIds: ["p3"],
  },
];

describe("filterBookmarkedSessions", () => {
  it("ブックマーク絞り込みが無効なら入力をそのまま返す", () => {
    expect(filterBookmarkedSessions(sessions, new Set(["p1"]), false)).toEqual(sessions);
  });

  it("ブックマーク済み発表だけを残す", () => {
    expect(filterBookmarkedSessions(sessions, new Set(["p2", "p3"]), true)).toEqual([
      {
        ...sessions[0],
        presIds: ["p2"],
      },
      sessions[1],
    ]);
  });

  it("ブックマーク済み発表がないセッションは除外する", () => {
    expect(filterBookmarkedSessions(sessions, new Set(["p3"]), true)).toEqual([sessions[1]]);
  });

  it("ブックマークが空なら結果も空になる", () => {
    expect(filterBookmarkedSessions(sessions, new Set(), true)).toEqual([]);
  });
});
