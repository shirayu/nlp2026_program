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
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    });
  });

  it("不正な JSON はデフォルト値にフォールバックする", () => {
    expect(appSettingsStorage.parseAppSettings("{broken")).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
    });
  });

  it("不足している項目はデフォルト値で補う", () => {
    expect(appSettingsStorage.parseAppSettings('{"showAuthors":false}')).toEqual({
      showAuthors: false,
      useSlackAppLinks: true,
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
              ? '{"showAuthors":false,"useSlackAppLinks":false,"includeSessionTitleForNoPresentationSessions":false,"includeSessionTitleForPresentationSessions":true,"showTimeAtPresentationLevel":true,"venueZoomUrls":{"A":"https://example.com/a"}}'
              : null,
        },
      },
    });

    expect(appSettingsStorage.readAppSettings()).toEqual({
      showAuthors: false,
      useSlackAppLinks: false,
      includeSessionTitleForNoPresentationSessions: false,
      includeSessionTitleForPresentationSessions: true,
      showTimeAtPresentationLevel: true,
      venueZoomUrls: { A: "https://example.com/a" },
    });
  });

  it("venueZoomUrls が空文字なら設定から除外する", () => {
    expect(appSettingsStorage.parseAppSettings('{"venueZoomUrls":{"A":"  ","B":"https://example.com/b"}}')).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
      includeSessionTitleForNoPresentationSessions: true,
      includeSessionTitleForPresentationSessions: false,
      showTimeAtPresentationLevel: false,
      venueZoomUrls: { B: "https://example.com/b" },
    });
  });

  it("保存キーは APP_LOCALSTORAGE_PREFIX を先頭に付与する", () => {
    expect(appSettingsStorageKey).toBe(`${APP_LOCALSTORAGE_PREFIX}settings`);
  });
});
