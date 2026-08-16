import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, UserAiSettings } from "@/lib/types";
import { normalizePlan } from "@/lib/plan";

export type SettingsSnapshot = {
  plan: Plan;
  prompt: string;
  frequency: UserAiSettings["digest_frequency"];
};

export async function loadSettingsSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<SettingsSnapshot> {
  const [{ data: settings }, profile] = await Promise.all([
    supabase
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("plan").eq("user_id", userId).maybeSingle(),
  ]);
  const row = settings as UserAiSettings | null;
  return {
    plan: normalizePlan(profile.data?.plan),
    prompt: row?.prompt_override ?? "",
    frequency: row?.digest_frequency ?? "weekly",
  };
}
