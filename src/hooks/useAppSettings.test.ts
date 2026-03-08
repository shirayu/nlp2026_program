import { afterEach, describe, expect, it } from "vitest";
import { APP_LOCALSTORAGE_PREFIX } from "../constants";
import { appSettingsStorage, appSettingsStorageKey } from "./useAppSettings";

describe("appSettingsStorage", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("保存済み設定がなければデフォルト値を返す", () => {
    expect(appSettingsStorage.parseAppSettings(null)).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    });
  });

  it("不正な JSON はデフォルト値にフォールバックする", () => {
    expect(appSettingsStorage.parseAppSettings("{broken")).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    });
  });

  it("不足している項目はデフォルト値で補う", () => {
    expect(appSettingsStorage.parseAppSettings('{"showAuthors":false}')).toEqual({
      showAuthors: false,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    });
  });

  it("localStorage から設定を読み出す", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) =>
            key === appSettingsStorageKey
              ? '{"showAuthors":false,"useSlackAppLinks":false,"includeSessionTitleForNoPresentationSessions":false,"includeSessionTitleForPresentationSessions":true,"showTimeAtPresentationLevel":true,"zoomCustomUrls":{"venues":{"A":"https://example.com/a"}}}'
              : null,
        },
      },
    });

    expect(appSettingsStorage.readAppSettings()).toEqual({
      showAuthors: false,
      useSlackAppLinks: false,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: true,
      zoomCustomUrls: { venues: { A: "https://example.com/a" } },
    });
  });

  it("showRoomFloorLabels を保存済み設定から読み出す", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) =>
            key === appSettingsStorageKey
              ? '{"showAuthors":false,"useSlackAppLinks":false,"showRoomFloorLabels":false,"includeSessionTitleForNoPresentationSessions":false,"includeSessionTitleForPresentationSessions":true,"showTimeAtPresentationLevel":true,"zoomCustomUrls":{"venues":{"A":"https://example.com/a"}}}'
              : null,
        },
      },
    });

    expect(appSettingsStorage.readAppSettings()).toEqual({
      showAuthors: false,
      useSlackAppLinks: false,
      showRoomFloorLabels: false,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: true,
      zoomCustomUrls: { venues: { A: "https://example.com/a" } },
    });
  });

  it("zoomCustomUrls の空文字を除外する", () => {
    expect(
      appSettingsStorage.parseAppSettings(
        '{"zoomCustomUrls":{"venues":{"A":"  ","B":"https://example.com/b","C":"https://example.com/c","P":"   "},"sessions":{"S1":"https://example.com/s1"," ":"https://example.com/ignore","S2":"   "},"presentations":{"P1":"https://example.com/p1","P2":"   "}}}',
      ),
    ).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
      zoomCustomUrls: {
        venues: { B: "https://example.com/b", C: "https://example.com/c" },
        sessions: { S1: "https://example.com/s1" },
        presentations: { P1: "https://example.com/p1" },
      },
    });
  });

  it("旧 venueZoomUrls は受理しない", () => {
    expect(appSettingsStorage.parseAppSettings('{"venueZoomUrls":{"A":"https://example.com/a"}}')).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
      showRoomFloorLabels: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    });
  });

  it("保存キーは APP_LOCALSTORAGE_PREFIX を先頭に付与する", () => {
    expect(appSettingsStorageKey).toBe(`${APP_LOCALSTORAGE_PREFIX}settings`);
  });
});
