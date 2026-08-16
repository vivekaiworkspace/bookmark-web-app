import { describe, expect, it } from "vitest";
import { filterBookmarks } from "@/lib/filter-bookmarks";
import type { Bookmark } from "@/lib/types";

function bookmark(partial: Partial<Bookmark> & Pick<Bookmark, "id" | "title">): Bookmark {
  return {
    user_id: "u1",
    collection_id: "c1",
    url: "https://example.com",
    domain: "example.com",
    favicon_url: null,
    og_image_url: null,
    is_favorite: false,
    content_raw: null,
    created_at: "2026-01-02T00:00:00.000Z",
    last_accessed_at: null,
    updated_at: null,
    tags: [],
    note: "",
    ...partial,
  };
}

describe("filterBookmarks", () => {
  const a = bookmark({
    id: "a",
    title: "Alpha docs",
    tags: [{ id: "t1", user_id: "u1", name: "ai", color: "#3B82F6" }],
  });
  const b = bookmark({
    id: "b",
    title: "Beta notes",
    is_favorite: true,
    created_at: "2026-01-01T00:00:00.000Z",
    tags: [
      { id: "t1", user_id: "u1", name: "ai", color: "#3B82F6" },
      { id: "t2", user_id: "u1", name: "ops", color: "#10B981" },
    ],
  });

  it("applies AND tag logic", () => {
    const result = filterBookmarks({
      bookmarks: [a, b],
      activeCollectionId: "all",
      selectedTagIds: ["t1", "t2"],
      tagLogic: "and",
      query: "",
      sort: "created",
      semantic: false,
      semanticIds: null,
    });
    expect(result.map((row) => row.id)).toEqual(["b"]);
  });

  it("sorts favorites first", () => {
    const result = filterBookmarks({
      bookmarks: [a, b],
      activeCollectionId: "all",
      selectedTagIds: [],
      tagLogic: "or",
      query: "",
      sort: "favorites",
      semantic: false,
      semanticIds: null,
    });
    expect(result[0]?.id).toBe("b");
  });
});
