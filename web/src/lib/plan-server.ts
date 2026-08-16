import { createClient } from "@/lib/supabase/server";
import { normalizePlan, type Plan } from "@/lib/plan";

export async function getUserPlan(): Promise<{ userId: string; plan: Plan } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  return { userId: user.id, plan: normalizePlan(data?.plan) };
}

export async function requirePro() {
  const session = await getUserPlan();
  if (!session) return { error: "Unauthorized", status: 401 as const };
  if (session.plan !== "pro") {
    return { error: "This feature requires Pro", status: 403 as const };
  }
  return { session };
}
