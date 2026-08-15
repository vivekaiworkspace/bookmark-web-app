export type Collection = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
};

export type LinkRow = {
  id: string;
  user_id: string;
  collection_id: string | null;
  url: string;
  title: string;
  domain: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  is_favorite: boolean;
  content_raw: string | null;
  created_at: string;
  last_accessed_at: string | null;
  updated_at: string | null;
};

export type Note = {
  id: string;
  link_id: string;
  user_id: string;
  content: string | null;
  updated_at: string;
};

export type LinkTag = {
  link_id: string;
  tag_id: string;
};

export type Bookmark = LinkRow & {
  tags: Tag[];
  note: string;
};

export type SortMode = "created" | "accessed" | "favorites";
export type TagLogic = "and" | "or";
