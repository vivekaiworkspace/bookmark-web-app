import { createClient } from "@/lib/supabase/server";
import { BookmarkWorkspace } from "@/components/bookmark-workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <BookmarkWorkspace email={user.email ?? user.id} />;
}
