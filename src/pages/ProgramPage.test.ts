import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Session } from "../types";
import { fullscreenDialogClassName, getNextScheduleTimePoint, SearchField } from "./ProgramPage";
import { ProgramHeader } from "./programPage/ProgramHeader";
import { shouldDisableFilters, shouldExitBookmarkFilter, syncSearchAllWithBookmarkFilter } from "./programPage/utils";

function localDate(year: number, month: number, day: number, hour: number, minute: number, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second);
}

describe("fullscreenDialogClassName", () => {
  it("設定ダイアログが最前面に出る z-index を含む", () => {
    expect(fullscreenDialogClassName).toContain("z-50");
  });
});

describe("getNextScheduleTimePoint", () => {
  const sessions = {
    S1: {
      title: "A",
      date: "2026-03-09",
      start_time: "9:00",
      end_time: "10:00",
      room_ids: [],
      chair: "",
      presentation_ids: [],
    },
    S2: {
      title: "B",
      date: "2026-03-10",
      start_time: "13:00",
      end_time: "14:00",
      room_ids: [],
      chair: "",
      presentation_ids: [],
    },
  } satisfies Record<string, Session>;

  it("開催前は最初の時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 8, 23, 0))).toEqual({
      date: "2026-03-09",
      time: "9:00",
    });
  });

  it("開始時刻ちょうどならその時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 9, 0))).toEqual({
      date: "2026-03-09",
      time: "9:00",
    });
  });

  it("開催中は現在以降で最初の時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 9, 7))).toEqual({
      date: "2026-03-09",
      time: "9:10",
    });
  });

  it("5分刻みの境界ちょうどならその時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 9, 5))).toEqual({
      date: "2026-03-09",
      time: "9:05",
    });
  });

  it("5分刻みの直前なら次の時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 9, 4, 59))).toEqual({
      date: "2026-03-09",
      time: "9:05",
    });
  });

  it("終了時刻ちょうどならその時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 10, 0))).toEqual({
      date: "2026-03-09",
      time: "10:00",
    });
  });

  it("終了時刻を過ぎた直後は次の日の最初の時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 10, 0, 1))).toEqual({
      date: "2026-03-10",
      time: "13:00",
    });
  });

  it("当日分が終わっていれば次の日の最初の時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 9, 10, 30))).toEqual({
      date: "2026-03-10",
      time: "13:00",
    });
  });

  it("次の日の開始時刻ちょうどならその時点を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 10, 13, 0))).toEqual({
      date: "2026-03-10",
      time: "13:00",
    });
  });

  it("未来の時点がなければ null を返す", () => {
    expect(getNextScheduleTimePoint(sessions, localDate(2026, 3, 10, 14, 1))).toBeNull();
  });
});

describe("SearchField", () => {
  it("検索反映中は値が空でもクリアボタンを表示する", () => {
    const html = renderToStaticMarkup(
      createElement(SearchField, { value: "", isSearching: true, placeholder: "検索", onCommit: () => {} }),
    );

    expect(html).toContain("検索語をクリア");
  });
});

