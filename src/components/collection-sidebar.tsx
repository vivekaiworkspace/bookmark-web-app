"use client";

import { useState } from "react";
import type { Collection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollectionSidebar({
  collections,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onMove,
  colors,
  limit,
}: {
  collections: Collection[];
  activeId: string | "all";
  onSelect: (id: string | "all") => void;
  onAdd: (name: string, color: string) => Promise<void>;
  onRename: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: -1 | 1) => Promise<void>;
  colors: string[];
  limit: number;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0]);

  function startCreate() {
    setEditing(null);
    setName("");
    setColor(colors[collections.length % colors.length]);
    setOpen(true);
  }

  function startEdit(col: Collection) {
    setEditing(col);
    setName(col.name);
    setColor(col.color);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) return;
    if (editing) await onRename(editing.id, name.trim(), color);
    else await onAdd(name.trim(), color);
    setOpen(false);
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Collections
        </p>
        <Button
          size="icon"
          variant="ghost"
          onClick={startCreate}
          disabled={collections.length >= limit}
          title={
            collections.length >= limit
              ? `Free tier limit: ${limit} collections`
              : "New collection"
          }
        >
          <FolderPlus />
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        <button
          className={cn(
            "rounded-md px-3 py-2 text-left text-sm",
            activeId === "all" ? "bg-accent font-medium" : "hover:bg-accent/60",
          )}
          onClick={() => onSelect("all")}
        >
          All links
        </button>
        {collections.map((col, index) => (
          <div
            key={col.id}
            className={cn(
              "group flex items-center gap-1 rounded-md pr-1",
              activeId === col.id ? "bg-accent" : "hover:bg-accent/60",
            )}
          >
            <button
              className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
              onClick={() => onSelect(col.id)}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <span className="truncate">{col.name}</span>
            </button>
            <div className="flex opacity-0 group-hover:opacity-100">
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                disabled={index === 0}
                onClick={() => void onMove(col.id, -1)}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                disabled={index === collections.length - 1}
                onClick={() => void onMove(col.id, 1)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => startEdit(col)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(`Delete collection “${col.name}”? Links stay saved.`)) {
                    void onDelete(col.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </nav>
      <p className="px-4 py-3 text-xs text-muted-foreground">
        {collections.length}/{limit} collections (free)
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit collection" : "New collection"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded-full ring-offset-background",
                    color === c && "ring-2 ring-ring",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <Button onClick={() => void submit()}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
