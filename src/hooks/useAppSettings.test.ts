import { afterEach, describe, expect, it } from "vitest";
import { appSettingsStorage, appSettingsStorageKey } from "./useAppSettings";

describe("appSettingsStorage", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("保存済み設定がなければデフォルト値を返す", () => {
    expect(appSettingsStorage.parseAppSettings(null)).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
    });
  });

  it("不正な JSON はデフォルト値にフォールバックする", () => {
    expect(appSettingsStorage.parseAppSettings("{broken")).toEqual({
      showAuthors: true,
      useSlackAppLinks: true,
    });
  });

  it("不足している項目はデフォルト値で補う", () => {
    expect(appSettingsStorage.parseAppSettings('{"showAuthors":false}')).toEqual({
      showAuthors: false,
      useSlackAppLinks: true,
    });
  });

  it("localStorage から設定を読み出す", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) =>
            key === appSettingsStorageKey ? '{"showAuthors":false,"useSlackAppLinks":false}' : null,
        },
      },
    });

    expect(appSettingsStorage.readAppSettings()).toEqual({
      showAuthors: false,
      useSlackAppLinks: false,
    });
  });
});
