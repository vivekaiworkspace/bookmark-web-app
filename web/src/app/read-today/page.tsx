import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadReadTodaySnapshot } from "@/lib/read-today-data";
import { ReadTodayBoard } from "@/components/read-today-board";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

async function ReadTodayLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const snapshot = await loadReadTodaySnapshot(supabase, user.id);
  return (
    <ReadTodayBoard initialPlan={snapshot.plan} initialRows={snapshot.rows} />
  );
}

export default function ReadTodayPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4 p-6" aria-busy="true">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-20 w-full" />
        </div>
      }
    >
      <ReadTodayLoader />
    </Suspense>
  );
}
