create table if not exists public.app_state (
  state_key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_select" on public.app_state;
drop policy if exists "app_state_insert" on public.app_state;
drop policy if exists "app_state_update" on public.app_state;

create policy "app_state_select"
on public.app_state
for select
to anon
using (true);

create policy "app_state_insert"
on public.app_state
for insert
to anon
with check (true);

create policy "app_state_update"
on public.app_state
for update
to anon
using (true)
with check (true);
