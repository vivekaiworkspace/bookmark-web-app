import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { BookmarkWorkspace } from "@/components/bookmark-workspace";
import { WorkspaceSkeleton } from "@/components/workspace-skeleton";
import { loadWorkspaceSnapshot } from "@/lib/workspace-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function WorkspaceLoader({ email }: { email: string }) {
  const supabase = await createClient();
  const snapshot = await loadWorkspaceSnapshot(supabase);
  return <BookmarkWorkspace email={email} initial={snapshot} />;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <WorkspaceLoader email={user.email ?? user.id} />
    </Suspense>
  );
}
