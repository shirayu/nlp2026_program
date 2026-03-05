import { X as CloseIcon, RefreshCw } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import {
  AUTHOR_NAME,
  AUTHOR_WEBSITE_URL,
  BUILD_GIT_DATE,
  BUILD_GIT_HASH,
  PROJECT_REPOSITORY_URL,
} from "../../constants";
import type { DataReloadStatus } from "../../hooks/useConferenceData";
import { ja } from "../../locales/ja";
import { fullscreenDialogClassName } from "./utils";

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

export function InstallDialog({
  dialogRef,
  open,
  installContext,
  hasInstallPrompt,
  onClose,
  onInstall,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  installContext: { isStandalone: boolean; isIos: boolean };
  hasInstallPrompt: boolean;
  onClose: () => void;
  onInstall: () => void;
}) {
  const installSectionClassName = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-3";

  let installSectionContent: ReactNode;
  if (installContext.isStandalone) {
    installSectionContent = (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideInstalledLead}</p>
        <p className="mt-2 text-gray-500">{ja.installGuideInstalledDescription}</p>
      </>
    );
  } else if (installContext.isIos) {
    installSectionContent = (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideIosLead}</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-600">
          {ja.installGuideIosSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </>
    );
  } else if (hasInstallPrompt) {
    installSectionContent = (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          {ja.later}
        </button>
        <button
          type="button"
          onClick={onInstall}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          {ja.installNow}
        </button>
      </div>
    );
  } else {
    installSectionContent = (
      <>
        <p className="font-bold text-gray-800">{ja.installGuideUnsupportedLead}</p>
        <p className="mt-2 text-gray-500">{ja.installGuideUnsupportedDescription}</p>
      </>
    );
  }

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          aria-label={ja.closeInstallGuide}
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
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
          <div className="space-y-4 px-4 py-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p>{ja.installGuideLead}</p>
              <p>{ja.installGuideDescription}</p>
            </div>
            <section className={installSectionClassName}>{installSectionContent}</section>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SettingsDialog({
  dialogRef,
  open,
  dataGeneratedAt,
  isReloadingData,
  reloadDataStatus,
  showAuthors,
  useSlackAppLinks,
  onClose,
  onReloadData,
  onToggleShowAuthors,
  onToggleUseSlackAppLinks,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  dataGeneratedAt?: string;
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  showAuthors: boolean;
  useSlackAppLinks: boolean;
  onClose: () => void;
  onReloadData: () => void;
  onToggleShowAuthors: () => void;
  onToggleUseSlackAppLinks: () => void;
}) {
  const formattedBuildGitDate = formatBuildGitDate(BUILD_GIT_DATE);
  const formattedDataGeneratedAt = dataGeneratedAt ? formatBuildGitDate(dataGeneratedAt) : null;

  return (
    <dialog ref={dialogRef} open={open} onClose={onClose} onCancel={onClose} className={fullscreenDialogClassName}>
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          aria-label={ja.closeDisplaySettings}
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-800">{ja.displaySettings}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={ja.closeDisplaySettings}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2 px-4 py-4">
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
            <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">{ja.reloadData}</p>
                <button
                  type="button"
                  onClick={onReloadData}
                  disabled={isReloadingData}
                  className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
                    isReloadingData
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : "border-gray-300 bg-white text-gray-600"
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isReloadingData ? "animate-spin" : ""}`} />
                  <span>{isReloadingData ? ja.reloadingData : ja.reloadDataShort}</span>
                </button>
              </div>
              {reloadDataStatus === "no_change" && <p className="mt-2 text-xs text-gray-500">{ja.reloadNoChanges}</p>}
              {reloadDataStatus === "error" && <p className="mt-2 text-xs text-rose-600">{ja.reloadFailed}</p>}
            </section>
            <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.aboutAuthor}</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.authorName}</dt>
                  <dd className="min-w-0 text-left text-gray-800">{AUTHOR_NAME}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.authorWebsite}</dt>
                  <dd className="min-w-0 text-left">
                    <a
                      href={AUTHOR_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-700"
                    >
                      {AUTHOR_WEBSITE_URL}
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
                      {PROJECT_REPOSITORY_URL}
                    </a>
                  </dd>
                </div>
              </dl>
            </section>
            <section className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <h3 className="text-sm font-semibold text-gray-800">{ja.buildInfo}</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.gitHash}</dt>
                  <dd className="min-w-0 break-all font-mono text-left text-gray-800">{BUILD_GIT_HASH}</dd>
                </div>
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                  <dt className="text-gray-500">{ja.gitDate}</dt>
                  <dd className="min-w-0 break-all font-mono text-left text-gray-800">{formattedBuildGitDate}</dd>
                </div>
                {formattedDataGeneratedAt && (
                  <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4">
                    <dt className="text-gray-500">{ja.dataGeneratedAt}</dt>
                    <dd className="min-w-0 break-all font-mono text-left text-gray-800">{formattedDataGeneratedAt}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </dialog>
  );
}
