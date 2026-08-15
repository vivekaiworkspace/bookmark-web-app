-- Phase 2: AI scrape/tag status, summaries, digest settings
alter table public.links
  add column if not exists scrape_status text not null default 'pending',
  add column if not exists auto_tag_status text not null default 'pending',
  add column if not exists scrape_error text,
  add column if not exists suggested_tag_names text[] not null default '{}',
  add column if not exists suggested_collection_id uuid references public.collections(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'links_scrape_status_check'
  ) then
    alter table public.links
      add constraint links_scrape_status_check
      check (scrape_status in ('pending', 'ready', 'failed'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'links_auto_tag_status_check'
  ) then
    alter table public.links
      add constraint links_auto_tag_status_check
      check (auto_tag_status in ('pending', 'ready', 'failed'));
  end if;
end $$;

create index if not exists links_scrape_pending_idx
  on public.links (scrape_status)
  where scrape_status = 'pending';

create table if not exists public.user_ai_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    prompt_override text,
    digest_frequency text not null default 'weekly',
    digest_timezone text not null default 'UTC',
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint user_ai_settings_freq_check check (digest_frequency in ('off', 'weekly', 'daily'))
);

create table if not exists public.ai_summaries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    collection_id uuid references public.collections(id) on delete set null,
    content text not null,
    prompt_used text,
    generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists ai_summaries_user_generated_idx
  on public.ai_summaries (user_id, generated_at desc);

alter table public.user_ai_settings enable row level security;
alter table public.ai_summaries enable row level security;

drop policy if exists "Users manage own ai settings" on public.user_ai_settings;
create policy "Users manage own ai settings" on public.user_ai_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own ai summaries" on public.ai_summaries;
create policy "Users manage own ai summaries" on public.ai_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: after FastAPI is publicly reachable, enable pg_cron + pg_net in the
-- dashboard and schedule (store URL/secret in Vault):
-- select cron.schedule(
--   'phase2-digest-tick',
--   '0 * * * *',
--   $$ select net.http_post(
--        url := (select decrypted_secret from vault.decrypted_secrets where name = 'ai_service_url') || '/api/v1/jobs',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'X-AI-Service-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ai_service_secret')
--        ),
--        body := '{"type":"digest_tick"}'::jsonb
--      ); $$
-- );
-- Until then, the Celery beat worker runs digest_tick and polls pending scrapes
-- (covers extension saves that never hit Next.js).
