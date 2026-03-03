import { X } from "lucide-react";
import { sessionRoomsLabel } from "../constants";
import { formatSessionDateTime } from "../lib/date";
import { ja } from "../locales/ja";
import type { ConferenceData, PersonId, SessionId } from "../types";

export function PersonModal({
  personId,
  data,
  onClose,
  onJumpToSession,
}: {
  personId: PersonId;
  data: ConferenceData;
  onClose: () => void;
  onJumpToSession: (sid: SessionId) => void;
}) {
  const person = data.persons[personId];
  const presentations = Object.entries(data.presentations).filter(([, p]) =>
    p.authors.some((a) => a.person_id === personId),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <button type="button" aria-label={ja.closeDisplaySettings} className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white pb-8">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-800">{ja.personPresentations(person?.name ?? personId)}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {presentations.length === 0 && <li className="px-4 py-4 text-sm text-gray-400">{ja.noPresentation}</li>}
          {presentations.map(([pid, p]) => {
            const session = data.sessions[p.session_id];
            return (
              <li key={pid} className="px-4 py-3">
                <p className="text-xs text-gray-400 font-mono">{pid}</p>
                <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                {session && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-indigo-600 hover:underline"
                    onClick={() => onJumpToSession(p.session_id as SessionId)}
                  >
                    {formatSessionDateTime(session.date, session.start_time, session.end_time)}{" "}
                    {sessionRoomsLabel(session, data.rooms)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
