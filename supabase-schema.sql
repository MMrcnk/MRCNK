-- MRCNK – schemat bazy Supabase
-- Wklej całość w Supabase → SQL Editor → New query → Run

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  col text not null,
  data jsonb not null default '{}'::jsonb,
  ts jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists records_user_updated on public.records (user_id, updated_at);
create index if not exists records_col on public.records (col);

-- znacznik czasu ustawiany przez serwer (synchronizacja przyrostowa)
create or replace function public.records_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.records_touch();

-- RLS: każdy widzi i zmienia tylko swoje dane
alter table public.records enable row level security;

drop policy if exists "own select" on public.records;
drop policy if exists "own insert" on public.records;
drop policy if exists "own update" on public.records;
drop policy if exists "own delete" on public.records;
create policy "own select" on public.records for select using (auth.uid() = user_id);
create policy "own insert" on public.records for insert with check (auth.uid() = user_id);
create policy "own update" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.records for delete using (auth.uid() = user_id);

-- log wysłanych powiadomień (używa tylko funkcja "push")
create table if not exists public.push_log (
  user_id uuid not null,
  key text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key, day)
);
alter table public.push_log enable row level security;
