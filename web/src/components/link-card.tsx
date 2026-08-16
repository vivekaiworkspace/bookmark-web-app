"use client";

import type { Bookmark } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function LinkCard({
  link,
  onOpen,
  onFavorite,
  onDetails,
}: {
  link: Bookmark;
  onOpen: () => void;
  onFavorite: () => void;
  onDetails: () => void;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <button className="relative block h-32 w-full bg-muted" onClick={onOpen}>
        {link.og_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.og_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {link.domain}
          </div>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.favicon_url ?? ""}
            alt=""
            className="mt-0.5 h-4 w-4 rounded-sm"
          />
          <div className="min-w-0 flex-1">
            <button
              className="line-clamp-2 text-left text-sm font-semibold hover:underline"
              onClick={onOpen}
            >
              {link.title}
            </button>
            <p className="truncate text-xs text-muted-foreground">{link.domain}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onFavorite}
            className={cn(link.is_favorite && "text-amber-500")}
          >
            <Star className={cn(link.is_favorite && "fill-current")} />
          </Button>
        </div>
        {link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {link.tags.map((tag) => (
              <Badge
                key={tag.id}
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        {(link.scrape_status === "pending" ||
          link.auto_tag_status === "pending") && (
          <p className="text-xs text-muted-foreground">AI: reading page…</p>
        )}
        {link.scrape_status === "failed" && (
          <p className="text-xs text-destructive">
            Scrape failed{link.scrape_error ? `: ${link.scrape_error}` : ""}
          </p>
        )}
        {(link.suggested_tag_names?.length ?? 0) > 0 && (
          <p className="text-xs text-primary">Suggested tags available</p>
        )}
        {link.note && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{link.note}</p>
        )}
        <button
          className="mt-auto text-left text-xs font-medium text-primary hover:underline"
          onClick={onDetails}
        >
          Notes & tags
        </button>
      </div>
    </article>
  );
}
