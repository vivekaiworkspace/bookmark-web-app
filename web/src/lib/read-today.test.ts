import { describe, expect, it } from "vitest";
import { partitionReminders, type ReadTodayRow } from "@/lib/read-today";

function row(id: string, remindAt: string): ReadTodayRow {
  return {
    id,
    link_id: "l1",
    user_id: "u1",
    remind_at: remindAt,
    is_triggered: false,
    status: "pending",
    created_at: remindAt,
    link: {
      id: "l1",
      user_id: "u1",
      collection_id: null,
      url: "https://example.com",
      title: "Example",
      domain: "example.com",
      favicon_url: null,
      og_image_url: null,
      is_favorite: false,
      content_raw: null,
      created_at: remindAt,
      last_accessed_at: null,
      updated_at: null,
    },
  };
}

describe("partitionReminders", () => {
  it("splits due and upcoming around end of today", () => {
    const now = new Date("2026-08-16T12:00:00");
    const due = row("a", "2026-08-16T08:00:00.000Z");
    const later = row("b", "2026-08-18T08:00:00.000Z");
    const { today, upcoming } = partitionReminders([later, due], now);
    expect(today.map((r) => r.id)).toEqual(["a"]);
    expect(upcoming.map((r) => r.id)).toEqual(["b"]);
  });
});
