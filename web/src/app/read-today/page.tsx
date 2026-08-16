"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LinkRow, Reminder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = Reminder & { link: LinkRow | null };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function ReadTodayPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const [{ data: profile }, rem] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", userData.user.id)
        .maybeSingle(),
      supabase
        .from("reminders")
        .select("*")
        .eq("status", "pending")
        .order("remind_at"),
    ]);
    setPlan(profile?.plan === "pro" ? "pro" : "free");
    const reminders = (rem.data ?? []) as Reminder[];
    const ids = reminders.map((r) => r.link_id);
    const { data: links } = ids.length
      ? await supabase.from("links").select("*").in("id", ids)
      : { data: [] as LinkRow[] };
    const byId = new Map((links ?? []).map((l) => [l.id, l as LinkRow]));
    setRows(reminders.map((r) => ({ ...r, link: byId.get(r.link_id) ?? null })));
    if (rem.error) toast.error(rem.error.message);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = useMemo(() => {
    const end = endOfToday().getTime();
    return rows
      .filter((row) => new Date(row.remind_at).getTime() <= end)
      .sort(
        (a, b) =>
          new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
      );
  }, [rows]);

  const upcoming = useMemo(() => {
    const end = endOfToday().getTime();
    return rows.filter((row) => new Date(row.remind_at).getTime() > end);
  }, [rows]);

  async function setStatus(id: string, status: "completed" | "dismissed") {
    const { error } = await supabase.from("reminders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else await load();
  }

  if (plan !== "pro" && !loading) {
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
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function ReminderRow({
  row,
  onComplete,
  onDismiss,
}: {
  row: Row;
  onComplete: () => void;
  onDismiss: () => void;
}) {
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
