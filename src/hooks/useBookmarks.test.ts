import { afterEach, describe, expect, it } from "vitest";
import { APP_LOCALSTORAGE_PREFIX } from "../constants";
import { bookmarksStorage, bookmarksStorageKey } from "./useBookmarks";

describe("bookmarksStorage", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("旧形式の保存済み JSON から発表 ID 配列だけを復元する", () => {
    expect(bookmarksStorage.parseBookmarks('["P1",123,"P2",null]')).toEqual({
      presentationIds: ["P1", "P2"],
      sessionIds: [],
    });
  });

  it("不正な JSON は空配列にフォールバックする", () => {
    expect(bookmarksStorage.parseBookmarks("{broken")).toEqual({
      presentationIds: [],
      sessionIds: [],
    });
  });

  it("新形式の保存済み JSON から発表 ID とセッション ID を復元する", () => {
    expect(
      bookmarksStorage.parseBookmarks('{"presentationIds":["P10",false,"P11"],"sessionIds":["S1",1,"S2"]}'),
    ).toEqual({
      presentationIds: ["P10", "P11"],
      sessionIds: ["S1", "S2"],
    });
  });

  it("window がない環境では空配列を返す", () => {
    expect(bookmarksStorage.readBookmarks()).toEqual({
      presentationIds: [],
      sessionIds: [],
    });
  });

  it("localStorage からブックマークを読み出す", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) =>
            key === bookmarksStorageKey ? '{"presentationIds":["P10"],"sessionIds":["S10","S11"]}' : null,
        },
      },
    });

    expect(bookmarksStorage.readBookmarks()).toEqual({
      presentationIds: ["P10"],
      sessionIds: ["S10", "S11"],
    });
  });

  it("保存キーは APP_LOCALSTORAGE_PREFIX を先頭に付与する", () => {
    expect(bookmarksStorageKey).toBe(`${APP_LOCALSTORAGE_PREFIX}bookmarks`);
  });
});
