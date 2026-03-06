import { AlertTriangle, X as CloseIcon, Github, Globe, Monitor, RefreshCw, Share2 } from "lucide-react";
import type { RefObject } from "react";
import { useState } from "react";
import {
  BUILD_GIT_DATE,
  BUILD_GIT_HASH,
  DEVELOPER_GITHUB_URL,
  DEVELOPER_NAME,
  DEVELOPER_WEBSITE_URL,
  LICENSE_NAME,
  OPERATOR_NAME,
  OPERATOR_REPOSITORY_URL,
  OPERATOR_WEBSITE_URL,
  PROJECT_REPOSITORY_URL,
} from "../../constants";
import type { DataReloadStatus } from "../../hooks/useConferenceData";
import type { BackupEntry } from "../../lib/appDataBackup";
import { ja } from "../../locales/ja";
import type { LastUpdateEntry } from "../../types";
import { fullscreenDialogClassName } from "./utils";

type LastUpdateRow = { label: string; time: string };
type AppUpdateStatus = "idle" | "updating" | "no_change" | "error";
const dialogFramePaddingStyle = {
  paddingTop: "max(1rem, env(safe-area-inset-top))",
  paddingRight: "max(1rem, env(safe-area-inset-right))",
  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
  paddingLeft: "max(1rem, env(safe-area-inset-left))",
} as const;

export function formatBuildGitDate(value: string, locale?: string | string[], timeZone?: string): string {
  if (value === "unknown") return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function shortHash(value: string | null): string {
  if (!value) return "null";
  if (value.length <= 6) return value;
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

function omitHttps(value: string): string {
  return value.replace(/^https?:\/\//, "");
}

function normalizeComparableUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function buildLastUpdateRows(lastUpdate?: Record<string, LastUpdateEntry>): {
  mainRow: LastUpdateRow | null;
  secondaryRows: LastUpdateRow[];
} {
  const rows = [
    { key: "program_main", label: ja.programMainLastUpdatedAt },
    { key: "workshop", label: ja.workshopLastUpdatedAt },
    { key: "invitedpapers", label: ja.invitedpapersLastUpdatedAt },
    { key: "youtube", label: ja.youtubeLastUpdatedAt },
  ]
    .map(({ key, label }) => {
      const entry = lastUpdate?.[key];
      if (!entry) return null;
      return {
        label,
        time: `${formatBuildGitDate(entry.time, undefined, "Asia/Tokyo")} (${shortHash(entry.sha256)})`,
      };
    })
    .filter((row): row is LastUpdateRow => row !== null);

  return {
    mainRow: rows.find((row) => row.label === ja.programMainLastUpdatedAt) ?? null,
    secondaryRows: rows.filter((row) => row.label !== ja.programMainLastUpdatedAt),
  };
}

type InstallContext = { isStandalone: boolean; isIos: boolean };

type InstallDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  dataGeneratedAt?: string;
  lastUpdate?: Record<string, LastUpdateEntry>;
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  isUpdatingApp: boolean;
  appUpdateStatus: AppUpdateStatus;
  installContext: InstallContext;
  hasInstallPrompt: boolean;
  onClose: () => void;
  onReloadData: () => void;
  onUpdateApp: () => void;
  onInstall: () => void;
};

type LastUpdateDetailsProps = {
  formattedDataGeneratedAt: string | null;
  mainRow: LastUpdateRow | null;
  secondaryRows: LastUpdateRow[];
};

function InstallActionSection({
  installContext,
  hasInstallPrompt,
  onInstall,
}: {
  installContext: InstallContext;
  hasInstallPrompt: boolean;
  onInstall: () => void;
}) {
  if (installContext.isStandalone) {
    return (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideInstalledLead}</p>
        <p className="mt-2 text-gray-500">{ja.installGuideInstalledDescription}</p>
      </>
    );
  }

  if (installContext.isIos) {
    return (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideIosLead}</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-600">
          {ja.installGuideIosSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </>
    );
  }

  if (hasInstallPrompt) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onInstall}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          {ja.installNow}
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="font-bold text-gray-800">{ja.installGuideUnsupportedLead}</p>
      <p className="mt-2 text-gray-500">{ja.installGuideUnsupportedDescription}</p>
    </>
  );
}

