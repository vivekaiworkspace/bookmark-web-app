"use client";

import type { SortMode, Tag, TagLogic } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterBar({
  tags,
  selectedTagIds,
  onToggleTag,
  tagLogic,
  onTagLogic,
  query,
  onQuery,
  sort,
  onSort,
}: {
  tags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (id: string) => void;
  tagLogic: TagLogic;
  onTagLogic: (logic: TagLogic) => void;
  query: string;
  onQuery: (q: string) => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
}) {
  return (
    <div className="space-y-3 border-b px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search title, URL, notes…"
          className="max-w-sm"
        />
        <div className="flex rounded-md border p-0.5">
          {(
            [
              ["created", "Newest"],
              ["accessed", "Last opened"],
              ["favorites", "Favorites"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={cn(
                "rounded px-2.5 py-1 text-xs",
                sort === value ? "bg-accent font-medium" : "text-muted-foreground",
              )}
              onClick={() => onSort(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant={tagLogic === "and" ? "default" : "outline"}
          onClick={() => onTagLogic(tagLogic === "and" ? "or" : "and")}
        >
          Tags: {tagLogic.toUpperCase()}
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const on = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => onToggleTag(tag.id)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  on ? "border-transparent text-white" : "bg-background",
                )}
                style={on ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
