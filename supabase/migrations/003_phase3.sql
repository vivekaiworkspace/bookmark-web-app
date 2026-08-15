-- Phase 3: billing profiles, reminders, push subscriptions, pgvector embeddings

create extension if not exists vector with schema extensions;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint profiles_plan_check check (plan in ('free', 'pro'))
);

create table if not exists public.reminders (
  id uuid primary key default uuid_generate_v4(),
  link_id uuid references public.links(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  remind_at timestamp with time zone not null,
  is_triggered boolean not null default false,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint reminders_status_check check (status in ('pending', 'completed', 'dismissed'))
);

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, endpoint)
);

alter table public.links
  add column if not exists embedding extensions.vector(1536);

alter table public.ai_summaries
  add column if not exists notify_sent boolean not null default false;

create index if not exists reminders_user_due_idx
  on public.reminders (user_id, remind_at)
  where status = 'pending';

create index if not exists reminders_trigger_idx
  on public.reminders (remind_at)
  where status = 'pending' and is_triggered = false;

create index if not exists links_embedding_hnsw_idx
  on public.links
  using hnsw (embedding vector_cosine_ops);

alter table public.profiles enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Users manage own reminders" on public.reminders;
create policy "Users manage own reminders" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.plan_for(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select plan from public.profiles where user_id = uid), 'free');
$$;

revoke all on function public.plan_for(uuid) from public;
grant execute on function public.plan_for(uuid) to authenticated, service_role;

create or replace function public.enforce_collection_limit()
returns trigger
language plpgsql
as $$
declare
  n int;
begin
  if public.plan_for(new.user_id) = 'pro' then
    return new;
  end if;
  select count(*) into n from public.collections where user_id = new.user_id;
  if n >= 3 then
    raise exception 'Free plan allows at most 3 collections';
  end if;
  return new;
end;
$$;

drop trigger if exists collections_free_limit on public.collections;
create trigger collections_free_limit
  before insert on public.collections
  for each row execute function public.enforce_collection_limit();

create or replace function public.enforce_tag_limit()
returns trigger
language plpgsql
as $$
declare
  n int;
begin
  if public.plan_for(new.user_id) = 'pro' then
    return new;
  end if;
  select count(*) into n from public.tags where user_id = new.user_id;
  if n >= 10 then
    raise exception 'Free plan allows at most 10 tags';
  end if;
  return new;
end;
$$;

drop trigger if exists tags_free_limit on public.tags;
create trigger tags_free_limit
  before insert on public.tags
  for each row execute function public.enforce_tag_limit();

create or replace function public.enforce_reminder_pro()
returns trigger
language plpgsql
as $$
begin
  if public.plan_for(new.user_id) <> 'pro' then
    raise exception 'Reminders require a Pro plan';
  end if;
  return new;
end;
$$;

drop trigger if exists reminders_pro_only on public.reminders;
create trigger reminders_pro_only
  before insert on public.reminders
  for each row execute function public.enforce_reminder_pro();

create or replace function public.match_links(
  query_embedding extensions.vector(1536),
  match_threshold double precision default 0.3,
  match_count int default 12
)
returns table (
  id uuid,
  title text,
  url text,
  domain text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    links.id,
    links.title,
    links.url,
    links.domain,
    (1 - (links.embedding <=> query_embedding))::double precision as similarity
  from public.links
  where links.user_id = auth.uid()
    and links.embedding is not null
    and 1 - (links.embedding <=> query_embedding) > match_threshold
  order by links.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_links(extensions.vector, double precision, int) from public;
grant execute on function public.match_links(extensions.vector, double precision, int) to authenticated;
