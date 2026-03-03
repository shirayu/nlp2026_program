type FormatJapaneseDateOptions = {
  includeYear?: boolean;
  includeWeekday?: boolean;
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatJapaneseDate(
  date: string,
  { includeYear = false, includeWeekday = true }: FormatJapaneseDateOptions = {},
): string {
  const match = ISO_DATE_RE.exec(date);
  if (!match) return date;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) return date;

  const base = includeYear ? `${year}/${month}/${day}` : `${month}/${day}`;
  if (!includeWeekday) return base;

  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: "UTC",
  }).format(parsed);

  return `${base}(${weekday})`;
}

export function formatSessionDateTime(date: string, startTime: string, endTime: string): string {
  return `${formatJapaneseDate(date)} ${startTime}–${endTime}`;
}
