import { describe, expect, it } from "vitest";
import { roomShort } from "../constants";
import type { ConferenceData } from "../types";
import {
  filterSessions,
  getAvailableDates,
  getAvailableRooms,
  getAvailableTimes,
  hasPresentationHiddenSearchMatch,
} from "./filters";

// ── テスト用データ ───────────────────────────────────────────────
const data: ConferenceData = {
  persons: {
    p1: { name: "田中 太郎" },
    p2: { name: "鈴木 花子" },
  },
  affiliations: {
    a1: { name: "東京大学" },
  },
  rooms: {
    r1: { name: "第1会場" },
    r2: { name: "第2会場" },
    r3: { name: "第3会場" },
  },
  sessions: {
    s1: {
      title: "自然言語処理A",
      date: "2026-03-09",
      start_time: "9:00",
      end_time: "10:30",
      room_ids: ["r1"],
      chair: "司会A",
      presentation_ids: ["pr1", "pr2"],
    },
    s2: {
      title: "機械学習B",
      date: "2026-03-09",
      start_time: "13:00",
      end_time: "14:30",
      room_ids: ["r2"],
      chair: "司会B",
      presentation_ids: ["pr3"],
    },
    s3: {
      title: "対話システムC",
      date: "2026-03-10",
      start_time: "9:00",
      end_time: "10:30",
      room_ids: ["r1", "r3"],
      chair: "司会C",
      presentation_ids: ["pr4"],
    },
    WS1: {
      title: "ワークショップ1",
      date: "2026-03-10",
      start_time: "9:00",
      end_time: "17:00",
      room_ids: ["r2"],
      chair: "",
      presentation_ids: [],
    },
    "WS1-1": {
      title: "ワークショップ1 セッション1",
      date: "2026-03-10",
      start_time: "10:00",
      end_time: "11:00",
      room_ids: ["r2"],
      chair: "",
      presentation_ids: [],
    },
  },
  presentations: {
    pr1: {
      title: "BERTによる文書分類",
      session_id: "s1",
      presenter_id: "p1",
      is_english: false,
      is_online: false,
      authors: [{ person_id: "p1", affiliation_id: "a1" }],
      pdf_url: null,
    },
    pr2: {
      title: "GPTの応用",
      session_id: "s1",
      presenter_id: "p2",
      is_english: false,
      is_online: false,
      authors: [{ person_id: "p2", affiliation_id: null }],
      pdf_url: null,
    },
    pr3: {
      title: "深層学習による翻訳",
      session_id: "s2",
      presenter_id: "p1",
      is_english: false,
      is_online: false,
      authors: [{ person_id: "p1", affiliation_id: "a1" }],
      pdf_url: null,
    },
    pr4: {
      title: "対話モデルの評価",
      session_id: "s3",
      presenter_id: "p2",
      is_english: false,
      is_online: false,
      authors: [{ person_id: "p2", affiliation_id: null }],
      pdf_url: null,
    },
  },
};

// ── getAvailableDates ────────────────────────────────────────────
describe("getAvailableDates", () => {
  it("全日付を重複なく返す", () => {
    expect(getAvailableDates(data.sessions)).toEqual(["2026-03-09", "2026-03-10"]);
  });
});

// ── getAvailableTimes ────────────────────────────────────────────
describe("getAvailableTimes", () => {
  it("日付未選択のとき5分刻みの時点一覧を返す", () => {
    const times = getAvailableTimes(data.sessions, null);
    expect(times[0]).toBe("9:00");
    expect(times).toContain("10:30");
    expect(times[times.length - 1]).toBe("14:30");
  });

  it("日付を選ぶとその日の範囲だけ返す", () => {
    const times = getAvailableTimes(data.sessions, "2026-03-09");
    expect(times[0]).toBe("9:00");
    expect(times).toContain("10:30");
    expect(times).toContain("13:00");
    expect(times[times.length - 1]).toBe("14:30");
  });

  it("別の日付を選ぶと別の時刻範囲を返す", () => {
    const times = getAvailableTimes(data.sessions, "2026-03-10");
    expect(times[0]).toBe("9:00");
    expect(times).toContain("10:00");
    expect(times[times.length - 1]).toBe("11:00");
  });
});

// ── getAvailableRooms ────────────────────────────────────────────
describe("getAvailableRooms", () => {
  it("日付・時刻未選択のとき全会場を返す", () => {
    const rooms = getAvailableRooms(data.sessions, data.rooms, null, null);
    expect(rooms).toContain("第1会場");
    expect(rooms).toContain("第2会場");
    expect(rooms).toContain("第3会場");
  });

  it("日付だけ選ぶとその日の会場を返す", () => {
    const rooms = getAvailableRooms(data.sessions, data.rooms, "2026-03-09", null);
    expect(rooms).toEqual(["第1会場", "第2会場"]);
  });

  it("日付+時点を選ぶとその時点で開催中の会場を返す", () => {
    const rooms = getAvailableRooms(data.sessions, data.rooms, "2026-03-09", "13:00");
    expect(rooms).toEqual(["第2会場"]);
  });

  it("重複時間帯では複数セッションの会場をまとめて返す", () => {
    const rooms = getAvailableRooms(data.sessions, data.rooms, "2026-03-10", "10:00");
    expect(rooms).toEqual(["第1会場", "第2会場", "第3会場"]);
  });
});

