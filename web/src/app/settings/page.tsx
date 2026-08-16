import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSettingsSnapshot } from "@/lib/settings-data";
import { SettingsForm } from "@/components/settings-form";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

async function SettingsLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const snapshot = await loadSettingsSnapshot(supabase, user.id);
  return (
    <SettingsForm
      initialPlan={snapshot.plan}
      initialPrompt={snapshot.prompt}
      initialFrequency={snapshot.frequency}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl space-y-4 p-6" aria-busy="true">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <SettingsLoader />
    </Suspense>
  );
}
