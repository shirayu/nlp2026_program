import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUILD_GIT_HASH } from "../../constants";
import {
  ClearAllDataConfirmDialog,
  formatBuildGitDate,
  InstallDialog,
  RestoreBackupConfirmDialog,
  SettingsDialog,
  SettingsExportDialog,
  SettingsImportConfirmDialog,
} from "./ProgramDialogs";

describe("formatBuildGitDate", () => {
  it("指定タイムゾーン名つきのローカライズ日時を返す", () => {
    const formatted = formatBuildGitDate("2026-03-04T12:34:56Z", "en-US", "UTC");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("UTC");
  });
});

describe("InstallDialog", () => {
  it("データ再取得と最終更新情報を表示する", () => {
    const html = renderToStaticMarkup(
      <InstallDialog
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
        isUpdatingApp={false}
        appUpdateStatus="idle"
        installContext={{ isStandalone: false, isIos: false }}
        hasInstallPrompt={false}
        onClose={() => {}}
        onReloadData={() => {}}
        onUpdateApp={() => {}}
        onInstall={() => {}}
      />,
    );

    expect(html).toContain("データを再取得");
    expect(html).toContain("アプリ更新確認");
    expect(html).toContain("Data");
    expect(html).toContain("Main");
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

  it("更新結果メッセージを表示する", () => {
    const html = renderToStaticMarkup(
      <InstallDialog
        dialogRef={{ current: null }}
        open
        dataGeneratedAt="2026-03-05T01:44:12Z"
        lastUpdate={{
          program_main: { sha256: "aaa", time: "2026-03-04T09:00:00+09:00" },
        }}
        isReloadingData={false}
        reloadDataStatus="no_change"
        isUpdatingApp={false}
        appUpdateStatus="no_change"
        installContext={{ isStandalone: false, isIos: false }}
        hasInstallPrompt={false}
        onClose={() => {}}
        onReloadData={() => {}}
        onUpdateApp={() => {}}
        onInstall={() => {}}
      />,
    );

    expect(html).toContain("更新はありませんでした");
    expect(html).toContain("アプリは最新版です");
  });

  it("更新あり検知時のメッセージを表示する", () => {
    const html = renderToStaticMarkup(
      <InstallDialog
        dialogRef={{ current: null }}
        open
        dataGeneratedAt="2026-03-05T01:44:12Z"
        lastUpdate={{
          program_main: { sha256: "aaa", time: "2026-03-04T09:00:00+09:00" },
        }}
        isReloadingData={false}
        reloadDataStatus="idle"
        isUpdatingApp
        appUpdateStatus="updating"
        installContext={{ isStandalone: false, isIos: false }}
        hasInstallPrompt={false}
        onClose={() => {}}
        onReloadData={() => {}}
        onUpdateApp={() => {}}
        onInstall={() => {}}
      />,
    );

    expect(html).toContain("最新版が見つかりました。更新します");
  });
});

const defaultSettingsDialogProps = {
  dialogRef: { current: null } as { current: null },
  open: true,
  showAuthors: true,
  useSlackAppLinks: false,
  venueZoomUrls: undefined,
  includeSessionTitleForNoPresentationSessions: true,
  includeSessionTitleForPresentationSessions: false,
  onClose: () => {},
  onToggleShowAuthors: () => {},
  onToggleUseSlackAppLinks: () => {},
  onSetVenueZoomUrls: () => {},
  onToggleIncludeSessionTitleForNoPresentationSessions: () => {},
  onToggleIncludeSessionTitleForPresentationSessions: () => {},
  onExport: () => {},
  hasBackup: false,
  onRestore: () => {},
  onClearAllData: () => {},
};

describe("SettingsDialog", () => {
  it("ビルド情報を表示する", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html).toContain("ソフトウェア情報");
    expect(html).not.toContain('<h3 class="text-sm font-semibold text-gray-800">運営者</h3>');
    expect(html).toContain(BUILD_GIT_HASH);
    expect(html).toContain("Git hash");
    expect(html).toContain("Build time");
    expect(html).toContain("overflow-y-auto");
  });

  it("アイコン凡例を表示する", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html).toContain("アイコン凡例");
    expect(html).toContain("○ 発表者");
    expect(html).toContain("英語発表");
    expect(html).toContain("オンライン発表");
  });

  it("セッションタイトル検索設定セクションを表示する", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html).toContain("セッションタイトルを検索対象にする");
    expect(html).toContain("発表情報が無いセッション");
    expect(html).toContain("発表情報が有るセッション");
  });

  it("Zoom カスタムURL設定セクションを表示する", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html).toContain("Zoom");
    expect(html).toContain("A会場");
    expect(html).toContain("B会場");
  });

  it("大枠の下部にエクスポートボタンを表示する", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html).toContain("エクスポート");
    expect(html).not.toContain("設定・ブックマークのエクスポート</h3>");
  });

  it("全てのデータを削除ボタンを常に表示する", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html).toContain("全てのデータを削除");
    expect(html).toContain("データのリセット");
  });

  it("全データ削除セクションはエクスポートセクションより後に表示される", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html.indexOf("データのリセット")).toBeGreaterThan(html.indexOf("エクスポート"));
  });

  it("全データ削除セクションはソフトウェア情報より後に表示される", () => {
    const html = renderToStaticMarkup(<SettingsDialog {...defaultSettingsDialogProps} />);

    expect(html.indexOf("データのリセット")).toBeGreaterThan(html.indexOf("ソフトウェア情報"));
  });
});

