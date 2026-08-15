-- Phase 1 schema for Smart Bookmark Manager
create extension if not exists "uuid-ossp";

create table public.collections (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    color text default '#3B82F6',
    sort_order int default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.tags (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    color text default '#6B7280',
    unique (user_id, name)
);

create table public.links (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    collection_id uuid references public.collections(id) on delete set null,
    url text not null,
    title text not null,
    domain text,
    favicon_url text,
    og_image_url text,
    is_favorite boolean default false,
    content_raw text,
    last_accessed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (user_id, url)
);

create table public.link_tags (
    link_id uuid references public.links(id) on delete cascade not null,
    tag_id uuid references public.tags(id) on delete cascade not null,
    primary key (link_id, tag_id)
);

create table public.notes (
    id uuid primary key default uuid_generate_v4(),
    link_id uuid references public.links(id) on delete cascade not null unique,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index collections_user_id_idx on public.collections (user_id, sort_order);
create index links_user_id_idx on public.links (user_id, created_at desc);
create index tags_user_id_idx on public.tags (user_id, name);
create index notes_user_id_idx on public.notes (user_id);

alter table public.collections enable row level security;
alter table public.tags enable row level security;
alter table public.links enable row level security;
alter table public.link_tags enable row level security;
alter table public.notes enable row level security;

create policy "Users manage own collections" on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own tags" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own links" on public.links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own link_tags" on public.link_tags for all using (
    exists (select 1 from public.links where id = link_tags.link_id and user_id = auth.uid())
) with check (
    exists (select 1 from public.links where id = link_tags.link_id and user_id = auth.uid())
);
create policy "Users manage own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.ensure_inbox()
returns public.collections
language plpgsql
security definer
set search_path = public
as $$
declare
  col public.collections;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into col
  from public.collections
  where user_id = auth.uid()
  order by sort_order, created_at
  limit 1;

  if found then
    return col;
  end if;

  insert into public.collections (user_id, name, color, sort_order)
  values (auth.uid(), 'Inbox', '#3B82F6', 0)
  returning * into col;

  return col;
end;
$$;

revoke execute on function public.ensure_inbox() from public;
revoke execute on function public.ensure_inbox() from anon;
grant execute on function public.ensure_inbox() to authenticated;
