import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Bookmark,
  Collection,
  LinkRow,
  LinkTag,
  Note,
  Plan,
  Reminder,
  Tag,
} from "@/lib/types";

export type WorkspaceSnapshot = {
  collections: Collection[];
  tags: Tag[];
  bookmarks: Bookmark[];
  plan: Plan;
  reminders: Reminder[];
};

export function assembleBookmarks(
  links: LinkRow[],
  tags: Tag[],
  linkTags: LinkTag[],
  notes: Note[],
): Bookmark[] {
  const tagsById = new Map(tags.map((t) => [t.id, t]));
  const tagsByLink = new Map<string, Tag[]>();
  for (const row of linkTags) {
    const tag = tagsById.get(row.tag_id);
    if (!tag) continue;
    const list = tagsByLink.get(row.link_id) ?? [];
    list.push(tag);
    tagsByLink.set(row.link_id, list);
  }
  const noteByLink = new Map(notes.map((n) => [n.link_id, n.content ?? ""]));
  return links.map((link) => ({
    ...link,
    tags: tagsByLink.get(link.id) ?? [],
    note: noteByLink.get(link.id) ?? "",
  }));
}

export async function loadWorkspaceSnapshot(
  supabase: SupabaseClient,
): Promise<WorkspaceSnapshot> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      collections: [],
      tags: [],
      bookmarks: [],
      plan: "free",
      reminders: [],
    };
  }

  await supabase.rpc("ensure_inbox");

  const [cRes, tRes, lRes, ltRes, nRes, pRes, rRes] = await Promise.all([
    supabase.from("collections").select("*").order("sort_order").order("created_at"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("links").select("*").order("created_at", { ascending: false }),
    supabase.from("link_tags").select("*"),
    supabase.from("notes").select("*"),
    supabase.from("profiles").select("plan").eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("reminders").select("*").eq("status", "pending"),
  ]);

  const tags = (tRes.data ?? []) as Tag[];
  return {
    collections: (cRes.data ?? []) as Collection[],
    tags,
    bookmarks: assembleBookmarks(
      (lRes.data ?? []) as LinkRow[],
      tags,
      (ltRes.data ?? []) as LinkTag[],
      (nRes.data ?? []) as Note[],
    ),
    plan: pRes.data?.plan === "pro" ? "pro" : "free",
    reminders: (rRes.data ?? []) as Reminder[],
  };
}
