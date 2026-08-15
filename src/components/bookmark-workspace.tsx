"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FREE_COLLECTION_LIMIT, FREE_TAG_LIMIT } from "@/lib/limits";
import { COLLECTION_COLORS, TAG_COLORS } from "@/lib/colors";
import type {
  Bookmark,
  Collection,
  LinkRow,
  LinkTag,
  Note,
  SortMode,
  Tag,
  TagLogic,
} from "@/lib/types";
import { CollectionSidebar } from "@/components/collection-sidebar";
import { FilterBar } from "@/components/filter-bar";
import { LinkCard } from "@/components/link-card";
import { SaveLinkDialog } from "@/components/save-link-dialog";
import { LinkDetailDialog } from "@/components/link-detail-dialog";
import { Button } from "@/components/ui/button";
import { Bookmark as BookmarkIcon, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function assemble(
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

export function BookmarkWorkspace({ email }: { email: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | "all">(
    "all",
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagLogic, setTagLogic] = useState<TagLogic>("and");
  const [sort, setSort] = useState<SortMode>("created");
  const [query, setQuery] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [activeLink, setActiveLink] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.rpc("ensure_inbox");

    const [cRes, tRes, lRes, ltRes, nRes] = await Promise.all([
      supabase.from("collections").select("*").order("sort_order").order("created_at"),
      supabase.from("tags").select("*").order("name"),
      supabase.from("links").select("*").order("created_at", { ascending: false }),
      supabase.from("link_tags").select("*"),
      supabase.from("notes").select("*"),
    ]);

    if (cRes.error) toast.error(cRes.error.message);
    if (tRes.error) toast.error(tRes.error.message);
    if (lRes.error) toast.error(lRes.error.message);

    const cols = (cRes.data ?? []) as Collection[];
    setCollections(cols);
    setTags((tRes.data ?? []) as Tag[]);
    setBookmarks(
      assemble(
        (lRes.data ?? []) as LinkRow[],
        (tRes.data ?? []) as Tag[],
        (ltRes.data ?? []) as LinkTag[],
        (nRes.data ?? []) as Note[],
      ),
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    let list = bookmarks;
    if (activeCollectionId !== "all") {
      list = list.filter((b) => b.collection_id === activeCollectionId);
    }
    if (selectedTagIds.length) {
      list = list.filter((b) => {
        const ids = new Set(b.tags.map((t) => t.id));
        if (tagLogic === "and") {
          return selectedTagIds.every((id) => ids.has(id));
        }
        return selectedTagIds.some((id) => ids.has(id));
      });
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        [b.title, b.url, b.domain ?? "", b.note]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    const copy = [...list];
    copy.sort((a, b) => {
      if (sort === "favorites") {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === "accessed") {
        const av = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
        const bv = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
        return bv - av;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return copy;
  }, [bookmarks, activeCollectionId, selectedTagIds, tagLogic, query, sort]);

  async function addCollection(name: string, color: string) {
    if (collections.length >= FREE_COLLECTION_LIMIT) {
      toast.error(`Free tier allows ${FREE_COLLECTION_LIMIT} collections.`);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("collections").insert({
      user_id: userData.user!.id,
      name,
      color,
      sort_order: collections.length,
    });
    if (error) toast.error(error.message);
    else await load();
  }

  async function renameCollection(id: string, name: string, color: string) {
    const { error } = await supabase
      .from("collections")
      .update({ name, color })
      .eq("id", id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function deleteCollection(id: string) {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      if (activeCollectionId === id) setActiveCollectionId("all");
      await load();
    }
  }

  async function moveCollection(id: string, direction: -1 | 1) {
    const index = collections.findIndex((c) => c.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= collections.length) return;
    const a = collections[index];
    const b = collections[next];
    await Promise.all([
      supabase.from("collections").update({ sort_order: next }).eq("id", a.id),
      supabase.from("collections").update({ sort_order: index }).eq("id", b.id),
    ]);
    await load();
  }

  async function saveLink(input: {
    url: string;
    title: string;
    domain: string;
    favicon_url: string;
    og_image_url: string | null;
    collection_id: string | null;
    tagIds: string[];
  }) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user!.id;
    const { data, error } = await supabase
      .from("links")
      .upsert(
        {
          user_id: userId,
          url: input.url,
          title: input.title,
          domain: input.domain,
          favicon_url: input.favicon_url,
          og_image_url: input.og_image_url,
          collection_id: input.collection_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,url" },
      )
      .select()
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not save link");
      return;
    }
    await supabase.from("link_tags").delete().eq("link_id", data.id);
    if (input.tagIds.length) {
      const { error: tagError } = await supabase.from("link_tags").insert(
        input.tagIds.map((tag_id) => ({ link_id: data.id, tag_id })),
      );
      if (tagError) toast.error(tagError.message);
    }
    toast.success("Link saved");
    await load();
  }

  async function toggleFavorite(link: Bookmark) {
    const { error } = await supabase
      .from("links")
      .update({ is_favorite: !link.is_favorite })
      .eq("id", link.id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function openLink(link: Bookmark) {
    await supabase
      .from("links")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", link.id);
    window.open(link.url, "_blank", "noopener,noreferrer");
    await load();
  }

  async function deleteLink(id: string) {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setActiveLink(null);
      await load();
    }
  }

  async function saveNote(linkId: string, content: string) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("notes").upsert(
      {
        link_id: linkId,
        user_id: userData.user!.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "link_id" },
    );
    if (error) toast.error(error.message);
    else await load();
  }

  async function createTag(name: string) {
    if (tags.length >= FREE_TAG_LIMIT) {
      toast.error(`Free tier allows ${FREE_TAG_LIMIT} tags.`);
      return null;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tags")
      .insert({
        user_id: userData.user!.id,
        name,
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    await load();
    return data as Tag;
  }

  async function setLinkTags(linkId: string, tagIds: string[]) {
    await supabase.from("link_tags").delete().eq("link_id", linkId);
    if (tagIds.length) {
      await supabase
        .from("link_tags")
        .insert(tagIds.map((tag_id) => ({ link_id: linkId, tag_id })));
    }
    await load();
  }

  async function moveLink(linkId: string, collectionId: string | null) {
    const { error } = await supabase
      .from("links")
      .update({ collection_id: collectionId })
      .eq("id", linkId);
    if (error) toast.error(error.message);
    else await load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const defaultCollectionId =
    activeCollectionId === "all"
      ? (collections[0]?.id ?? null)
      : activeCollectionId;

  return (
    <div className="flex min-h-screen">
      <CollectionSidebar
        collections={collections}
        activeId={activeCollectionId}
        onSelect={setActiveCollectionId}
        onAdd={addCollection}
        onRename={renameCollection}
        onDelete={deleteCollection}
        onMove={moveCollection}
        colors={COLLECTION_COLORS}
        limit={FREE_COLLECTION_LIMIT}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold leading-none">Workspace</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setSaveOpen(true)}>
              <Plus />
              Save link
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut />
            </Button>
          </div>
        </header>
        <FilterBar
          tags={tags}
          selectedTagIds={selectedTagIds}
          onToggleTag={(id) =>
            setSelectedTagIds((curr) =>
              curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
            )
          }
          tagLogic={tagLogic}
          onTagLogic={setTagLogic}
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
        />
        <section className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading bookmarks…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <p className="font-medium">No links yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save a URL or use the browser extension to capture the current tab.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onOpen={() => void openLink(link)}
                  onFavorite={() => void toggleFavorite(link)}
                  onDetails={() => setActiveLink(link)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <SaveLinkDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        collections={collections}
        tags={tags}
        defaultCollectionId={defaultCollectionId}
        tagLimit={FREE_TAG_LIMIT}
        onCreateTag={createTag}
        onSave={saveLink}
      />
      <LinkDetailDialog
        link={activeLink}
        collections={collections}
        tags={tags}
        tagLimit={FREE_TAG_LIMIT}
        onClose={() => setActiveLink(null)}
        onCreateTag={createTag}
        onSaveNote={saveNote}
        onSetTags={setLinkTags}
        onMove={moveLink}
        onDelete={deleteLink}
        onFavorite={(link) => void toggleFavorite(link)}
        onOpen={(link) => void openLink(link)}
      />
    </div>
  );
}
