import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUILD_GIT_HASH } from "../../constants";
import { formatBuildGitDate, SettingsDialog } from "./ProgramDialogs";

describe("formatBuildGitDate", () => {
  it("指定タイムゾーン名つきのローカライズ日時を返す", () => {
    const formatted = formatBuildGitDate("2026-03-04T12:34:56Z", "en-US", "UTC");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("UTC");
  });
});

describe("SettingsDialog", () => {
  it("ビルド情報を表示する", () => {
    const html = renderToStaticMarkup(
      <SettingsDialog
        dialogRef={{ current: null }}
        open
        dataGeneratedAt="2026-03-05T01:44:12Z"
        lastUpdate={{
          program_main: { sha256: "aaa", time: "2026-03-04T09:00:00+09:00" },
          workshop: { sha256: "bbb", time: "2026-03-05T08:00:00+09:00" },
          invitedpapers: { sha256: "ccc", time: "2026-03-05T08:10:00+09:00" },
          youtube: { sha256: "ddd", time: "2026-03-05T08:20:00+09:00" },
        }}
        isReloadingData={false}
        reloadDataStatus="idle"
        showAuthors
        useSlackAppLinks={false}
        onClose={() => {}}
        onReloadData={() => {}}
        onToggleShowAuthors={() => {}}
        onToggleUseSlackAppLinks={() => {}}
      />,
    );

    expect(html).toContain("Build information");
    expect(html).toContain(BUILD_GIT_HASH);
    expect(html).toContain("Git hash");
    expect(html).toContain("Build time");
    expect(html).toContain("Data");
    expect(html).toContain("Main");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("Workshop");
    expect(html).toContain("Invitedpapers");
    expect(html).toContain("YouTube");
    expect(html).toContain("(aaa)");
    expect(html).toContain("(bbb)");
    expect(html).toContain("(ccc)");
    expect(html).toContain("(ddd)");
    expect(html).toMatch(/(JST|GMT\+9|GMT\+09:00|UTC\+09:00)/);
    expect(html.indexOf("データを再取得")).toBeLessThan(html.indexOf("Main"));
  });

  it("アイコン凡例を表示する", () => {
    const html = renderToStaticMarkup(
      <SettingsDialog
        dialogRef={{ current: null }}
        open
        dataGeneratedAt="2026-03-05T01:44:12Z"
        lastUpdate={{
          program_main: { sha256: "aaa", time: "2026-03-04T09:00:00+09:00" },
        }}
        isReloadingData={false}
        reloadDataStatus="idle"
        showAuthors
        useSlackAppLinks={false}
        onClose={() => {}}
        onReloadData={() => {}}
        onToggleShowAuthors={() => {}}
        onToggleUseSlackAppLinks={() => {}}
      />,
    );

    expect(html).toContain("アイコン凡例");
    expect(html).toContain("○ 発表者");
    expect(html).toContain("英語発表");
    expect(html).toContain("オンライン発表");
  });

  it("再取得結果が no_change のとき更新なしを表示する", () => {
    const html = renderToStaticMarkup(
      <SettingsDialog
        dialogRef={{ current: null }}
        open
        dataGeneratedAt="2026-03-05T01:44:12Z"
        lastUpdate={{
          program_main: { sha256: "aaa", time: "2026-03-04T09:00:00+09:00" },
        }}
        isReloadingData={false}
        reloadDataStatus="no_change"
        showAuthors
        useSlackAppLinks={false}
        onClose={() => {}}
        onReloadData={() => {}}
        onToggleShowAuthors={() => {}}
        onToggleUseSlackAppLinks={() => {}}
      />,
    );

    expect(html).toContain("更新はありませんでした");
  });
});
