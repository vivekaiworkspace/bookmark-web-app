"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  partitionReminders,
  startOfToday,
  type ReadTodayRow,
} from "@/lib/read-today";

export type ReadTodayBoardProps = {
  initialPlan: Plan;
  initialRows: ReadTodayRow[];
};

export type ReminderRowProps = {
  row: ReadTodayRow;
  onComplete: () => void;
  onDismiss: () => void;
};

function ReminderRow({ row, onComplete, onDismiss }: ReminderRowProps) {
  const overdue = new Date(row.remind_at).getTime() < startOfToday().getTime();
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {row.link?.title ?? "Deleted link"}
        </p>
        <p className="text-xs text-muted-foreground">
          {overdue ? "Overdue · " : ""}
          {new Date(row.remind_at).toLocaleString()}
        </p>
        {row.link?.url ? (
          <a
            className="text-xs text-primary hover:underline"
            href={row.link.url}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={onComplete}>
          Done
        </Button>
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function ReadTodayBoard({
  initialPlan,
  initialRows,
}: ReadTodayBoardProps) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const plan = initialPlan;
  const { today, upcoming } = partitionReminders(rows);

  async function setStatus(id: string, status: "completed" | "dismissed") {
    const { error } = await supabase.from("reminders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((curr) => curr.filter((row) => row.id !== id));
  }

  if (plan !== "pro") {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">Read Today</h1>
        <p className="text-sm text-muted-foreground">
          Scheduled reminders are a Pro feature.
        </p>
        <Button asChild>
          <Link href="/settings">Upgrade in Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Read Today</h1>
        <Button variant="ghost" asChild>
          <Link href="/">Workspace</Link>
        </Button>
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Due today and overdue</h2>
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing queued for today.</p>
        ) : (
          today.map((row) => (
            <ReminderRow
              key={row.id}
              row={row}
              onComplete={() => void setStatus(row.id, "completed")}
              onDismiss={() => void setStatus(row.id, "dismissed")}
            />
          ))
        )}
      </section>
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Later</h2>
          {upcoming.map((row) => (
            <ReminderRow
              key={row.id}
              row={row}
              onComplete={() => void setStatus(row.id, "completed")}
              onDismiss={() => void setStatus(row.id, "dismissed")}
            />
          ))}
        </section>
      )}
    </div>
  );
}
