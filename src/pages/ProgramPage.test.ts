import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Session } from "../types";
import { fullscreenDialogClassName, getNextScheduleTimePoint, SearchField } from "./ProgramPage";

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
