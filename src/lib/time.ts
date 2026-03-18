const TOKYO_TIME_ZONE = "Asia/Tokyo";

const tokyoDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TOKYO_TIME_ZONE,
});

const tokyoTimePartsFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: TOKYO_TIME_ZONE,
});

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function toTokyoIsoDate(date: Date): string {
  const parts = tokyoDatePartsFormatter.formatToParts(date);
  const year = getPartValue(parts, "year");
  const month = getPartValue(parts, "month");
  const day = getPartValue(parts, "day");
  return `${year}-${month}-${day}`;
}

export function getTokyoSecondsSinceMidnight(date: Date): number {
  const parts = tokyoTimePartsFormatter.formatToParts(date);
  const hour = Number(getPartValue(parts, "hour"));
  const minute = Number(getPartValue(parts, "minute"));
  const second = Number(getPartValue(parts, "second"));
  return hour * 3600 + minute * 60 + second;
}
