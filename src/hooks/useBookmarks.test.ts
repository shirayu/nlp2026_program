import { afterEach, describe, expect, it } from "vitest";
import { bookmarksStorage, bookmarksStorageKey } from "./useBookmarks";

describe("bookmarksStorage", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("保存済み JSON から文字列 ID 配列だけを復元する", () => {
    expect(bookmarksStorage.parseBookmarkIds('["P1",123,"P2",null]')).toEqual(["P1", "P2"]);
  });

  it("不正な JSON は空配列にフォールバックする", () => {
    expect(bookmarksStorage.parseBookmarkIds("{broken")).toEqual([]);
  });

  it("window がない環境では空配列を返す", () => {
    expect(bookmarksStorage.readBookmarkIds()).toEqual([]);
  });

  it("localStorage からブックマークを読み出す", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => (key === bookmarksStorageKey ? '["P10","P11"]' : null),
        },
      },
    });

    expect(bookmarksStorage.readBookmarkIds()).toEqual(["P10", "P11"]);
  });
});
