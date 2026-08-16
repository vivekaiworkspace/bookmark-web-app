import type { LinkRow, Reminder } from "@/lib/types";

export type ReadTodayRow = Reminder & { link: LinkRow | null };

export function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function partitionReminders(rows: ReadTodayRow[], now = new Date()) {
  const end = endOfToday(now).getTime();
  const today = rows
    .filter((row) => new Date(row.remind_at).getTime() <= end)
    .sort(
      (a, b) =>
        new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
    );
  const upcoming = rows.filter((row) => new Date(row.remind_at).getTime() > end);
  return { today, upcoming };
}
