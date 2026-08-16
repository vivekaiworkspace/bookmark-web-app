"use client";

import Link from "next/link";
import { useState } from "react";
import type { AiSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type DigestsBoardProps = {
  initialSummaries: AiSummary[];
};

export function DigestsBoard({ initialSummaries }: DigestsBoardProps) {
  const [rows, setRows] = useState(initialSummaries);
  const [active, setActive] = useState<AiSummary | null>(
    initialSummaries[0] ?? null,
  );
  const [running, setRunning] = useState(false);

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/ai/digest", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? "Could not run digest");
        return;
      }
      toast.success("Digest created");
      window.location.reload();
    } catch {
      toast.error("Could not run digest");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 lg:flex-row">
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Digests</h1>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => void runNow()} disabled={running}>
              {running ? "Running…" : "Run now"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">Workspace</Link>
            </Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No digests yet. Set a frequency in Settings, or click Run now.
            Scheduled runs use links saved in that window.
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setActive(row)}
                >
                  {new Date(row.generated_at).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {active ? (
          <article className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {new Date(active.generated_at).toLocaleString()}
              {active.prompt_used ? " · custom prompt" : ""}
            </p>
            <pre className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 text-sm">
              {active.content}
            </pre>
          </article>
        ) : null}
      </div>
    </div>
  );
}
