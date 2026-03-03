import { describe, expect, it } from "vitest";
import { splitHighlightSegments } from "./highlight";

describe("splitHighlightSegments", () => {
  it("クエリが空ならそのまま返す", () => {
    expect(splitHighlightSegments("自然言語処理", "")).toEqual([{ text: "自然言語処理", matched: false }]);
  });

  it("一致箇所を前後に分割する", () => {
    expect(splitHighlightSegments("BERTによる文書分類", "文書")).toEqual([
      { text: "BERTによる", matched: false },
      { text: "文書", matched: true, matchIndex: 0 },
      { text: "分類", matched: false },
    ]);
  });

  it("大小文字を無視して複数箇所を検出する", () => {
    expect(splitHighlightSegments("QueryLift and query expansion", "query")).toEqual([
      { text: "Query", matched: true, matchIndex: 0 },
      { text: "Lift and ", matched: false },
      { text: "query", matched: true, matchIndex: 0 },
      { text: " expansion", matched: false },
    ]);
  });

  it("複数語では語ごとに matchIndex を持つ", () => {
    expect(splitHighlightSegments("東京大学の田中太郎", "東京 田中")).toEqual([
      { text: "東京", matched: true, matchIndex: 0 },
      { text: "大学の", matched: false },
      { text: "田中", matched: true, matchIndex: 1 },
      { text: "太郎", matched: false },
    ]);
  });
});