describe("roomShort", () => {
  it("会場セレクタ向けにフロア名を既存会場ラベルへ寄せる", () => {
    expect(roomShort("1F 大ホール(東)")).toBe("A");
    expect(roomShort("1F 大ホール(西)")).toBe("P");
    expect(roomShort("2F")).toBe("B");
    expect(roomShort("2F 大会議室201・202")).toBe("B");
    expect(roomShort("C会場(2F 大会議室202)")).toBe("C");
  });
});

// ── filterSessions ───────────────────────────────────────────────
const noFilter = {
  query: "",
  selectedDate: null,
  selectedTime: null,
  selectedRoom: null,
  searchAll: true,
};

describe("filterSessions - 日付・時刻・会場フィルタ", () => {
  it("フィルタなしで全セッションを返す", () => {
    const result = filterSessions(data, noFilter);
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "s2", "s3", "WS1-1"]);
  });

  it("日付を選ぶとその日のセッションだけ返す", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "s2"]);
  });

  it("日付+時点を選ぶとその時点で開催中のセッションだけ返す", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      selectedTime: "10:00",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s1"]);
  });

  it("時間が重なるセッションは同時に返す", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-10",
      selectedTime: "10:00",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s3", "WS1-1"]);
  });

  it("ブックマーク全体表示かつ全日程検索では日付フィルタを無視する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      searchAll: true,
      bookmarkedOnly: true,
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "s2", "s3", "WS1-1"]);
  });

  it("ブックマーク全体表示でなければ全日程検索でも空クエリ時は日付フィルタを維持する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      searchAll: true,
      bookmarkedOnly: false,
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "s2"]);
  });

  it("ブックマーク全体表示かつ全日程検索では時点フィルタを無視する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      selectedTime: "13:00",
      searchAll: true,
      bookmarkedOnly: true,
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "s2", "s3", "WS1-1"]);
  });

  it("ブックマーク全体表示かつ全日程検索では会場フィルタを無視する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      selectedRoom: "第2会場",
      searchAll: true,
      bookmarkedOnly: true,
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s1", "s2", "s3", "WS1-1"]);
  });

  it("ブックマーク全体表示でも全日程検索オフなら時点と会場のフィルタを維持する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      selectedTime: "13:00",
      selectedRoom: "第2会場",
      searchAll: false,
      bookmarkedOnly: true,
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s2"]);
  });

  it("終了時刻ちょうどは含めない", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      selectedTime: "10:30",
    });
    expect(result).toHaveLength(0);
  });

  it("日付+時刻+会場を選ぶと1セッションを返す", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      selectedTime: "13:00",
      selectedRoom: "第2会場",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s2"]);
  });

  it("複数会場セッションは含まれる会場のどれでも絞り込める", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-10",
      selectedRoom: "第3会場",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s3"]);
  });

  it("searchAll=true でも日付フィルタが効く（バグ修正確認）", () => {
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: true,
      selectedDate: "2026-03-10",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s3", "WS1-1"]);
  });

  it("ワークショップ親セッションは一覧に出さない", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-10",
    });
    expect(result.map((r) => r.sessionId)).not.toContain("WS1");
    expect(result.map((r) => r.sessionId)).toContain("WS1-1");
  });
});