describe("ProgramHeader", () => {
  it("空クエリかつブックマーク全体表示でなければ全日程検索トグルを表示しない", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: true,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: null,
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: null,
        nowEnabled: false,
        rooms: ["A会場"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).not.toContain("全日程検索");
    expect(html).toContain('aria-disabled="false"');
    expect(html).toContain('<div aria-disabled="false" class="bg-white">');
  });

  it("ブックマーク0件ではブックマーク一覧表示ボタンを無効化する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: true,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: null,
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: null,
        nowEnabled: false,
        rooms: ["A会場"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain('aria-label="ブックマーク済みのみ表示"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("cursor-not-allowed text-gray-400");
  });

  it("ブックマーク全体表示中なら空クエリでもトグルを表示し絞り込みをグレーアウトする", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: true,
        bookmarkCount: 1,
        bookmarkFilterActive: true,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: true,
        selectedDate: null,
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: null,
        nowEnabled: false,
        rooms: ["A会場"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("全日程検索");
    expect(html).toContain("bg-gray-100 text-gray-400");
  });

  it("検索文字があればブックマーク全体表示でなくてもトグルを表示する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "NLP",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: null,
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: null,
        nowEnabled: false,
        rooms: ["A会場"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("絞り込み内検索");
  });

  it("data.generated_at を今ボタン行に2行で表示する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: true,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        dataGeneratedAt: "2026-03-05T15:01:00Z",
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: null,
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: null,
        nowEnabled: false,
        rooms: ["A会場"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("データ最終更新");
    expect(html).toContain("3/6(金) 00:01");
  });

  it("時点指定中に非アクティブ会場を選択した場合は灰色の選択状態で表示する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: "2026-03-09",
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: "9:00",
        nowEnabled: false,
        rooms: ["A", "B"],
        activeRooms: ["A"],
        selectedRoom: "B",
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-lime-100 bg-lime-50 text-lime-900");
    expect(html).toContain("border-rose-400 bg-rose-50 text-rose-800");
    expect(html).toContain("border-slate-300 bg-slate-500 text-white");
  });

  it("その日に発表が1件もない会場でもセッションがあれば会場色で表示する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: "2026-03-09",
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: "9:00",
        nowEnabled: false,
        rooms: ["A", "B"],
        roomHasPresentationsOnSelectedDate: { A: true, B: false },
        activeRooms: ["A", "B"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-rose-400");
    expect(html).toContain("border-amber-400");
    expect(html).toContain("bg-amber-50 text-amber-800");
  });

  it("その日に発表がない会場でも選択中は会場色で判別できる", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: "2026-03-09",
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: "9:00",
        nowEnabled: false,
        rooms: ["A", "B"],
        roomHasPresentationsOnSelectedDate: { A: true, B: false },
        activeRooms: ["A", "B"],
        selectedRoom: "B",
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-amber-400 bg-amber-600 text-white");
  });

  it("filtersDisabled が有効なら会場の状態に関係なく disabled スタイルを優先する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: true,
        selectedDate: "2026-03-09",
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: "9:00",
        nowEnabled: false,
        rooms: ["A", "B"],
        roomHasPresentationsOnSelectedDate: { A: true, B: false },
        activeRooms: ["A", "B"],
        selectedRoom: "B",
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("cursor-not-allowed bg-gray-200 text-gray-400 border-gray-300");
    expect(html).not.toContain("bg-slate-500 text-white");
  });

  it("roomHasPresentationsOnSelectedDate 未指定時は既存の会場色を維持する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: "2026-03-09",
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: "9:00",
        nowEnabled: false,
        rooms: ["A", "B"],
        activeRooms: ["A", "B"],
        selectedRoom: "A",
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-rose-400 bg-rose-600 text-white");
    expect(html).toContain("border-amber-400 bg-amber-50 text-amber-800");
    expect(html).not.toContain("border-slate-300");
  });

  it("roomHasPresentationsOnSelectedDate に会場キーが無い場合は発表なし色にしない", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-09"],
        filtersDisabled: false,
        selectedDate: "2026-03-09",
        showFilters: true,
        allTimes: ["9:00", "9:05"],
        timelineSegments: [true],
        selectedTime: null,
        nowEnabled: false,
        rooms: ["A", "B"],
        roomHasPresentationsOnSelectedDate: { A: true },
        activeRooms: ["A"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-amber-400");
    expect(html).not.toContain("bg-slate-100 text-slate-600");
  });

  it("時点指定中で非アクティブ会場は発表有無情報があっても灰色表示にする", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-11"],
        filtersDisabled: false,
        selectedDate: "2026-03-11",
        showFilters: true,
        allTimes: ["14:55", "15:00", "15:05"],
        timelineSegments: [false, true],
        selectedTime: "15:00",
        nowEnabled: false,
        rooms: ["P", "C"],
        roomHasPresentationsOnSelectedDate: { P: false, C: true },
        activeRooms: ["P"],
        selectedRoom: null,
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-slate-300 bg-slate-100 text-slate-600");
  });

  it("時点指定中で非アクティブ会場が選択中の場合も濃い灰色で表示する", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramHeader, {
        query: "",
        isSearching: false,
        searchAll: false,
        bookmarkCount: 0,
        bookmarkFilterActive: false,
        showSettings: false,
        showInstallButton: false,
        showInstallDialog: false,
        slackUrl: null,
        slackAppUrl: null,
        useSlackAppLinks: false,
        allDates: ["2026-03-11"],
        filtersDisabled: false,
        selectedDate: "2026-03-11",
        showFilters: true,
        allTimes: ["14:55", "15:00", "15:05"],
        timelineSegments: [false, true],
        selectedTime: "15:00",
        nowEnabled: false,
        rooms: ["P", "C"],
        roomHasPresentationsOnSelectedDate: { P: false },
        activeRooms: ["P"],
        selectedRoom: "C",
        onQueryCommit: () => {},
        onToggleSearchAll: () => {},
        onToggleBookmarkFilter: () => {},
        onOpenSettings: () => {},
        onOpenInstallDialog: () => {},
        onSelectDate: () => {},
        onToggleFilters: () => {},
        onSelectTime: () => {},
        onSelectNow: () => {},
        onSelectRoom: () => {},
      }),
    );

    expect(html).toContain("border-slate-300 bg-slate-500 text-white");
  });
});

describe("syncSearchAllWithBookmarkFilter", () => {
  it("ブックマーク表示を有効にすると全日程検索を有効にする", () => {
    expect(syncSearchAllWithBookmarkFilter(false, true)).toBe(true);
  });

  it("ブックマーク表示を無効にすると検索範囲は維持する", () => {
    expect(syncSearchAllWithBookmarkFilter(false, false)).toBe(false);
    expect(syncSearchAllWithBookmarkFilter(true, false)).toBe(true);
  });

  it("ブックマーク表示を有効にした後で全日程検索をオフにしても解除時にその状態を維持する", () => {
    const enabledByBookmark = syncSearchAllWithBookmarkFilter(false, true);

    expect(enabledByBookmark).toBe(true);
    expect(syncSearchAllWithBookmarkFilter(false, false)).toBe(false);
  });
});

describe("shouldDisableFilters", () => {
  it("全日程検索オンでも通常状態なら絞り込みを無効化しない", () => {
    expect(shouldDisableFilters(true, "", false)).toBe(false);
  });

  it("検索文字がある全日程検索では絞り込みを無効化する", () => {
    expect(shouldDisableFilters(true, "NLP", false)).toBe(true);
  });

  it("ブックマーク全体表示の全日程検索では絞り込みを無効化する", () => {
    expect(shouldDisableFilters(true, "", true)).toBe(true);
  });

  it("全日程検索オフなら絞り込みを無効化しない", () => {
    expect(shouldDisableFilters(false, "NLP", true)).toBe(false);
  });
});

describe("shouldExitBookmarkFilter", () => {
  it("ブックマーク一覧表示中に0件なら一覧表示を解除する", () => {
    expect(shouldExitBookmarkFilter(0, true)).toBe(true);
  });

  it("ブックマークが残っていれば一覧表示を維持する", () => {
    expect(shouldExitBookmarkFilter(1, true)).toBe(false);
  });

  it("一覧表示していなければ0件でも何もしない", () => {
    expect(shouldExitBookmarkFilter(0, false)).toBe(false);
  });
});
