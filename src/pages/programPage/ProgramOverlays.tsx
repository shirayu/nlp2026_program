import type { RefObject } from "react";
import { PersonModal } from "../../components/PersonModal";
import type { DataReloadStatus } from "../../hooks/useConferenceData";
import type { BackupEntry } from "../../lib/appDataBackup";
import type { ConferenceData, PersonId, PresentationId, SessionId, ZoomCustomUrls } from "../../types";
import {
  ClearAllDataConfirmDialog,
  InstallDialog,
  RestoreBackupConfirmDialog,
  SettingsDialog,
  SettingsExportDialog,
  SettingsImportConfirmDialog,
} from "./ProgramDialogs";

export function ProgramOverlays({
  personModal,
  data,
  bookmarkedPresentationIds,
  showAuthors,
  slackTeamId = null,
  onClosePersonModal,
  onPersonClick,
  onJumpToSessionFromPerson,
  onToggleBookmark,
  installDialogRef,
  showInstallDialog,
  installContext,
  hasInstallPrompt,
  isUpdatingApp,
  appUpdateStatus,
  onCloseInstallDialog,
  onReloadData,
  onUpdateApp,
  onInstall,
  settingsDialogRef,
  showSettings,
  isReloadingData,
  reloadDataStatus,
  useSlackAppLinks,
  zoomCustomUrls,
  includeSessionTitleForNoPresentationSessions,
  includeSessionTitleForPresentationSessions,
  showTimeAtPresentationLevel,
  onCloseSettings,
  onToggleShowAuthors,
  onToggleUseSlackAppLinks,
  onSetZoomCustomUrls,
  onImportZoomFromCode,
  onToggleIncludeSessionTitleForNoPresentationSessions,
  onToggleIncludeSessionTitleForPresentationSessions,
  onToggleShowTimeAtPresentationLevel,
  onExportSettings,
  showSettingsExport,
  exportUrl,
  onCloseSettingsExport,
  showSettingsImportConfirm,
  importInvalid,
  importTarget,
  onConfirmImport,
  onCancelImport,
  backupEntries,
  hasBackup,
  onRestoreBackup,
  onClearAllData,
  showRestoreConfirm,
  onConfirmRestore,
  onCancelRestore,
  showClearAllDataConfirm,
  onConfirmClearAllData,
  onCancelClearAllData,
}: {
  personModal: PersonId | null;
  data: ConferenceData;
  bookmarkedPresentationIds: Set<PresentationId>;
  showAuthors: boolean;
  slackTeamId?: string | null;
  onClosePersonModal: () => void;
  onPersonClick: (personId: PersonId | null) => void;
  onJumpToSessionFromPerson: (sessionId: SessionId) => void;
  onToggleBookmark: (presentationId: PresentationId) => void;
  installDialogRef: RefObject<HTMLDialogElement | null>;
  showInstallDialog: boolean;
  installContext: { isStandalone: boolean; isIos: boolean };
  hasInstallPrompt: boolean;
  isUpdatingApp: boolean;
  appUpdateStatus: "idle" | "updating" | "no_change" | "error";
  onCloseInstallDialog: () => void;
  onReloadData: () => void;
  onUpdateApp: () => void;
  onInstall: () => void;
  settingsDialogRef: RefObject<HTMLDialogElement | null>;
  showSettings: boolean;
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  useSlackAppLinks: boolean;
  zoomCustomUrls?: ZoomCustomUrls;
  includeSessionTitleForNoPresentationSessions: boolean;
  includeSessionTitleForPresentationSessions: boolean;
  showTimeAtPresentationLevel: boolean;
  onCloseSettings: () => void;
  onToggleShowAuthors: () => void;
  onToggleUseSlackAppLinks: () => void;
  onSetZoomCustomUrls: (value: ZoomCustomUrls | undefined) => void;
  onImportZoomFromCode: (value: string) => Promise<boolean>;
  onToggleIncludeSessionTitleForNoPresentationSessions: () => void;
  onToggleIncludeSessionTitleForPresentationSessions: () => void;
  onToggleShowTimeAtPresentationLevel: () => void;
  onExportSettings: () => void;
  showSettingsExport: boolean;
  exportUrl: string;
  onCloseSettingsExport: () => void;
  showSettingsImportConfirm: boolean;
  importInvalid: boolean;
  importTarget: "settings" | "zoom";
  onConfirmImport: () => void;
  onCancelImport: () => void;
  backupEntries: BackupEntry[];
  hasBackup: boolean;
  onRestoreBackup: () => void;
  onClearAllData: () => void;
  showRestoreConfirm: boolean;
  onConfirmRestore: (kind: BackupEntry["kind"]) => void;
  onCancelRestore: () => void;
  showClearAllDataConfirm: boolean;
  onConfirmClearAllData: () => void;
  onCancelClearAllData: () => void;
}) {
  return (
    <>
      {personModal && (
        <PersonModal
          personId={personModal}
          data={data}
          bookmarkedPresentationIds={bookmarkedPresentationIds}
          showAuthors={showAuthors}
          useSlackAppLinks={useSlackAppLinks}
          slackTeamId={slackTeamId}
          zoomCustomUrls={zoomCustomUrls}
          onClose={onClosePersonModal}
          onPersonClick={onPersonClick}
          onJumpToSession={onJumpToSessionFromPerson}
          onToggleBookmark={onToggleBookmark}
        />
      )}

      <InstallDialog
        dialogRef={installDialogRef}
        open={showInstallDialog}
        dataGeneratedAt={data.generated_at}
        lastUpdate={data.last_update}
        isReloadingData={isReloadingData}
        reloadDataStatus={reloadDataStatus}
        isUpdatingApp={isUpdatingApp}
        appUpdateStatus={appUpdateStatus}
        installContext={installContext}
        hasInstallPrompt={hasInstallPrompt}
        onClose={onCloseInstallDialog}
        onReloadData={onReloadData}
        onUpdateApp={onUpdateApp}
        onInstall={onInstall}
      />

      <SettingsDialog
        dialogRef={settingsDialogRef}
        open={showSettings}
        data={data}
        showAuthors={showAuthors}
        useSlackAppLinks={useSlackAppLinks}
        zoomCustomUrls={zoomCustomUrls}
        includeSessionTitleForNoPresentationSessions={includeSessionTitleForNoPresentationSessions}
        includeSessionTitleForPresentationSessions={includeSessionTitleForPresentationSessions}
        showTimeAtPresentationLevel={showTimeAtPresentationLevel}
        onClose={onCloseSettings}
        onToggleShowAuthors={onToggleShowAuthors}
        onToggleUseSlackAppLinks={onToggleUseSlackAppLinks}
        onSetZoomCustomUrls={onSetZoomCustomUrls}
        onImportZoomFromCode={onImportZoomFromCode}
        onToggleIncludeSessionTitleForNoPresentationSessions={onToggleIncludeSessionTitleForNoPresentationSessions}
        onToggleIncludeSessionTitleForPresentationSessions={onToggleIncludeSessionTitleForPresentationSessions}
        onToggleShowTimeAtPresentationLevel={onToggleShowTimeAtPresentationLevel}
        onExport={onExportSettings}
        hasBackup={hasBackup}
        onRestore={onRestoreBackup}
        onClearAllData={onClearAllData}
      />

      <SettingsExportDialog open={showSettingsExport} exportUrl={exportUrl} onClose={onCloseSettingsExport} />

      <SettingsImportConfirmDialog
        open={showSettingsImportConfirm}
        isInvalid={importInvalid}
        target={importTarget}
        onConfirm={onConfirmImport}
        onCancel={onCancelImport}
      />

      <RestoreBackupConfirmDialog
        open={showRestoreConfirm}
        entries={backupEntries}
        onConfirm={onConfirmRestore}
        onCancel={onCancelRestore}
      />

      <ClearAllDataConfirmDialog
        open={showClearAllDataConfirm}
        onConfirm={onConfirmClearAllData}
        onCancel={onCancelClearAllData}
      />
    </>
  );
}
