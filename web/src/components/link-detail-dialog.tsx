"use client";

import { useEffect, useState } from "react";
import type { Bookmark, Collection, Reminder, Tag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { swatchBgClass } from "@/lib/colors";

export function LinkDetailDialog({
  link,
  collections,
  tags,
  tagLimit,
  onClose,
  onCreateTag,
  onSaveNote,
  onSetTags,
  onMove,
  onDelete,
  onFavorite,
  onOpen,
  onApplySuggestions,
  onDismissSuggestions,
  onAcceptCollection,
  reminder,
  isPro,
  onSaveReminder,
}: {
  link: Bookmark | null;
  collections: Collection[];
  tags: Tag[];
  tagLimit: number;
  onClose: () => void;
  onCreateTag: (name: string) => Promise<Tag | null>;
  onSaveNote: (linkId: string, content: string) => Promise<void>;
  onSetTags: (linkId: string, tagIds: string[]) => Promise<void>;
  onMove: (linkId: string, collectionId: string | null) => Promise<void>;
  onDelete: (linkId: string) => Promise<void>;
  onFavorite: (link: Bookmark) => void;
  onOpen: (link: Bookmark) => void;
  onApplySuggestions: (link: Bookmark) => Promise<void>;
  onDismissSuggestions: (link: Bookmark) => Promise<void>;
  onAcceptCollection: (link: Bookmark) => Promise<void>;
  reminder: Reminder | null;
  isPro: boolean;
  onSaveReminder: (linkId: string, remindAt: string | null) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [remindAt, setRemindAt] = useState("");

  useEffect(() => {
    if (!link) return;
    setNote(link.note);
    setTagIds(link.tags.map((t) => t.id));
    setCollectionId(link.collection_id ?? "");
    setPreview(false);
    if (reminder?.remind_at) {
      const d = new Date(reminder.remind_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setRemindAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setRemindAt("");
    }
  }, [link, reminder]);

  if (!link) return null;
  const current = link;

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    const existing = tags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    const created = existing ?? (await onCreateTag(name));
    if (!created) return;
    const next = tagIds.includes(created.id) ? tagIds : [...tagIds, created.id];
    setTagIds(next);
    setNewTag("");
    await onSetTags(current.id, next);
  }

  return (
    <Dialog open={!!link} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{link.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{link.url}</p>
        <p className="text-xs text-muted-foreground">
          Scrape: {link.scrape_status ?? "pending"} · Tags:{" "}
          {link.auto_tag_status ?? "pending"}
          {link.scrape_error ? ` · ${link.scrape_error}` : ""}
        </p>
        {(link.suggested_tag_names?.length ?? 0) > 0 && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Suggested tags</p>
            <p className="text-sm text-muted-foreground">
              {link.suggested_tag_names?.join(", ")}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void onApplySuggestions(link)}>
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void onDismissSuggestions(link)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
        {link.suggested_collection_id && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              Move to{" "}
              {collections.find((c) => c.id === link.suggested_collection_id)
                ?.name ?? "suggested collection"}
              ?
            </p>
            <Button size="sm" onClick={() => void onAcceptCollection(link)}>
              Move
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onOpen(link)}>
            Open
          </Button>
          <Button size="sm" variant="outline" onClick={() => onFavorite(link)}>
            {link.is_favorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Delete this bookmark?")) void onDelete(link.id);
            }}
          >
            Delete
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Collection</p>
          <Select
            value={collectionId}
            onValueChange={(value) => {
              setCollectionId(value);
              void onMove(link.id, value || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Tags ({tags.length}/{tagLimit >= 1000 ? "∞" : tagLimit})</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const on = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    on && `border-transparent text-white ${swatchBgClass(tag.color)}`,
                  )}
                  onClick={() => {
                    const next = on
                      ? tagIds.filter((id) => id !== tag.id)
                      : [...tagIds, tag.id];
                    setTagIds(next);
                    void onSetTags(link.id, next);
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => void addTag()}>
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Notes (markdown)</p>
            <Button size="sm" variant="ghost" onClick={() => setPreview((p) => !p)}>
              {preview ? "Edit" : "Preview"}
            </Button>
          </div>
          {preview ? (
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
              {note || "Empty note"}
            </pre>
          ) : (
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={8} />
          )}
          <Button onClick={() => void onSaveNote(link.id, note)}>Save note</Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Reminder {isPro ? "" : "(Pro)"}</p>
          <Input
            type="datetime-local"
            value={remindAt}
            disabled={!isPro}
            onChange={(e) => setRemindAt(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!isPro || !remindAt}
              onClick={() => {
                if (!remindAt) return;
                void onSaveReminder(current.id, new Date(remindAt).toISOString());
              }}
            >
              Save reminder
            </Button>
            {reminder ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!isPro}
                onClick={() => void onSaveReminder(current.id, null)}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
