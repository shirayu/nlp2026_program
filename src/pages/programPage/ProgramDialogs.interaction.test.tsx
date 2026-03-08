/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ja } from "../../locales/ja";
import { SettingsDialog } from "./ProgramDialogs";

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === label,
  );
  if (!button) {
    throw new Error(`button not found: ${label}`);
  }
  return button as HTMLButtonElement;
}

function findImportDialog(container: HTMLElement, placeholder: string): HTMLElement {
  const dialog = Array.from(container.querySelectorAll("dialog")).find((element) => {
    const textarea = element.querySelector("textarea");
    return textarea?.getAttribute("placeholder") === placeholder;
  });
  if (!dialog) {
    throw new Error(`import dialog not found: ${placeholder}`);
  }
  return dialog as HTMLElement;
}

function findTextarea(container: HTMLElement): HTMLTextAreaElement {
  const textarea = container.querySelector("textarea");
  if (!textarea) {
    throw new Error("textarea not found");
  }
  return textarea as HTMLTextAreaElement;
}

function renderSettingsDialog(props?: Partial<Parameters<typeof SettingsDialog>[0]>) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const defaultProps: Parameters<typeof SettingsDialog>[0] = {
    dialogRef: { current: null },
    open: true,
    data: { persons: {}, affiliations: {}, rooms: {}, sessions: {}, presentations: {} },
    showAuthors: true,
    useSlackAppLinks: false,
    zoomCustomUrls: undefined,
    includeSessionTitleForNoPresentationSessions: true,
    includeSessionTitleForPresentationSessions: false,
    showTimeAtPresentationLevel: false,
    onClose: vi.fn(),
    onToggleShowAuthors: vi.fn(),
    onToggleUseSlackAppLinks: vi.fn(),
    onSetZoomCustomUrls: vi.fn(),
    onImportSettingsFromCode: async () => true,
    onImportZoomFromCode: async () => true,
    onToggleIncludeSessionTitleForNoPresentationSessions: vi.fn(),
    onToggleIncludeSessionTitleForPresentationSessions: vi.fn(),
    onToggleShowTimeAtPresentationLevel: vi.fn(),
    onExport: vi.fn(),
    hasBackup: false,
    onRestore: vi.fn(),
    onClearAllData: vi.fn(),
  };

  act(() => {
    root.render(<SettingsDialog {...defaultProps} {...props} />);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("SettingsDialog import button state", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("Zoom コードインポートは処理中にボタンを無効化し文言を切り替える", async () => {
    let resolveImport: ((value: boolean) => void) | undefined;
    const onImportZoomFromCode = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveImport = resolve;
        }),
    );
    const page = renderSettingsDialog({ onImportZoomFromCode });

    act(() => {
      findButton(page.container, ja.zoomCodeImport).click();
    });
    const zoomImportDialog = findImportDialog(page.container, ja.zoomImportCodePlaceholder);
    act(() => {
      const textarea = findTextarea(zoomImportDialog);
      textarea.value = "https://example.com/#import_zoom_settings=encoded";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      findButton(zoomImportDialog, ja.zoomImportCodeRun).click();
    });

    const importingButton = findButton(zoomImportDialog, ja.zoomImportCodeRunning);
    expect(importingButton.disabled).toBe(true);
    expect(onImportZoomFromCode).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveImport?.(true);
    });
    page.unmount();
  });

  it("設定インポートは処理中にボタンを無効化し文言を切り替える", async () => {
    let resolveImport: ((value: boolean) => void) | undefined;
    const onImportSettingsFromCode = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveImport = resolve;
        }),
    );
    const page = renderSettingsDialog({ onImportSettingsFromCode });

    act(() => {
      findButton(page.container, ja.settingsCodeImport).click();
    });
    const settingsImportDialog = findImportDialog(page.container, ja.settingsImportCodePlaceholder);
    act(() => {
      const textarea = findTextarea(settingsImportDialog);
      textarea.value = "https://example.com/#import_settings=encoded";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      findButton(settingsImportDialog, ja.settingsImportCodeRun).click();
    });

    const importingButton = findButton(settingsImportDialog, ja.settingsImportCodeRunning);
    expect(importingButton.disabled).toBe(true);
    expect(onImportSettingsFromCode).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveImport?.(true);
    });
    page.unmount();
  });
});
