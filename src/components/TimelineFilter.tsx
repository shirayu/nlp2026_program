import { RotateCcw } from "lucide-react";
import { ja } from "../locales/ja";

type TimelineFilterProps = {
  points: string[];
  activeSegments: boolean[];
  selectedDate: string | null;
  selectedTime: string | null;
  onChange: (time: string | null) => void;
  onSelectNow: () => void;
  nowEnabled: boolean;
  dataGeneratedAt?: string;
  disabled?: boolean;
};

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPastTimeSet(points: string[], selectedDate: string | null, now: Date) {
  if (!selectedDate) return new Set<string>();

  const today = toLocalIsoDate(now);
  if (selectedDate < today) {
    return new Set(points);
  }

  if (selectedDate > today) {
    return new Set<string>();
  }

  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return new Set(points.filter((time) => toMinutes(time) * 60 < currentSeconds));
}

function buildTimelineMarks(points: string[], selectedTime: string | null) {
  const maxIndex = Math.max(points.length - 1, 1);
  const seen = new Set<string>();

  return points.flatMap((time, index) => {
    const minutes = toMinutes(time);
    const isEndpoint = index === 0 || index === points.length - 1;
    const isHour = minutes % 60 === 0;
    const isHalfHour = minutes % 30 === 0;
    const isSelected = selectedTime === time;

    if (!isEndpoint && !isHour && !isHalfHour && !isSelected) {
      return [];
    }

    if (seen.has(time)) return [];
    seen.add(time);

    return [
      {
        time,
        left: (index / maxIndex) * 100,
        label: isHour || isEndpoint ? time : null,
        emphasized: isHour || isEndpoint || isSelected,
      },
    ];
  });
}

function buildTimelineSegments(points: string[], activeSegments: boolean[], pastTimes: Set<string>) {
  return activeSegments.map((isActive, index) => ({
    key: `${points[index] ?? "start"}-${points[index + 1] ?? "end"}`,
    isActive,
    past: pastTimes.has(points[index] ?? ""),
  }));
}

function formatDataGeneratedAt(value?: string): { dateLabel: string; timeLabel: string } | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const monthDayParts = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).formatToParts(date);
  const month = monthDayParts.find((part) => part.type === "month")?.value;
  const day = monthDayParts.find((part) => part.type === "day")?.value;
  if (!month || !day) return null;

  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);

  const time = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);

  return {
    dateLabel: `${month}/${day}(${weekday})`,
    timeLabel: time,
  };
}

function TimelineActions({
  disabled,
  selectedTime,
  onChange,
  onSelectNow,
  nowEnabled,
  dataGeneratedAt,
}: Pick<
  TimelineFilterProps,
  "disabled" | "selectedTime" | "onChange" | "onSelectNow" | "nowEnabled" | "dataGeneratedAt"
>) {
  const formattedDataGeneratedAt = formatDataGeneratedAt(dataGeneratedAt);

  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {selectedTime ? `${ja.timepoint} ${selectedTime}` : ja.allTimes}
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={ja.resetTimepoint}
          title={ja.resetTimepoint}
          disabled={disabled}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
            disabled || selectedTime === null
              ? "border-gray-200 bg-gray-100 text-gray-400"
              : "border-gray-300 bg-white text-gray-600"
          }`}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSelectNow}
          disabled={disabled || !nowEnabled}
          title={disabled ? undefined : nowEnabled ? ja.now : ja.nowUnavailable}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            !disabled && nowEnabled
              ? "border-gray-300 bg-white text-gray-600"
              : "border-gray-200 bg-gray-100 text-gray-400"
          }`}
        >
          {ja.now}
        </button>
      </div>
      {formattedDataGeneratedAt && (
        <p className="ml-auto text-left text-[11px] leading-tight text-gray-500">
          <span className="block">データ最終更新</span>
          <span className="block">{`${formattedDataGeneratedAt.dateLabel} ${formattedDataGeneratedAt.timeLabel}`}</span>
        </p>
      )}
    </div>
  );
}

export function TimelineFilter({
  points,
  activeSegments,
  selectedDate,
  selectedTime,
  onChange,
  onSelectNow,
  nowEnabled,
  dataGeneratedAt,
  disabled = false,
}: TimelineFilterProps) {
  const selectedIndex = selectedTime ? points.indexOf(selectedTime) : -1;
  const sliderValue = selectedIndex >= 0 ? selectedIndex : 0;
  const maxIndex = Math.max(points.length - 1, 0);
  const thumbLeft = maxIndex === 0 ? 0 : (sliderValue / maxIndex) * 100;
  const isUnspecified = selectedTime === null;
  const pastTimes = getPastTimeSet(points, selectedDate, new Date());
  const marks = buildTimelineMarks(points, selectedTime);
  const segments = buildTimelineSegments(points, activeSegments, pastTimes);

  return (
    <div className={`border-t border-gray-100 px-3 py-3 ${disabled ? "opacity-50" : ""}`}>
      <TimelineActions
        disabled={disabled}
        selectedTime={selectedTime}
        onChange={onChange}
        onSelectNow={onSelectNow}
        nowEnabled={nowEnabled}
        dataGeneratedAt={dataGeneratedAt}
      />

      {points.length > 0 ? (
        <>
          <div className="relative mt-3 px-1">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  className={`h-full flex-1 ${
                    !isUnspecified && segment.isActive ? (segment.past ? "bg-gray-600" : "bg-teal-200") : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
            {marks.map((mark) => (
              <div
                key={mark.time}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                style={{ left: `calc(${mark.left}% - 0.5px)` }}
              >
                <div className={`w-px ${mark.emphasized ? "h-6 bg-slate-400" : "h-4 bg-slate-300"}`} />
              </div>
            ))}
            <input
              type="range"
              min={0}
              max={maxIndex}
              step={1}
              value={sliderValue}
              onChange={(event) => onChange(points[Number(event.target.value)] ?? null)}
              disabled={disabled}
              className={`absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 opacity-0 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              aria-label={ja.timepoint}
            />
            <div
              className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                selectedTime ? "bg-teal-600" : "bg-slate-400"
              }`}
              style={{ left: `calc(${thumbLeft}% - 10px)` }}
            />
          </div>

          <div className="relative mt-3 h-5">
            {marks.map((mark) =>
              mark.label ? (
                <span
                  key={`${mark.time}-label`}
                  className={`absolute top-0 -translate-x-1/2 text-[11px] ${
                    mark.left === 0 || mark.left === 100 ? "z-10 rounded bg-gray-50 px-1" : ""
                  } ${mark.time === selectedTime ? "font-semibold text-slate-700" : "text-gray-500"}`}
                  style={{ left: `${mark.left}%` }}
                >
                  {mark.label}
                </span>
              ) : null,
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs text-gray-400">利用できる時点がありません</p>
      )}
    </div>
  );
}
