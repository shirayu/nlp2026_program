import { ja } from "../locales/ja";
import { ProgramHeader } from "./programPage/ProgramHeader";
import { ProgramOverlays } from "./programPage/ProgramOverlays";
import { ProgramResults } from "./programPage/ProgramResults";
import { SearchField } from "./programPage/SearchField";
import { useProgramPageState } from "./programPage/useProgramPageState";
import { fullscreenDialogClassName, getNextScheduleTimePoint } from "./programPage/utils";

export { SearchField, fullscreenDialogClassName, getNextScheduleTimePoint };

export default function ProgramPage() {
  const { data, initialLoadStatus, onRetryInitialLoad, headerProps, resultsProps, overlayProps } =
    useProgramPageState();

  if (initialLoadStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{ja.loading}</p>
      </div>
    );
  }

  if (initialLoadStatus === "error" || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-600">{ja.loadingFailed}</p>
        <button
          type="button"
          onClick={onRetryInitialLoad}
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {ja.retryLoading}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <ProgramHeader {...headerProps} />
      <ProgramResults data={data} {...resultsProps} />
      <ProgramOverlays data={data} {...overlayProps} />
    </div>
  );
}