describe("SettingsExportDialog", () => {
  it("Zoom カスタムURLがエクスポート対象外である注意書きを表示する", () => {
    const html = renderToStaticMarkup(
      <SettingsExportDialog open exportUrl="https://example.com/#import_settings=abc" onClose={() => {}} />,
    );

    expect(html).toContain("Zoom カスタムURLは含まれません。");
  });
});

describe("SettingsImportConfirmDialog", () => {
  it("設定インポートでは維持メッセージとバックアップ案内を表示する", () => {
    const html = renderToStaticMarkup(
      <SettingsImportConfirmDialog open isInvalid={false} onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(html).toContain("上書きされます");
    expect(html).toContain("Zoom カスタムURL は上書きされず、現在の設定を維持します。");
    expect(html).toContain("復元");
    expect(html).toContain("インポートする");
  });

  it("Zoom インポートでは設定インポート専用メッセージを表示しない", () => {
    const html = renderToStaticMarkup(
      <SettingsImportConfirmDialog open isInvalid={false} target="zoom" onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(html).toContain("Zoom カスタムURL が上書きされます");
    expect(html).not.toContain("現在の設定を維持します");
    expect(html).not.toContain("復元");
  });

  it("isInvalid のときエラーメッセージを表示しインポートボタンを非表示にする", () => {
    const html = renderToStaticMarkup(
      <SettingsImportConfirmDialog open isInvalid onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(html).toContain("無効なため");
    expect(html).not.toContain("インポートする");
  });
});

const backupPayload = {
  settings: {
    showAuthors: true,
    useSlackAppLinks: false,
    includeSessionTitleForNoPresentationSessions: true,
    includeSessionTitleForPresentationSessions: false,
  },
  bookmarks: { presentationIds: [], sessionIds: [] },
};

describe("RestoreBackupConfirmDialog", () => {
  it("before_import のみの場合、インポート前の選択肢だけを表示する", () => {
    const html = renderToStaticMarkup(
      <RestoreBackupConfirmDialog
        open
        entries={[{ kind: "before_import", savedAt: "2026-03-06T10:00:00.000Z", payload: backupPayload }]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(html).toContain("バックアップから復元");
    expect(html).toContain("インポート前の状態");
    expect(html).not.toContain("復元前の状態");
    expect(html).toContain("キャンセル");
  });

  it("2世代ある場合、両方の選択肢を表示する", () => {
    const html = renderToStaticMarkup(
      <RestoreBackupConfirmDialog
        open
        entries={[
          { kind: "before_import", savedAt: "2026-03-06T10:00:00.000Z", payload: backupPayload },
          { kind: "before_restore", savedAt: "2026-03-06T11:00:00.000Z", payload: backupPayload },
        ]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(html).toContain("インポート前の状態");
    expect(html).toContain("復元前の状態");
  });

  it("エントリが空の場合、選択肢を表示しない", () => {
    const html = renderToStaticMarkup(
      <RestoreBackupConfirmDialog open entries={[]} onConfirm={() => {}} onCancel={() => {}} />,
    );

    expect(html).not.toContain("インポート前の状態");
    expect(html).not.toContain("復元前の状態");
    expect(html).toContain("キャンセル");
  });

  it("savedAt の時刻をフォーマットして表示する", () => {
    const html = renderToStaticMarkup(
      <RestoreBackupConfirmDialog
        open
        entries={[{ kind: "before_import", savedAt: "2026-03-06T10:00:00.000Z", payload: backupPayload }]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(html).toContain("2026");
    expect(html).toMatch(/(JST|GMT\+9|GMT\+09:00|UTC\+09:00)/);
  });

  it("2世代ある場合、それぞれ異なる時刻を表示する", () => {
    const html = renderToStaticMarkup(
      <RestoreBackupConfirmDialog
        open
        entries={[
          { kind: "before_import", savedAt: "2026-03-06T01:00:00.000Z", payload: backupPayload },
          { kind: "before_restore", savedAt: "2026-03-06T02:00:00.000Z", payload: backupPayload },
        ]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    // JST では 10:00 と 11:00 になる
    expect(html).toContain("10:00:00");
    expect(html).toContain("11:00:00");
  });
});

describe("ClearAllDataConfirmDialog", () => {
  it("削除の説明と確認・キャンセルボタンを表示する", () => {
    const html = renderToStaticMarkup(<ClearAllDataConfirmDialog open onConfirm={() => {}} onCancel={() => {}} />);

    expect(html).toContain("データのリセット");
    expect(html).toContain("削除する");
    expect(html).toContain("キャンセル");
  });
});