describe("filterSessions - テキスト検索", () => {
  it("発表 ID でヒットする", () => {
    const result = filterSessions(data, { ...noFilter, query: "pr2" });
    expect(result).toHaveLength(1);
    expect(result[0].presIds).toEqual(["pr2"]);
  });

  it("発表タイトルでヒットする", () => {
    const result = filterSessions(data, { ...noFilter, query: "BERT" });
    expect(result).toHaveLength(1);
    expect(result[0].presIds).toContain("pr1");
  });

  it("著者名でヒットする", () => {
    const result = filterSessions(data, { ...noFilter, query: "田中" });
    const presIds = result.flatMap((r) => r.presIds);
    expect(presIds).toContain("pr1");
    expect(presIds).toContain("pr3");
  });

  it("所属機関名でヒットする", () => {
    const result = filterSessions(data, { ...noFilter, query: "東京大学" });
    const presIds = result.flatMap((r) => r.presIds);
    expect(presIds).toContain("pr1");
    expect(presIds).toContain("pr3");
  });

  it("セッションタイトルではヒットしない", () => {
    const result = filterSessions(data, { ...noFilter, query: "機械学習B" });
    expect(result).toHaveLength(0);
  });

  it("座長名ではヒットしない", () => {
    const result = filterSessions(data, { ...noFilter, query: "司会B" });
    expect(result).toHaveLength(0);
  });

  it("日付フィルタ+テキスト検索の組み合わせ", () => {
    const result = filterSessions(data, {
      ...noFilter,
      selectedDate: "2026-03-09",
      query: "GPT",
    });
    expect(result).toHaveLength(1);
    expect(result[0].presIds).toContain("pr2");
  });

  it("ヒットしない検索語は空配列を返す", () => {
    const result = filterSessions(data, {
      ...noFilter,
      query: "存在しないキーワード",
    });
    expect(result).toHaveLength(0);
  });

  it("空白区切りの複数語をAND検索する", () => {
    const result = filterSessions(data, { ...noFilter, query: "田中 東京大学" });
    const presIds = result.flatMap((r) => r.presIds);
    expect(presIds).toEqual(["pr1", "pr3"]);
  });

  it("発表情報だけでAND検索できる", () => {
    const result = filterSessions(data, { ...noFilter, query: "深層 田中" });
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("s2");
    expect(result[0].presIds).toEqual(["pr3"]);
  });

  it("発表 ID とタイトルの AND 検索ができる", () => {
    const result = filterSessions(data, { ...noFilter, query: "pr3 深層" });
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("s2");
    expect(result[0].presIds).toEqual(["pr3"]);
  });

  it("別発表にまたがって語を満たす場合はヒットしない", () => {
    const result = filterSessions(data, { ...noFilter, query: "GPT 田中" });
    expect(result).toHaveLength(0);
  });
});

describe("filterSessions - searchAll フラグの挙動", () => {
  it("searchAll=true + クエリあり: 日付フィルタを無視して全セッションを検索する", () => {
    // 田中太郎(p1)は s1(2026-03-09) と s2(2026-03-09) にいるが、
    // selectedDate=2026-03-10 でも searchAll=true なら両方ヒットする
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: true,
      selectedDate: "2026-03-10",
      query: "田中",
    });
    const presIds = result.flatMap((r) => r.presIds);
    expect(presIds).toContain("pr1"); // s1 (2026-03-09)
    expect(presIds).toContain("pr3"); // s2 (2026-03-09)
  });

  it("searchAll=true + クエリあり: 時点と会場フィルタも無視して全セッションを検索する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: true,
      selectedDate: "2026-03-10",
      selectedTime: "10:00",
      selectedRoom: "第3会場",
      query: "田中",
    });
    const presIds = result.flatMap((r) => r.presIds);
    expect(presIds).toEqual(["pr1", "pr3"]);
  });

  it("searchAll=false + クエリあり: 日付フィルタ内だけを検索する", () => {
    // selectedDate=2026-03-10 の場合、s3 のみが対象 → 田中はヒットしない
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: false,
      selectedDate: "2026-03-10",
      query: "田中",
    });
    expect(result).toHaveLength(0);
  });

  it("searchAll=false + クエリあり: 時点と会場フィルタも維持する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: false,
      selectedDate: "2026-03-09",
      selectedTime: "9:00",
      selectedRoom: "第1会場",
      query: "GPT",
    });
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("s1");
    expect(result[0].presIds).toEqual(["pr2"]);
  });

  it("searchAll=false + クエリあり: 時点や会場が外れていればヒットしても除外する", () => {
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: false,
      selectedDate: "2026-03-09",
      selectedTime: "13:00",
      selectedRoom: "第2会場",
      query: "GPT",
    });
    expect(result).toHaveLength(0);
  });

  it("searchAll=true でもクエリなし: 日付フィルタは有効のまま", () => {
    // クエリなしのとき searchAll は意味を持たず、日付フィルタが適用される
    const result = filterSessions(data, {
      ...noFilter,
      searchAll: true,
      selectedDate: "2026-03-10",
      query: "",
    });
    expect(result.map((r) => r.sessionId)).toEqual(["s3", "WS1-1"]);
  });
});

describe("hasPresentationHiddenSearchMatch", () => {
  it("showAuthors=false では発表者名ヒットを隠しマッチとして扱う", () => {
    expect(hasPresentationHiddenSearchMatch(data, "pr1", "田中", false)).toBe(true);
  });

  it("showAuthors=true では発表者名ヒットだけなら隠しマッチにしない", () => {
    expect(hasPresentationHiddenSearchMatch(data, "pr1", "田中", true)).toBe(false);
  });

  it("所属ヒットは showAuthors=true でも隠しマッチとして扱う", () => {
    expect(hasPresentationHiddenSearchMatch(data, "pr1", "東京大学", true)).toBe(true);
  });

  it("タイトルだけで完結する検索は隠しマッチにしない", () => {
    expect(hasPresentationHiddenSearchMatch(data, "pr1", "BERT", false)).toBe(false);
  });

  it("表示済み情報だけで AND 条件を満たせない場合は隠しマッチにする", () => {
    expect(hasPresentationHiddenSearchMatch(data, "pr1", "BERT 田中", false)).toBe(true);
  });
});
