import { describe, expect, it } from "vitest";
import { formatJapaneseDate, formatSessionDateTime } from "./date";

describe("formatJapaneseDate", () => {
  it("ISO日付を月日と曜日に整形する", () => {
    expect(formatJapaneseDate("2026-03-13")).toBe("3/13(金)");
  });

  it("年表示を含められる", () => {
    expect(formatJapaneseDate("2026-03-13", { includeYear: true })).toBe("2026/3/13(金)");
  });

  it("不正な形式はそのまま返す", () => {
    expect(formatJapaneseDate("2026/03/13")).toBe("2026/03/13");
  });
});

describe("formatSessionDateTime", () => {
  it("日付と時刻範囲をまとめて整形する", () => {
    expect(formatSessionDateTime("2026-03-13", "9:00", "10:30")).toBe("3/13(金) 9:00–10:30");
  });
});
