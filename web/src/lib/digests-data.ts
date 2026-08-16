import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiSummary } from "@/lib/types";

export async function loadDigestSummaries(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("ai_summaries")
    .select("*")
    .order("generated_at", { ascending: false });
  return {
    summaries: (data ?? []) as AiSummary[],
    error: error?.message ?? null,
  };
}
