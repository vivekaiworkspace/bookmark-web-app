"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Bookmark } from "@/lib/types";

export type LinkCardGridProps = {
  items: Bookmark[];
  scrollRef: RefObject<HTMLElement | null>;
  renderCard: (link: Bookmark) => ReactNode;
};

function columnCount() {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia("(min-width: 1280px)").matches) return 3;
  if (window.matchMedia("(min-width: 640px)").matches) return 2;
  return 1;
}

export function LinkCardGrid({
  items,
  scrollRef,
  renderCard,
}: LinkCardGridProps) {
  const [cols, setCols] = useState(1);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setCols(columnCount());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const rowCount = Math.max(1, Math.ceil(items.length / cols));
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 280,
    overscan: 4,
  });

  return (
    <div
      ref={measureRef}
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const start = row.index * cols;
        const slice = items.slice(start, start + cols);
        return (
          <div
            key={row.key}
            className="absolute top-0 left-0 grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3"
            style={{ transform: `translateY(${row.start}px)` }}
          >
            {slice.map((link) => (
              <div key={link.id}>{renderCard(link)}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
