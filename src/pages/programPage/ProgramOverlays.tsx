import type { RefObject } from "react";
import { PersonModal } from "../../components/PersonModal";
import type { DataReloadStatus } from "../../hooks/useConferenceData";
import type { BackupEntry } from "../../lib/appDataBackup";
import type { ConferenceData, PersonId, PresentationId, SessionId, VenueZoomUrls } from "../../types";
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
  venueZoomUrls,
  includeSessionTitleForNoPresentationSessions,
  includeSessionTitleForPresentationSessions,
  onCloseSettings,
  onToggleShowAuthors,
  onToggleUseSlackAppLinks,
  onSetVenueZoomUrls,
  onToggleIncludeSessionTitleForNoPresentationSessions,
  onToggleIncludeSessionTitleForPresentationSessions,
  onExportSettings,
  showSettingsExport,
  exportUrl,
  onCloseSettingsExport,
  showSettingsImportConfirm,
  importInvalid,
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
  venueZoomUrls?: VenueZoomUrls;
  includeSessionTitleForNoPresentationSessions: boolean;
  includeSessionTitleForPresentationSessions: boolean;
  onCloseSettings: () => void;
  onToggleShowAuthors: () => void;
  onToggleUseSlackAppLinks: () => void;
  onSetVenueZoomUrls: (value: VenueZoomUrls | undefined) => void;
  onToggleIncludeSessionTitleForNoPresentationSessions: () => void;
  onToggleIncludeSessionTitleForPresentationSessions: () => void;
  onExportSettings: () => void;
  showSettingsExport: boolean;
  exportUrl: string;
  onCloseSettingsExport: () => void;
  showSettingsImportConfirm: boolean;
  importInvalid: boolean;
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
          venueZoomUrls={venueZoomUrls}
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
        showAuthors={showAuthors}
        useSlackAppLinks={useSlackAppLinks}
        venueZoomUrls={venueZoomUrls}
        includeSessionTitleForNoPresentationSessions={includeSessionTitleForNoPresentationSessions}
        includeSessionTitleForPresentationSessions={includeSessionTitleForPresentationSessions}
        onClose={onCloseSettings}
        onToggleShowAuthors={onToggleShowAuthors}
        onToggleUseSlackAppLinks={onToggleUseSlackAppLinks}
        onSetVenueZoomUrls={onSetVenueZoomUrls}
        onToggleIncludeSessionTitleForNoPresentationSessions={onToggleIncludeSessionTitleForNoPresentationSessions}
        onToggleIncludeSessionTitleForPresentationSessions={onToggleIncludeSessionTitleForPresentationSessions}
        onExport={onExportSettings}
        hasBackup={hasBackup}
        onRestore={onRestoreBackup}
        onClearAllData={onClearAllData}
      />

      <SettingsExportDialog open={showSettingsExport} exportUrl={exportUrl} onClose={onCloseSettingsExport} />

      <SettingsImportConfirmDialog
        open={showSettingsImportConfirm}
        isInvalid={importInvalid}
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
