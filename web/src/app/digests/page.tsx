import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadDigestSummaries } from "@/lib/digests-data";
import { DigestsBoard } from "@/components/digests-board";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

async function DigestsLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { summaries } = await loadDigestSummaries(supabase);
  return <DigestsBoard initialSummaries={summaries} />;
}

export default function DigestsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-4 p-6" aria-busy="true">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <DigestsLoader />
    </Suspense>
  );
}
