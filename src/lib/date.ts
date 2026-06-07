const sqliteTimestampPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function parseAppDate(value: string) {
  const normalized = sqliteTimestampPattern.test(value) ? `${value.replace(" ", "T")}Z` : value;
  return new Date(normalized);
}

export function parseAppTimestampMs(value: string | null | undefined) {
  if (!value) return Number.NaN;
  return parseAppDate(value).getTime();
}

export function formatAppDate(value: string, timeZone?: string | null) {
  const date = parseAppDate(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return date.toLocaleString("zh-CN", { hour12: false, timeZone: timeZone || undefined });
  } catch {
    return date.toLocaleString("zh-CN", { hour12: false });
  }
}