function LastUpdateDetails({ formattedDataGeneratedAt, mainRow, secondaryRows }: LastUpdateDetailsProps) {
  if (!formattedDataGeneratedAt && !mainRow && secondaryRows.length === 0) {
    return null;
  }

  return (
    <dl className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-sm">
      {formattedDataGeneratedAt && (
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
          <dt className="text-gray-500">{ja.dataGeneratedAt}</dt>
          <dd className="min-w-0 break-all font-mono text-left text-gray-800">{formattedDataGeneratedAt}</dd>
        </div>
      )}
      {mainRow && (
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
          <dt className="text-gray-500">{mainRow.label}</dt>
          <dd className="min-w-0 break-all font-mono text-left text-gray-800">{mainRow.time}</dd>
        </div>
      )}
      {secondaryRows.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-white px-2 py-1">
          <summary className="cursor-pointer text-xs text-gray-600">{ja.otherSources}</summary>
          {secondaryRows.map((row) => (
            <div key={row.label} className="mt-2 grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
              <dt className="text-gray-500">{row.label}</dt>
              <dd className="min-w-0 break-all font-mono text-left text-gray-800">{row.time}</dd>
            </div>
          ))}
        </details>
      )}
    </dl>
  );
}

function DataUpdateSection({
  isReloadingData,
  reloadDataStatus,
  formattedDataGeneratedAt,
  mainRow,
  secondaryRows,
  onReloadData,
}: {
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  formattedDataGeneratedAt: string | null;
  mainRow: LastUpdateRow | null;
  secondaryRows: LastUpdateRow[];
  onReloadData: () => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{ja.reloadData}</p>
        <button
          type="button"
          onClick={onReloadData}
          disabled={isReloadingData}
          className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
            isReloadingData ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 bg-white text-gray-600"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isReloadingData ? "animate-spin" : ""}`} />
          <span>{isReloadingData ? ja.reloadingData : ja.reloadDataShort}</span>
        </button>
      </div>
      {reloadDataStatus === "no_change" && <p className="mt-2 text-xs text-gray-500">{ja.reloadNoChanges}</p>}
      {reloadDataStatus === "error" && <p className="mt-2 text-xs text-rose-600">{ja.reloadFailed}</p>}
      <LastUpdateDetails
        formattedDataGeneratedAt={formattedDataGeneratedAt}
        mainRow={mainRow}
        secondaryRows={secondaryRows}
      />
    </section>
  );
}

