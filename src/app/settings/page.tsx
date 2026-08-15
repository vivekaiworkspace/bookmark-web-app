"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserAiSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function SettingsPage() {
  const supabase = createClient();
  const [prompt, setPrompt] = useState("");
  const [frequency, setFrequency] = useState<UserAiSettings["digest_frequency"]>(
    "weekly",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setPrompt(data.prompt_override ?? "");
      setFrequency(data.digest_frequency);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_ai_settings").upsert({
      user_id: userData.user!.id,
      prompt_override: prompt.trim() || null,
      digest_frequency: frequency,
      digest_timezone: "UTC",
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI settings</h1>
        <Button variant="ghost" asChild>
          <Link href="/">Workspace</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="frequency">Digest frequency (UTC)</Label>
            <Select
              value={frequency}
              onValueChange={(value) =>
                setFrequency(value as UserAiSettings["digest_frequency"])
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Custom digest instructions</Label>
            <Textarea
              id="prompt"
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Focus on Postgres and security. Keep bullets short."
            />
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      )}
    </div>
  );
}
