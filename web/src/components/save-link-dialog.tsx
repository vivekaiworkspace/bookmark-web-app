"use client";

import { useEffect, useState } from "react";
import type { Collection, Tag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { normalizeUrl, cn } from "@/lib/utils";
import { swatchBgClass } from "@/lib/colors";
import { toast } from "sonner";

type Meta = {
  url: string;
  title: string;
  domain: string;
  favicon_url: string;
  og_image_url: string | null;
};

export function SaveLinkDialog({
  open,
  onOpenChange,
  collections,
  tags,
  defaultCollectionId,
  tagLimit,
  onCreateTag,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  tags: Tag[];
  defaultCollectionId: string | null;
  tagLimit: number;
  onCreateTag: (name: string) => Promise<Tag | null>;
  onSave: (input: Meta & { collection_id: string | null; tagIds: string[] }) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [title, setTitle] = useState("");
  const [collectionId, setCollectionId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl("");
      setMeta(null);
      setTitle("");
      setCollectionId(defaultCollectionId ?? "");
      setTagIds([]);
      setNewTag("");
    }
  }, [open, defaultCollectionId]);

  async function fetchMeta() {
    const normalized = normalizeUrl(url);
    setPending(true);
    try {
      const res = await fetch("/api/extract-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = (await res.json()) as Meta & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not fetch metadata");
      setMeta(data);
      setTitle(data.title);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Metadata failed");
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!meta) return;
    setPending(true);
    try {
      await onSave({
        ...meta,
        title: title.trim() || meta.title,
        collection_id: collectionId || null,
        tagIds,
      });
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    const existing = tags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      setTagIds((ids) => (ids.includes(existing.id) ? ids : [...ids, existing.id]));
      setNewTag("");
      return;
    }
    const created = await onCreateTag(name);
    if (created) {
      setTagIds((ids) => [...ids, created.id]);
      setNewTag("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => void fetchMeta()} disabled={pending || !url.trim()}>
              Fetch
            </Button>
          </div>
          {meta && (
            <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Collection</Label>
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose collection" />
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
                <Label>Tags ({tags.length}/{tagLimit >= 1000 ? "∞" : tagLimit})</Label>
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
                        onClick={() =>
                          setTagIds((ids) =>
                            on ? ids.filter((id) => id !== tag.id) : [...ids, tag.id],
                          )
                        }
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
              <Button onClick={() => void save()} disabled={pending}>
                Save bookmark
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