function AppUpdateSection({
  isUpdatingApp,
  appUpdateStatus,
  onUpdateApp,
}: {
  isUpdatingApp: boolean;
  appUpdateStatus: AppUpdateStatus;
  onUpdateApp: () => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{ja.reloadApp}</p>
        <button
          type="button"
          onClick={onUpdateApp}
          disabled={isUpdatingApp}
          className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
            isUpdatingApp ? "border-gray-200 bg-gray-100 text-gray-400" : "border-gray-300 bg-white text-gray-600"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isUpdatingApp ? "animate-spin" : ""}`} />
          <span>{isUpdatingApp ? ja.reloadingApp : ja.reloadAppShort}</span>
        </button>
      </div>
      {appUpdateStatus === "updating" && <p className="mt-2 text-xs text-gray-500">{ja.reloadAppFoundUpdate}</p>}
      {appUpdateStatus === "no_change" && <p className="mt-2 text-xs text-gray-500">{ja.reloadAppNoChanges}</p>}
      {appUpdateStatus === "error" && <p className="mt-2 text-xs text-rose-600">{ja.reloadAppFailed}</p>}
    </section>
  );
}

export function InstallDialog({
  dialogRef,
  open,
  dataGeneratedAt,
  lastUpdate,
  isReloadingData,
  reloadDataStatus,
  isUpdatingApp,
  appUpdateStatus,
  installContext,
  hasInstallPrompt,
  onClose,
  onReloadData,
  onUpdateApp,
  onInstall,
}: InstallDialogProps) {
  const formattedDataGeneratedAt = dataGeneratedAt ? formatBuildGitDate(dataGeneratedAt) : null;
  const { mainRow, secondaryRows } = buildLastUpdateRows(lastUpdate);

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.closeInstallGuide}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.installApp}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.closeInstallGuide}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div
            className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 text-sm text-gray-700"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="space-y-2">
              <p>
                {ja.installGuideLead}
                {ja.installGuideDescription}
                <br />
                {ja.installGuideUpdateDescription}
              </p>
            </div>
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <InstallActionSection
                installContext={installContext}
                hasInstallPrompt={hasInstallPrompt}
                onInstall={onInstall}
              />
            </div>
            <DataUpdateSection
              isReloadingData={isReloadingData}
              reloadDataStatus={reloadDataStatus}
              formattedDataGeneratedAt={formattedDataGeneratedAt}
              mainRow={mainRow}
              secondaryRows={secondaryRows}
              onReloadData={onReloadData}
            />
            <AppUpdateSection
              isUpdatingApp={isUpdatingApp}
              appUpdateStatus={appUpdateStatus}
              onUpdateApp={onUpdateApp}
            />
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsExportDialog({
  open,
  exportUrl,
  onClose,
}: {
  open: boolean;
  exportUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <dialog open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.exportAppDataClose}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.exportAppDataDialogTitle}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.exportAppDataClose}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.exportAppDataDescription}</p>
            <textarea
              readOnly
              value={exportUrl}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 focus:outline-none"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.exportAppDataClose}
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {copied ? ja.exportAppDataCopied : ja.exportAppDataCopy}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsImportConfirmDialog({
  open,
  isInvalid,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  isInvalid: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <dialog open={open} onClose={onCancel} onCancel={onCancel} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.importAppDataCancel}
          className="fixed inset-0 bg-black/55"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">{ja.importAppDataDialogTitle}</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.importAppDataCancel}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            {isInvalid ? (
              <p className="text-sm text-red-600">{ja.importAppDataInvalid}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">{ja.importAppDataWarning}</p>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{ja.importAppDataBackupNote}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.importAppDataCancel}
              </button>
              {!isInvalid && (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  {ja.importAppDataConfirm}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsDialog({
  dialogRef,
  open,
  showAuthors,
  useSlackAppLinks,
  includeSessionTitleForNoPresentationSessions,
  includeSessionTitleForPresentationSessions,
  onClose,
  onToggleShowAuthors,
  onToggleUseSlackAppLinks,
  onToggleIncludeSessionTitleForNoPresentationSessions,
  onToggleIncludeSessionTitleForPresentationSessions,
  onExport,
  hasBackup,
  onRestore,
  onClearAllData,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  showAuthors: boolean;
  useSlackAppLinks: boolean;
  includeSessionTitleForNoPresentationSessions: boolean;
  includeSessionTitleForPresentationSessions: boolean;
  onClose: () => void;
  onToggleShowAuthors: () => void;
  onToggleUseSlackAppLinks: () => void;
  onToggleIncludeSessionTitleForNoPresentationSessions: () => void;
  onToggleIncludeSessionTitleForPresentationSessions: () => void;
  onExport: () => void;
  hasBackup: boolean;
  onRestore: () => void;
  onClearAllData: () => void;
}) {
  const formattedBuildGitDate = formatBuildGitDate(BUILD_GIT_DATE);
  const shouldShowOperatorSection =
    OPERATOR_NAME !== DEVELOPER_NAME ||
    normalizeComparableUrl(OPERATOR_REPOSITORY_URL) !== normalizeComparableUrl(PROJECT_REPOSITORY_URL);

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.closeDisplaySettings}
          className="fixed inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.settings}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.closeDisplaySettings}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto px-4 py-4" style={{ scrollbarGutter: "stable" }}>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{ja.showAuthors}</span>
              <button
                type="button"
                onClick={onToggleShowAuthors}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${showAuthors ? "bg-indigo-600" : "bg-gray-300"}`}
                aria-pressed={showAuthors}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showAuthors ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{ja.useSlackAppLinks}</span>
              <button
                type="button"
                onClick={onToggleUseSlackAppLinks}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${useSlackAppLinks ? "bg-indigo-600" : "bg-gray-300"}`}
                aria-pressed={useSlackAppLinks}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${useSlackAppLinks ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </label>
            <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.sessionTitleSearchSettings}</h3>
              <div className="mt-2 space-y-2">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{ja.includeSessionTitleForNoPresentationSessions}</span>
                  <button
                    type="button"
                    onClick={onToggleIncludeSessionTitleForNoPresentationSessions}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${includeSessionTitleForNoPresentationSessions ? "bg-indigo-600" : "bg-gray-300"}`}
                    aria-pressed={includeSessionTitleForNoPresentationSessions}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeSessionTitleForNoPresentationSessions ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{ja.includeSessionTitleForPresentationSessions}</span>
                  <button
                    type="button"
                    onClick={onToggleIncludeSessionTitleForPresentationSessions}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${includeSessionTitleForPresentationSessions ? "bg-indigo-600" : "bg-gray-300"}`}
                    aria-pressed={includeSessionTitleForPresentationSessions}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeSessionTitleForPresentationSessions ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </label>
              </div>
            </section>
            <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.iconLegend}</h3>
              <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                <li>{ja.legendPresenter}</li>
                <li className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  <span>{ja.legendEnglish}</span>
                </li>
                <li className="flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5 text-green-400" />
                  <span>{ja.legendOnline}</span>
                </li>
              </ul>
            </section>
            <ExportSection hasBackup={hasBackup} onRestore={onRestore} onExport={onExport} />
            {shouldShowOperatorSection && (
              <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <h3 className="text-sm font-semibold text-gray-800">{ja.operator}</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                    <dt className="text-gray-500">{ja.operator}</dt>
                    <dd className="min-w-0 text-left">
                      <a
                        href={OPERATOR_WEBSITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                      >
                        {OPERATOR_NAME}
                      </a>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                    <dt className="text-gray-500">{ja.projectRepository}</dt>
                    <dd className="min-w-0 text-left">
                      <a
                        href={OPERATOR_REPOSITORY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                      >
                        {omitHttps(OPERATOR_REPOSITORY_URL)}
                      </a>
                    </dd>
                  </div>
                </dl>
              </section>
            )}
            <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.softwareInfo}</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.developer}</dt>
                  <dd className="min-w-0 text-left">
                    <a
                      href={DEVELOPER_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                    >
                      {DEVELOPER_NAME}
                    </a>
                    <a
                      href={DEVELOPER_GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={ja.projectRepository}
                      className="ml-2 inline-flex align-middle text-gray-500 transition-colors hover:text-gray-700"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  </dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.projectRepository}</dt>
                  <dd className="min-w-0 text-left">
                    <a
                      href={PROJECT_REPOSITORY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                    >
                      {omitHttps(PROJECT_REPOSITORY_URL)}
                    </a>
                  </dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.license}</dt>
                  <dd className="min-w-0 text-left text-gray-800">{LICENSE_NAME}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.gitHash}</dt>
                  <dd className="min-w-0 break-all font-mono text-left text-gray-800">{BUILD_GIT_HASH}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.gitDate}</dt>
                  <dd className="min-w-0 break-all font-mono text-left text-gray-800">{formattedBuildGitDate}</dd>
                </div>
              </dl>
            </section>
            <ClearAllDataSection onClearAllData={onClearAllData} />
          </div>
        </div>
      </div>
    </dialog>
  );
}

function ExportSection({
  hasBackup,
  onRestore,
  onExport,
}: {
  hasBackup: boolean;
  onRestore: () => void;
  onExport: () => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
      <h3 className="text-sm font-semibold text-gray-800">{ja.exportAppDataDialogTitle}</h3>
      <div className="mt-2 flex justify-end gap-2">
        {hasBackup && (
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-amber-400 hover:text-amber-700"
          >
            {ja.restoreBackup}
          </button>
        )}
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
        >
          <Share2 className="h-3.5 w-3.5" />
          {ja.exportAppData}
        </button>
      </div>
    </section>
  );
}

function ClearAllDataSection({ onClearAllData }: { onClearAllData: () => void }) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
      <h3 className="text-sm font-semibold text-red-800">{ja.clearAllDataSection}</h3>
      <p className="mt-1 text-xs text-red-600">{ja.clearAllDataDescription}</p>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onClearAllData}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
        >
          {ja.clearAllData}
        </button>
      </div>
    </section>
  );
}

const backupKindLabel: Record<BackupEntry["kind"], string> = {
  before_import: ja.restoreBackupKindBeforeImport,
  before_restore: ja.restoreBackupKindBeforeRestore,
};

export function RestoreBackupConfirmDialog({
  open,
  entries,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  entries: BackupEntry[];
  onConfirm: (kind: BackupEntry["kind"]) => void;
  onCancel: () => void;
}) {
  return (
    <dialog open={open} onClose={onCancel} onCancel={onCancel} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.restoreBackupCancel}
          className="fixed inset-0 bg-black/55"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
            <h2 className="text-sm font-bold text-amber-800">{ja.restoreBackupSection}</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.restoreBackupCancel}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.restoreBackupDescription}</p>
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.kind}>
                  <button
                    type="button"
                    onClick={() => onConfirm(entry.kind)}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
                  >
                    <span className="block text-sm font-medium text-amber-800">{backupKindLabel[entry.kind]}</span>
                    <span className="block font-mono text-xs text-amber-600">
                      {formatBuildGitDate(entry.savedAt, "ja-JP", "Asia/Tokyo")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.restoreBackupCancel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function ClearAllDataConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <dialog open={open} onClose={onCancel} onCancel={onCancel} className={fullscreenDialogClassName}>
      <div className="flex min-h-dvh items-center justify-center p-4" style={dialogFramePaddingStyle}>
        <button
          type="button"
          aria-label={ja.clearAllDataCancel}
          className="fixed inset-0 bg-black/55"
          onClick={onCancel}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">{ja.clearAllDataSection}</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.clearAllDataCancel}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-4 py-4">
            <p className="text-sm text-gray-700">{ja.clearAllDataDescription}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                {ja.clearAllDataCancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                {ja.clearAllDataConfirm}
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
