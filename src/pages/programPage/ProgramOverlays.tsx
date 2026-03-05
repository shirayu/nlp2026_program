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
  onCloseInstallDialog,
  onInstall,
  settingsDialogRef,
  showSettings,
  isReloadingData,
  reloadDataStatus,
  useSlackAppLinks,
  onCloseSettings,
  onReloadData,
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
  onCloseInstallDialog: () => void;
  onInstall: () => void;
  settingsDialogRef: RefObject<HTMLDialogElement | null>;
  showSettings: boolean;
  isReloadingData: boolean;
  reloadDataStatus: DataReloadStatus;
  useSlackAppLinks: boolean;
  onCloseSettings: () => void;
  onReloadData: () => void;
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
        installContext={installContext}
        hasInstallPrompt={hasInstallPrompt}
        onClose={onCloseInstallDialog}
        onInstall={onInstall}
      />

      <SettingsDialog
        dialogRef={settingsDialogRef}
        open={showSettings}
        dataGeneratedAt={data.generated_at}
        lastUpdate={data.last_update}
        isReloadingData={isReloadingData}
        reloadDataStatus={reloadDataStatus}
        showAuthors={showAuthors}
        useSlackAppLinks={useSlackAppLinks}
        onClose={onCloseSettings}
        onReloadData={onReloadData}
        onToggleShowAuthors={onToggleShowAuthors}
        onToggleUseSlackAppLinks={onToggleUseSlackAppLinks}
      />
    </>
  );
}
