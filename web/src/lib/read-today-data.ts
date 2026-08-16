import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinkRow, Plan, Reminder } from "@/lib/types";
import { normalizePlan } from "@/lib/plan";
import type { ReadTodayRow } from "@/lib/read-today";

export async function loadReadTodaySnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ plan: Plan; rows: ReadTodayRow[] }> {
  const [{ data: profile }, rem] = await Promise.all([
    supabase.from("profiles").select("plan").eq("user_id", userId).maybeSingle(),
    supabase.from("reminders").select("*").eq("status", "pending").order("remind_at"),
  ]);
  const reminders = (rem.data ?? []) as Reminder[];
  const ids = reminders.map((r) => r.link_id);
  const { data: links } = ids.length
    ? await supabase.from("links").select("*").in("id", ids)
    : { data: [] as LinkRow[] };
  const byId = new Map((links ?? []).map((l) => [l.id, l as LinkRow]));
  return {
    plan: normalizePlan(profile?.plan),
    rows: reminders.map((r) => ({ ...r, link: byId.get(r.link_id) ?? null })),
  };
}
