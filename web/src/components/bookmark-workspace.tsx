"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { collectionLimit, isPro as planIsPro, tagLimit } from "@/lib/plan";
import { COLLECTION_COLORS, TAG_COLORS } from "@/lib/colors";
import type {
  Bookmark,
  Collection,
  LinkRow,
  LinkTag,
  Note,
  Plan,
  Reminder,
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
import Link from "next/link";

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
  const [plan, setPlan] = useState<Plan>("free");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [semantic, setSemantic] = useState(false);
  const [semanticIds, setSemanticIds] = useState<string[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);

  const colLimit = collectionLimit(plan);
  const tagCap = tagLimit(plan);
  const pro = planIsPro(plan);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

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

    if (cRes.error) toast.error(cRes.error.message);
    if (tRes.error) toast.error(tRes.error.message);
    if (lRes.error) toast.error(lRes.error.message);

    const cols = (cRes.data ?? []) as Collection[];
    setCollections(cols);
    setTags((tRes.data ?? []) as Tag[]);
    setPlan(pRes.data?.plan === "pro" ? "pro" : "free");
    setReminders((rRes.data ?? []) as Reminder[]);
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

  useEffect(() => {
    setActiveLink((curr) => {
      if (!curr) return null;
      return bookmarks.find((b) => b.id === curr.id) ?? curr;
    });
  }, [bookmarks]);

  useEffect(() => {
    const busy = bookmarks.some(
      (b) => b.scrape_status === "pending" || b.auto_tag_status === "pending",
    );
    if (!busy) return;
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [bookmarks, load]);

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
    if (semantic && semanticIds) {
      const order = new Map(semanticIds.map((id, i) => [id, i]));
      list = list.filter((b) => order.has(b.id));
      list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      return list;
    }
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
  }, [bookmarks, activeCollectionId, selectedTagIds, tagLogic, query, sort, semantic, semanticIds]);

  async function addCollection(name: string, color: string) {
    if (collections.length >= colLimit) {
      toast.error(
        pro
          ? "Could not add collection"
          : `Free tier allows ${colLimit} collections.`,
      );
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
    const ready =
      data.scrape_status === "ready" && (data.content_raw ?? "").trim();
    if (!ready) {
      const enqueue = await fetch("/api/ai/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId: data.id }),
      });
      if (!enqueue.ok && enqueue.status !== 503) {
        toast.error("Saved, but AI enqueue failed");
      }
    }
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
    if (tags.length >= tagCap) {
      toast.error(pro ? "Could not add tag" : `Free tier allows ${tagCap} tags.`);
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

  async function applySuggestions(link: Bookmark) {
    const names = link.suggested_tag_names ?? [];
    let nextIds = link.tags.map((t) => t.id);
    let workingTags = [...tags];
    for (const name of names) {
      const existing = workingTags.find(
        (t) => t.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        if (!nextIds.includes(existing.id)) nextIds.push(existing.id);
        continue;
      }
      if (workingTags.length >= tagCap) {
        toast.error(pro ? "Tag limit reached" : `Free tier allows ${tagCap} tags.`);
        continue;
      }
      const created = await createTag(name);
      if (!created) continue;
      workingTags = [...workingTags, created];
      nextIds.push(created.id);
    }
    await setLinkTags(link.id, nextIds);
    await supabase
      .from("links")
      .update({ suggested_tag_names: [] })
      .eq("id", link.id);
    await load();
  }

  async function dismissSuggestions(link: Bookmark) {
    const { error } = await supabase
      .from("links")
      .update({ suggested_tag_names: [] })
      .eq("id", link.id);
    if (error) toast.error(error.message);
    else await load();
  }

  async function acceptCollection(link: Bookmark) {
    if (!link.suggested_collection_id) return;
    await moveLink(link.id, link.suggested_collection_id);
    await supabase
      .from("links")
      .update({ suggested_collection_id: null })
      .eq("id", link.id);
    await load();
  }

  async function saveReminder(linkId: string, remindAt: string | null) {
    if (!pro) {
      toast.error("Reminders require Pro");
      return;
    }
    const existing = reminders.find(
      (r) => r.link_id === linkId && r.status === "pending",
    );
    if (!remindAt) {
      if (existing) {
        const { error } = await supabase
          .from("reminders")
          .update({ status: "dismissed" })
          .eq("id", existing.id);
        if (error) toast.error(error.message);
        else toast.success("Reminder cleared");
      }
      await load();
      return;
    }
    if (existing) {
      const { error } = await supabase
        .from("reminders")
        .update({
          remind_at: remindAt,
          is_triggered: false,
          status: "pending",
        })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
      else toast.success("Reminder updated");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("reminders").insert({
        link_id: linkId,
        user_id: userData.user!.id,
        remind_at: remindAt,
        status: "pending",
        is_triggered: false,
      });
      if (error) toast.error(error.message);
      else toast.success("Reminder set");
    }
    await load();
  }

  useEffect(() => {
    if (!semantic || !pro) {
      setSemanticIds(null);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setSemanticIds(null);
      return;
    }
    const handle = setTimeout(() => {
      void (async () => {
        const res = await fetch("/api/search/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const body = (await res.json()) as {
          results?: { id: string }[];
          error?: string;
        };
        if (!res.ok) {
          toast.error(body.error ?? "Semantic search failed");
          setSemanticIds([]);
          return;
        }
        setSemanticIds((body.results ?? []).map((row) => row.id));
      })();
    }, 350);
    return () => clearTimeout(handle);
  }, [semantic, query, pro]);

  async function askLinks() {
    const question = query.trim() || window.prompt("Ask about your saved links");
    if (!question) return;
    setAsking(true);
    setAskAnswer(null);
    try {
      const res = await fetch("/api/search/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok) toast.error(body.error ?? "Ask failed");
      else setAskAnswer(body.answer ?? "");
    } finally {
      setAsking(false);
    }
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
        limit={colLimit}
        isPro={pro}
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
            <Button variant="ghost" asChild>
              <Link href="/read-today">Read Today</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/digests">Digests</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/settings">Settings</Link>
            </Button>
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
          semantic={semantic}
          onSemantic={setSemantic}
          canSemantic={pro}
          onAsk={() => void askLinks()}
          asking={asking}
        />
        {askAnswer ? (
          <div className="border-b px-6 py-3">
            <p className="text-xs font-medium text-muted-foreground">Ask</p>
            <pre className="mt-1 whitespace-pre-wrap text-sm">{askAnswer}</pre>
            <Button size="sm" variant="ghost" onClick={() => setAskAnswer(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}
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
        tagLimit={tagCap}
        onCreateTag={createTag}
        onSave={saveLink}
      />
      <LinkDetailDialog
        link={activeLink}
        collections={collections}
        tags={tags}
        tagLimit={tagCap}
        onClose={() => setActiveLink(null)}
        onCreateTag={createTag}
        onSaveNote={saveNote}
        onSetTags={setLinkTags}
        onMove={moveLink}
        onDelete={deleteLink}
        onFavorite={(link) => void toggleFavorite(link)}
        onOpen={(link) => void openLink(link)}
        onApplySuggestions={applySuggestions}
        onDismissSuggestions={dismissSuggestions}
        onAcceptCollection={acceptCollection}
        reminder={
          activeLink
            ? reminders.find((r) => r.link_id === activeLink.id) ?? null
            : null
        }
        isPro={pro}
        onSaveReminder={saveReminder}
      />
    </div>
  );
}
