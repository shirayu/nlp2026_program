import { ja } from "../locales/ja";
import { ProgramHeader } from "./programPage/ProgramHeader";
import { ProgramOverlays } from "./programPage/ProgramOverlays";
import { ProgramResults } from "./programPage/ProgramResults";
import { SearchField } from "./programPage/SearchField";
import { useProgramPageState } from "./programPage/useProgramPageState";
import { fullscreenDialogClassName, getNextScheduleTimePoint } from "./programPage/utils";

export { SearchField, fullscreenDialogClassName, getNextScheduleTimePoint };

export default function ProgramPage() {
  const { data, headerProps, resultsProps, overlayProps } = useProgramPageState();

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{ja.loading}</p>
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
