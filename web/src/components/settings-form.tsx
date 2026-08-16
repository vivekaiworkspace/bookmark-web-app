"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan, UserAiSettings } from "@/lib/types";
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
import { useSearchParams } from "next/navigation";

export type SettingsFormProps = {
  initialPlan: Plan;
  initialPrompt: string;
  initialFrequency: UserAiSettings["digest_frequency"];
};

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/").concat(padding));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function BillingToast() {
  const search = useSearchParams();
  useEffect(() => {
    if (search.get("billing") === "success") {
      toast.success("Billing updated. Pro features unlock after Stripe confirms.");
    }
  }, [search]);
  return null;
}

export function SettingsForm({
  initialPlan,
  initialPrompt,
  initialFrequency,
}: SettingsFormProps) {
  const supabase = createClient();
  const [plan] = useState<Plan>(initialPlan);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [frequency, setFrequency] =
    useState<UserAiSettings["digest_frequency"]>(initialFrequency);
  const [saving, setSaving] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const digestFrequency =
      plan === "free" && frequency === "daily" ? "weekly" : frequency;
    const { error } = await supabase.from("user_ai_settings").upsert({
      user_id: userData.user!.id,
      prompt_override: plan === "pro" ? prompt.trim() || null : null,
      digest_frequency: digestFrequency,
      digest_timezone: "UTC",
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  async function billing(kind: "checkout" | "portal") {
    setBillingBusy(true);
    try {
      const res = await fetch(`/api/stripe/${kind}`, { method: "POST" });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        toast.error(body.error ?? "Billing is not available");
        return;
      }
      window.location.href = body.url;
    } finally {
      setBillingBusy(false);
    }
  }

  async function enablePush() {
    if (!vapid) {
      toast.error("Web Push is not configured (VAPID keys).");
      return;
    }
    if (plan !== "pro") {
      toast.error("Push reminders are a Pro feature.");
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were blocked");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) toast.error(body.error ?? "Could not save subscription");
      else toast.success("Browser notifications enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Push failed");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 p-6">
      <Suspense fallback={null}>
        <BillingToast />
      </Suspense>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Button variant="ghost" asChild>
          <Link href="/">Workspace</Link>
        </Button>
      </div>
      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-medium">Plan</h2>
        <p className="text-sm text-muted-foreground">
          You are on <span className="font-medium text-foreground">{plan}</span>.
          Pro lifts collection/tag caps and unlocks reminders, push, daily
          digests, custom prompts, and semantic search.
        </p>
        <div className="flex gap-2">
          {plan === "free" ? (
            <Button
              onClick={() => void billing("checkout")}
              disabled={billingBusy}
            >
              {billingBusy ? "Opening…" : "Upgrade to Pro"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void billing("portal")}
              disabled={billingBusy}
            >
              {billingBusy ? "Opening…" : "Manage billing"}
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-medium">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Email uses Resend when configured. Browser push is Pro-only.
        </p>
        <Button
          variant="outline"
          onClick={() => void enablePush()}
          disabled={pushBusy || plan !== "pro"}
        >
          {pushBusy ? "Enabling…" : "Enable browser push"}
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">AI digest</h2>
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
              <SelectItem value="daily" disabled={plan !== "pro"}>
                Daily {plan !== "pro" ? "(Pro)" : ""}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prompt">Custom digest instructions</Label>
          <Textarea
            id="prompt"
            rows={8}
            value={prompt}
            disabled={plan !== "pro"}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              plan === "pro"
                ? "e.g. Focus on Postgres and security. Keep bullets short."
                : "Custom prompts are a Pro feature."
            }
          />
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </section>
    </div>
  );
}
