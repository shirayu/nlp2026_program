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
        showAuthors
        useSlackAppLinks={false}
        onClose={() => {}}
        onToggleShowAuthors={() => {}}
        onToggleUseSlackAppLinks={() => {}}
      />,
    );

    expect(html).toContain("ビルド情報");
    expect(html).toContain(BUILD_GIT_HASH);
    expect(html).toContain("Git hash");
    expect(html).toContain("Build time");
    expect(html).toContain("Data time");
  });
});
