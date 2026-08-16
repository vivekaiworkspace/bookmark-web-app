import type { Bookmark, LinkRow, LinkTag, Note, SortMode, Tag, TagLogic } from "@/lib/types";

export type FilterBookmarksInput = {
  bookmarks: Bookmark[];
  activeCollectionId: string | "all";
  selectedTagIds: string[];
  tagLogic: TagLogic;
  query: string;
  sort: SortMode;
  semantic: boolean;
  semanticIds: string[] | null;
};

export function filterBookmarks({
  bookmarks,
  activeCollectionId,
  selectedTagIds,
  tagLogic,
  query,
  sort,
  semantic,
  semanticIds,
}: FilterBookmarksInput): Bookmark[] {
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
    return [...list].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }
  if (q) {
    list = list.filter((b) =>
      [b.title, b.url, b.domain ?? "", b.note].join(" ").toLowerCase().includes(q),
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
}
