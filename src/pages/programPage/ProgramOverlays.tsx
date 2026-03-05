import type { RefObject } from "react";
import { PersonModal } from "../../components/PersonModal";
import type { DataReloadStatus } from "../../hooks/useConferenceData";
import type { ConferenceData, PersonId, PresentationId, SessionId } from "../../types";
import { InstallDialog, SettingsDialog } from "./ProgramDialogs";

export function ProgramOverlays({
  personModal,
  data,
  bookmarkedPresentationIds,
  showAuthors,
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
  onCloseSettings,
  onToggleShowAuthors,
  onToggleUseSlackAppLinks,
}: {
  personModal: PersonId | null;
  data: ConferenceData;
  bookmarkedPresentationIds: Set<PresentationId>;
  showAuthors: boolean;
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
  onCloseSettings: () => void;
  onToggleShowAuthors: () => void;
  onToggleUseSlackAppLinks: () => void;
}) {
  return (
    <>
      {personModal && (
        <PersonModal
          personId={personModal}
          data={data}
          bookmarkedPresentationIds={bookmarkedPresentationIds}
          showAuthors={showAuthors}
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
        onClose={onCloseSettings}
        onToggleShowAuthors={onToggleShowAuthors}
        onToggleUseSlackAppLinks={onToggleUseSlackAppLinks}
      />
    </>
  );
}
