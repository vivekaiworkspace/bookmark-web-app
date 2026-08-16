import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LinkCard } from "@/components/link-card";
import type { Bookmark } from "@/lib/types";

const link: Bookmark = {
  id: "1",
  user_id: "u1",
  collection_id: null,
  url: "https://example.com",
  title: "Example article",
  domain: "example.com",
  favicon_url: null,
  og_image_url: null,
  is_favorite: false,
  content_raw: null,
  created_at: "2026-01-01T00:00:00.000Z",
  last_accessed_at: null,
  updated_at: null,
  tags: [{ id: "t1", user_id: "u1", name: "research", color: "#3B82F6" }],
  note: "Read later",
};

describe("LinkCard", () => {
  it("lets the user open details and favorite from the card", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onFavorite = vi.fn();
    const onDetails = vi.fn();

    render(
      <LinkCard
        link={link}
        onOpen={onOpen}
        onFavorite={onFavorite}
        onDetails={onDetails}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Example article" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Favorite" }));
    await user.click(screen.getByRole("button", { name: "Notes & tags" }));
    expect(onFavorite).toHaveBeenCalledOnce();
    expect(onDetails).toHaveBeenCalledOnce();
  });
});
